/**
 * Optional AI routes. They turn on when the server has Claude credentials
 * (ANTHROPIC_API_KEY, or RIPPLE_AI=1 with another credential source the SDK understands).
 *
 *   GET  /api/ai/status                                   → { enabled, model }
 *   POST /api/ai/report  { decision, scope?, crowdSize?, mix?, district? }            → { report }
 *   POST /api/ai/ask     { decision, scope?, crowdSize?, mix?, district?, history }   → { answer }
 *
 * The server re-runs the simulation itself (it is deterministic), so the model only ever
 * sees Ripple's own data, never context supplied by the caller.
 */
import Anthropic from '@anthropic-ai/sdk';
import express, { type Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_MODEL, AiError, answer, buildContext, writeReport, type ChatTurn } from '../shared/ai';
import { districtSummary, type DistrictData } from '../shared/districts';
import { simulate } from '../shared/engine';
import type { DecisionInput } from '../shared/types';

const enabled = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.RIPPLE_AI === '1');
const client = enabled ? new Anthropic() : null;

const here = path.dirname(fileURLToPath(import.meta.url));
let districts: DistrictData | null = null;
function districtContext(label: unknown) {
  if (typeof label !== 'string' || !/^[A-Z]{2}-(AL|\d{1,2})$/.test(label)) return null;
  districts ??= JSON.parse(fs.readFileSync(path.resolve(here, '../client/src/data/districts.json'), 'utf8')) as DistrictData;
  const d = Object.values(districts.districts).find((x) => x.label === label);
  return d ? districtSummary(d, districts.national) : null;
}

// AI calls cost money, so they get a tighter limit than simulations, plus a daily ceiling.
const perIp = new Map<string, { count: number; reset: number }>();
let day = { date: '', count: 0 };
const DAILY = Number(process.env.AI_DAILY_LIMIT ?? 300);
function allow(ip: string): string | null {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, count: 0 };
  if (day.count >= DAILY) return 'The AI report has reached today’s limit on this server. The simulation still works.';
  const e = perIp.get(ip);
  if (!e || e.reset < now) perIp.set(ip, { count: 1, reset: now + 10 * 60_000 });
  else if (++e.count > 10) return 'That’s a lot of AI requests. Wait a few minutes and try again.';
  day.count++;
  return null;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of perIp) if (v.reset < now) perIp.delete(k);
}, 60_000).unref();

function readHistory(x: unknown): ChatTurn[] {
  if (!Array.isArray(x) || x.length === 0 || x.length > 12) throw new AiError('Ask one question at a time (up to six in a row).', 400);
  const turns = x.map((t) => {
    const r = (t ?? {}) as Record<string, unknown>;
    if ((r.role !== 'user' && r.role !== 'assistant') || typeof r.content !== 'string' || !r.content.trim() || r.content.length > 1500)
      throw new AiError('That question couldn’t be read. Keep it under 500 characters.', 400);
    return { role: r.role, content: r.content.trim() } as ChatTurn;
  });
  if (turns[0].role !== 'user' || turns[turns.length - 1].role !== 'user') throw new AiError('The conversation should start and end with a question.', 400);
  return turns;
}

/** Turns SDK errors into short messages people can act on. */
function friendly(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.RateLimitError) return new AiError('Claude is busy right now. Try again in a minute.', 429);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new AiError('The AI report isn’t set up correctly on this server.', 503);
  if (err instanceof Anthropic.BadRequestError) return new AiError('Claude couldn’t take that request. Try a shorter decision or question.', 400);
  if (err instanceof Anthropic.APIConnectionError) return new AiError('Couldn’t reach Claude. Check the server’s connection.', 502);
  if (err instanceof Anthropic.APIError) return new AiError('Claude had a problem. Try again in a moment.', 502);
  console.error(err);
  return new AiError('The AI report failed. Try again in a moment.', 500);
}

export function aiRouter(readInput: (body: unknown) => DecisionInput): Router {
  const r = express.Router();
  r.use(express.json({ limit: '32kb' }));
  r.get('/status', (_req, res) => res.json({ enabled, model: enabled ? AI_MODEL : null }));
  r.use((req, res, next) => {
    if (req.method !== 'POST') return next();
    if (!client) return res.status(503).json({ error: 'The AI report isn’t turned on for this server.' });
    const why = allow(req.ip ?? 'anon');
    if (why) return res.status(429).json({ error: why });
    next();
  });
  const contextFor = (body: unknown) => {
    const result = simulate(readInput(body), { withRecommendations: true });
    return buildContext(result, { district: districtContext((body as Record<string, unknown>)?.district) });
  };
  r.post('/report', async (req, res) => {
    try {
      res.json({ report: await writeReport(client!, contextFor(req.body)) });
    } catch (err) {
      const e = friendly(err);
      res.status((err as { status?: number }).status === 400 && !(err instanceof AiError) ? 400 : e.status).json({ error: e.message });
    }
  });
  r.post('/ask', async (req, res) => {
    try {
      const history = readHistory((req.body as Record<string, unknown>)?.history);
      res.json({ answer: await answer(client!, contextFor(req.body), history) });
    } catch (err) {
      const e = friendly(err);
      res.status(e.status).json({ error: e.message });
    }
  });
  return r;
}

export const AI_ENABLED = enabled;
