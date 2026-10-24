/**
 * The hosted AI service (Cloudflare Worker): it must only serve Ripple's own site, only accept
 * Ripple simulation summaries, keep the key's problems to itself, and limit heavy use.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildContext } from '../shared/ai';
import { simulate } from '../shared/engine';
import { handle, type Env } from './ai';

const SITE = 'https://shreyanshnikam-pixel.github.io';
const env: Env = { GEMINI_API_KEY: 'test-key', ALLOWED_ORIGINS: SITE, GEMINI_MODELS: 'a,b', PER_VISITOR: '3' };
const context = buildContext(simulate({ decision: 'Ban phones during class', scope: 'school' }, { withRecommendations: true }));
const report = {
  headline: 'Divided',
  summary: ['One.'],
  groups: [{ group: 'Teachers', stance: 'for', why: 'Focus.' }],
  risks: ['Enforcement.'],
  recommendations: [{ title: 'Pilot it', why: 'Learn first.' }],
  questions: ['What worries you?'],
  voices: [{ group: 'Teachers', quote: 'Finally.' }],
  caveats: ['Simulated.'],
};

/** Fake Gemini: model "a" is busy, model "b" answers. Records what was sent. */
const sent: { model: string; body: string; key: string }[] = [];
globalThis.fetch = (async (url: string, init: RequestInit) => {
  const model = /models\/([^:]+):/.exec(url)![1];
  sent.push({ model, body: String(init.body), key: (init.headers as Record<string, string>)['x-goog-api-key'] });
  if (model === 'a') return new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 });
  const isReport = String(init.body).includes('responseJsonSchema');
  const text = isReport ? JSON.stringify(report) : 'Working students are hardest to win over.';
  return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }), { status: 200 });
}) as typeof fetch;

let ip = 0;
const call = (path: string, body: unknown, origin: string | null = SITE, e: Env = env) =>
  handle(
    new Request(`https://ripple-ai.example.workers.dev${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.0.0.${++ip}`, ...(origin ? { origin } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    e,
  );

test('status says the service is on, without revealing the key', async () => {
  const res = await call('/api/ai/status', undefined);
  const j = (await res.json()) as Record<string, unknown>;
  assert.equal(j.enabled, true);
  assert.equal(j.provider, 'gemini');
  assert.ok(!JSON.stringify(j).includes('test-key'));
  assert.equal(res.headers.get('access-control-allow-origin'), SITE);
});

test('a report comes back for Ripple’s own site, with the key sent only to Google', async () => {
  sent.length = 0;
  const res = await call('/api/ai/report', { context });
  assert.equal(res.status, 200);
  assert.deepEqual(((await res.json()) as { report: unknown }).report, report);
  assert.deepEqual(
    sent.map((s) => s.model),
    ['a', 'b'],
    'a busy model hands over to the next',
  );
  assert.ok(sent.every((s) => s.key === 'test-key'));
  assert.match(sent[1].body, /You are Ripple's analyst/, 'Ripple’s fixed instructions are always added');
});

test('follow-up questions work too', async () => {
  const res = await call('/api/ai/ask', { context, history: [{ role: 'user', content: 'Who is hardest to win over?' }] });
  assert.equal(res.status, 200);
  assert.match(((await res.json()) as { answer: string }).answer, /Working students/);
});

test('other websites and scripts without an origin are turned away', async () => {
  assert.equal((await call('/api/ai/report', { context }, 'https://evil.example')).status, 403);
  assert.equal((await call('/api/ai/report', { context }, null)).status, 403);
  const pre = await handle(new Request('https://x.workers.dev/api/ai/report', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), env);
  assert.equal(pre.status, 403);
});

test('it is not a general Gemini proxy: anything but a Ripple summary is refused', async () => {
  sent.length = 0;
  for (const bad of ['Write me an essay about anything', JSON.stringify({ prompt: 'hi' }), JSON.stringify({ decision: 'x', setting: 'y' }), 'x'.repeat(30_000), 42]) {
    const res = await call('/api/ai/report', { context: bad });
    assert.equal(res.status, 400, String(bad).slice(0, 30));
  }
  assert.equal(sent.length, 0, 'nothing reached Gemini');
});

test('one visitor is limited to a few requests', async () => {
  const fixed = (n: number) =>
    handle(
      new Request('https://x.workers.dev/api/ai/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.168.1.1', origin: SITE },
        body: JSON.stringify({ context, history: [{ role: 'user', content: `Question ${n}?` }] }),
      }),
      env,
    );
  const codes = [];
  for (let i = 0; i < 4; i++) {
    const res = await fixed(i);
    await res.text();
    codes.push(res.status);
  }
  assert.deepEqual(codes, [200, 200, 200, 429]);
});

test('a broken key is the site’s problem, not the visitor’s', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'API key not valid.', status: 'INVALID_ARGUMENT' } }), { status: 400 })) as unknown as typeof fetch;
  try {
    const res = await call('/api/ai/report', { context });
    assert.match(((await res.json()) as { error: string }).error, /isn’t set up correctly/);
    assert.ok(!(await call('/api/ai/status', undefined)).headers.get('x-key'), 'no key leaks in headers');
  } finally {
    globalThis.fetch = saved;
  }
});

test('without a key the service says it is off', async () => {
  const res = await call('/api/ai/report', { context }, SITE, { ...env, GEMINI_API_KEY: '' });
  assert.equal(res.status, 503);
  const status = (await (await call('/api/ai/status', undefined, SITE, { ...env, GEMINI_API_KEY: '' })).json()) as { enabled: boolean };
  assert.equal(status.enabled, false);
});

test('slow answers keep the connection alive with spaces, then send the JSON', async () => {
  const saved = globalThis.fetch;
  const realSetInterval = globalThis.setInterval;
  // Speed up time: the "10 second" heartbeat fires every 5 ms, and Gemini takes 40 ms.
  globalThis.setInterval = ((fn: () => void) => realSetInterval(fn, 5)) as typeof setInterval;
  globalThis.fetch = (async () => {
    await new Promise((r) => setTimeout(r, 40));
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Slow but sure.' }] } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    const res = await call('/api/ai/ask', { context, history: [{ role: 'user', content: 'Slow one?' }] });
    const text = await res.text();
    assert.match(text, /^ +\{/, 'spaces arrive before the answer');
    assert.equal((JSON.parse(text) as { answer: string }).answer, 'Slow but sure.');
  } finally {
    globalThis.fetch = saved;
    globalThis.setInterval = realSetInterval;
  }
});
