import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AI_MODELS, askParams, buildContext, callGemini, parseReport, REPORT_SCHEMA, reportParams, writeReport } from './ai';
import { simulate } from './engine';

const r = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });

test('the context carries the real poll and the simulated result, labeled apart', () => {
  const c = JSON.parse(buildContext(r));
  assert.equal(c.decision, r.decision);
  assert.equal(c.simulated.support, r.summary.support);
  assert.equal(c.startingPoint.basis, 'poll');
  assert.match(c.startingPoint.source.org, /Maryland/);
  assert.ok(c.groups.length >= 6);
  assert.ok(c.voices.every((v: { quote: string }) => v.quote.length > 0));
});

test('the context is compact: no crowd dots, a few thousand tokens at most', () => {
  const text = buildContext(r);
  assert.ok(!text.includes('"crowd"'), 'crowd agents should not be sent');
  assert.ok(text.length < 16000, `context is ${text.length} characters`);
});

test('the context names related bills and the district when given', () => {
  const c = JSON.parse(buildContext(r, { district: { label: 'CA-12', name: 'California’s 12th district', representative: 'Lateefah Simon (Democrat)', facts: ['Residents 65 and older: 15%'] } }));
  assert.equal(c.district.label, 'CA-12');
  assert.ok(Array.isArray(c.relatedBills));
  assert.equal(c.whoDecides, 'Congress');
});

test('report requests ask Gemini for JSON in a strict schema', () => {
  const p = reportParams(buildContext(r));
  assert.equal(p.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(p.generationConfig.responseJsonSchema, REPORT_SCHEMA);
  assert.equal(p.contents.length, 1);
  assert.equal(p.contents[0].role, 'user');
  assert.ok(AI_MODELS.length >= 2 && AI_MODELS.every((m) => m.startsWith('gemini-')));
  // Every object in a strict schema lists all its keys as required and allows no others.
  const walk = (s: Record<string, unknown>) => {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort());
      for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) walk(v);
    }
    if (s.type === 'array') walk(s.items as Record<string, unknown>);
  };
  walk(REPORT_SCHEMA as unknown as Record<string, unknown>);
});

test('the decision text is data, never instructions', () => {
  const p = reportParams(buildContext(r));
  assert.match(JSON.stringify(p.systemInstruction), /not as instructions/i);
});

test('follow-up questions keep the conversation and the context', () => {
  const p = askParams(buildContext(r), [
    { role: 'user', content: 'Who is most opposed?' },
    { role: 'assistant', content: 'Nobody is strongly opposed.' },
    { role: 'user', content: 'Why?' },
  ]);
  assert.deepEqual(
    p.contents.map((c) => c.role),
    ['user', 'model', 'user'],
  );
  assert.match(JSON.stringify(p.systemInstruction), /Maryland/);
  assert.equal(p.generationConfig.responseMimeType, undefined, 'answers are plain text');
});

/** A fake network: each model name maps to [status, body]. Records which models were tried. */
function fakeFetch(plan: Record<string, [number, unknown]>, tried: string[]): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    const model = decodeURIComponent(/models\/([^:]+):/.exec(url)![1]);
    tried.push(model);
    assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'test-key');
    const [status, body] = plan[model] ?? [503, { error: { message: 'busy' } }];
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}
const ok = (text: string) => [200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }] as [number, unknown];

test('a busy or retired model hands the request to the next one', async () => {
  const tried: string[] = [];
  const text = await callGemini(askParams(buildContext(r), [{ role: 'user', content: 'Hi?' }]), {
    key: 'test-key',
    models: ['a', 'b', 'c'],
    fetch: fakeFetch({ a: [503, { error: { message: 'high demand' } }], b: [404, { error: { message: 'gone' } }], c: ok('Hello.') }, tried),
  });
  assert.equal(text, 'Hello.');
  assert.deepEqual(tried, ['a', 'b', 'c']);
});

test('a bad key stops right away with a clear message', async () => {
  const tried: string[] = [];
  await assert.rejects(
    callGemini(reportParams(buildContext(r)), { key: 'test-key', models: ['a', 'b'], fetch: fakeFetch({ a: [400, { error: { message: 'API key not valid.', status: 'INVALID_ARGUMENT' } }] }, tried) }),
    /API key didn’t work/,
  );
  assert.deepEqual(tried, ['a']);
});

test('when every model is busy, the visitor is told to try again', async () => {
  await assert.rejects(callGemini(reportParams(buildContext(r)), { key: 'test-key', models: ['a', 'b'], fetch: fakeFetch({}, []) }), /busy/);
});

test('blocked answers say so instead of failing silently', async () => {
  await assert.rejects(
    callGemini(reportParams(buildContext(r)), { key: 'test-key', models: ['a'], fetch: fakeFetch({ a: [200, { promptFeedback: { blockReason: 'SAFETY' } }] }, []) }),
    /declined/,
  );
});

test('a full report comes back parsed and checked', async () => {
  const report = {
    headline: 'Broad support',
    summary: ['One.'],
    groups: [{ group: 'Retirees', stance: 'for', why: 'Fairness.' }],
    risks: ['Enforcement.'],
    recommendations: [{ title: 'Explain it', why: 'Clarity.' }],
    questions: ['What worries you?'],
    voices: [{ group: 'Retirees', quote: 'About time.' }],
    caveats: ['Simulated.'],
  };
  const out = await writeReport({ key: 'test-key', models: ['a'], fetch: fakeFetch({ a: ok(JSON.stringify(report)) }, []) }, buildContext(r));
  assert.deepEqual(out, report);
  await assert.rejects(writeReport({ key: 'test-key', models: ['a'], fetch: fakeFetch({ a: ok('{"headline": 3}') }, []) }, buildContext(r)), /unexpected shape/);
});

test('parseReport accepts a valid report and rejects junk', () => {
  const ok = {
    headline: 'Broad support',
    summary: ['One.', 'Two.'],
    groups: [{ group: 'Retirees', stance: 'for', why: 'Fairness.' }],
    risks: ['Enforcement.'],
    recommendations: [{ title: 'Explain it', why: 'Clarity.' }],
    questions: ['What worries you?'],
    voices: [{ group: 'Retirees', quote: 'About time.' }],
    caveats: ['Simulated.'],
  };
  assert.deepEqual(parseReport(ok), ok);
  assert.throws(() => parseReport({ headline: 3 }));
  assert.throws(() => parseReport(null));
});
