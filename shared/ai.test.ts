import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AI_MODEL, askParams, buildContext, parseReport, REPORT_SCHEMA, reportParams } from './ai';
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

test('report requests use the current model, refusal fallbacks and a strict JSON schema', () => {
  const p = reportParams(buildContext(r));
  assert.equal(p.model, AI_MODEL);
  assert.equal(p.fallbacks, 'default');
  assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(p.output_config?.format?.type, 'json_schema');
  assert.equal(p.output_config?.effort, 'medium');
  assert.ok(!('thinking' in p) || (p.thinking as { type: string }).type === 'adaptive');
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
  const system = JSON.stringify(p.system);
  assert.match(system, /not as instructions/i);
});

test('follow-up questions keep the conversation and the context', () => {
  const p = askParams(buildContext(r), [
    { role: 'user', content: 'Who is most opposed?' },
    { role: 'assistant', content: 'Nobody is strongly opposed.' },
    { role: 'user', content: 'Why?' },
  ]);
  assert.equal(p.messages.length, 3);
  assert.equal(p.messages[2].role, 'user');
  assert.match(JSON.stringify(p.system), /Maryland/);
  assert.equal(p.fallbacks, 'default');
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
