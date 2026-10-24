/**
 * Ripple's hosted AI service: a Cloudflare Worker that keeps the Gemini API key secret, so
 * visitors to the static site (GitHub Pages) get AI reports without a key of their own.
 *
 *   GET  /api/ai/status                         → { enabled, provider, model }
 *   POST /api/ai/report  { context }            → { report }
 *   POST /api/ai/ask     { context, history }   → { answer }
 *
 * The browser runs the simulation (as it always does) and sends its summary. The worker only
 * accepts a Ripple simulation summary, adds Ripple's fixed instructions, and asks Gemini, so it
 * can't be used as a general-purpose Gemini proxy. Requests are limited per visitor and per day.
 *
 * Deployed by .github/workflows/pages.yml (see the README, "AI reports for everyone").
 */
import { AI_MODELS, AiError, answer, checkContext, checkHistory, writeReport, type GeminiOptions } from '../shared/ai';

export interface Env {
  GEMINI_API_KEY?: string;
  /** Comma-separated origins allowed to call this service, e.g. "https://name.github.io". */
  ALLOWED_ORIGINS?: string;
  GEMINI_MODELS?: string;
  /** Requests per visitor per 10 minutes (default 10) and in total per day (default 300). */
  PER_VISITOR?: string;
  DAILY_LIMIT?: string;
}

// Best-effort limits, kept in memory (each worker instance keeps its own count). Gemini's free
// tier has its own hard daily limit on top, and a free key can't run up a bill.
const perVisitor = new Map<string, { count: number; reset: number }>();
let day = { date: '', count: 0 };

function limited(ip: string, env: Env): string | null {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, count: 0 };
  if (day.count >= Number(env.DAILY_LIMIT ?? 300)) return 'The AI report has reached today’s limit. The simulation still works.';
  for (const [k, v] of perVisitor) if (v.reset < now) perVisitor.delete(k);
  const e = perVisitor.get(ip);
  if (!e) perVisitor.set(ip, { count: 1, reset: now + 10 * 60_000 });
  else if (++e.count > Number(env.PER_VISITOR ?? 10)) return 'That’s a lot of AI requests. Wait a few minutes and try again.';
  day.count++;
  return null;
}

function allowedOrigin(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  const list = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
  if (list.includes(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function json(body: unknown, status: number, origin: string | null): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, vary: 'Origin' });
  return new Response(JSON.stringify(body), { status, headers });
}

/** What a visitor sees when the AI fails: key problems are the site's, not theirs. */
function failure(err: unknown): { error: string } {
  if (err instanceof AiError) return { error: err.status === 401 ? 'The AI report isn’t set up correctly on this site.' : err.message };
  console.error(err);
  return { error: 'The AI report failed. Try again in a moment.' };
}

/**
 * Gemini's free tier can take a minute or two, and some networks (school Wi-Fi filters, proxies)
 * drop a connection that stays silent that long. So the answer streams: a space every 10 seconds
 * while Gemini works (JSON allows leading spaces), then the JSON itself. Errors arrive as { error }.
 */
function keepAlive(origin: string | null, work: () => Promise<unknown>): Response {
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const w = writable.getWriter();
  const tick = setInterval(() => void w.write(enc.encode(' ')).catch(() => {}), 10_000);
  void (async () => {
    let out: unknown;
    try {
      out = await work();
    } catch (err) {
      out = failure(err);
    }
    clearInterval(tick);
    try {
      await w.write(enc.encode(JSON.stringify(out)));
      await w.close();
    } catch {
      /* the visitor left */
    }
  })();
  const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, vary: 'Origin' });
  return new Response(readable, { status: 200, headers });
}

export async function handle(req: Request, env: Env): Promise<Response> {
  const origin = allowedOrigin(req.headers.get('origin'), env);
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  const models = (env.GEMINI_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  const key = env.GEMINI_API_KEY?.trim() ?? '';

  if (req.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' },
    });
  }
  if (req.method === 'GET' && path === '/api/ai/status') return json({ enabled: !!key, provider: 'gemini', model: key ? (models[0] ?? AI_MODELS[0]) : null }, 200, origin);
  if (req.method !== 'POST' || (path !== '/api/ai/report' && path !== '/api/ai/ask')) return json({ error: 'Not found.' }, 404, origin);

  // Only Ripple's own site may use the key.
  if (!origin) return json({ error: 'This AI service only works from the Ripple website.' }, 403, null);
  if (!key) return json({ error: 'The AI report isn’t turned on for this site.' }, 503, origin);
  if (Number(req.headers.get('content-length') ?? 0) > 64_000) return json({ error: 'That request is too large.' }, 413, origin);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const context = checkContext(body?.context);
    const history = path === '/api/ai/ask' ? checkHistory(body?.history) : null;
    const why = limited(req.headers.get('cf-connecting-ip') ?? 'anon', env);
    if (why) return json({ error: why }, 429, origin);
    const gemini: GeminiOptions = { key, models: models.length ? models : AI_MODELS, timeoutMs: 60_000 };
    return keepAlive(origin, async () => (history ? { answer: await answer(gemini, context, history) } : { report: await writeReport(gemini, context) }));
  } catch (err) {
    // Problems found before any work starts (a bad request) keep their HTTP status.
    return json(failure(err), err instanceof AiError ? (err.status === 401 ? 503 : err.status) : 500, origin);
  }
}

export default { fetch: handle };
