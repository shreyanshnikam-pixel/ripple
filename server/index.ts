/**
 * Ripple API server.
 *
 *   POST /api/simulate   { decision, scope?, crowdSize? } → SimulationResult
 *   POST /api/analyze    { decision, scope? }             → Analysis (live typing feedback)
 *   GET  /api/health                                      → { ok, engine }
 *   /api/ai/*                                             → optional AI report and Q&A (see ai.ts)
 *   /api/surveys/*                                        → "Listen for real" surveys (see surveys.ts)
 *
 * In production (`npm start`) it also serves the built React app from /dist.
 * The engine is pluggable: swap `heuristicEngine` for an LLM-backed engine
 * that returns the same SimulationResult shape.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyze, ENGINE_VERSION, simulate } from '../shared/engine';
import { AI_ENABLED, aiRouter } from './ai';
import { calibrationRecords, surveyRouter } from './surveys';
import { projectRouter } from './projects';
import { calibrationTable, trackRecord } from '../shared/calibration';
import { ANCHORS } from '../shared/anchors';
import type { DecisionInput, ScopeChoice, SimulationResult } from '../shared/types';

interface Engine {
  name: string;
  run(input: DecisionInput): Promise<SimulationResult>;
}

const heuristicEngine: Engine = {
  name: 'heuristic-v2',
  run: async (input) => simulate(input),
};

// Future: an LLM engine can enrich quotes and themes while keeping the crowd model.
const engine: Engine = heuristicEngine;

const SCOPES: ScopeChoice[] = ['auto', 'personal', 'school', 'community', 'business'];
const app = express();
app.disable('x-powered-by');
app.use(cors());
// AI routes parse their own (slightly larger) bodies: they carry a short conversation.
const json = express.json({ limit: '16kb' });
app.use((req, res, next) => (req.path.startsWith('/api/ai/') ? next() : json(req, res, next)));

// Behind a hosting proxy (Render, Railway…) the real client IP is in X-Forwarded-For.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// Small in-memory rate limit so a public demo can't be hammered. A classroom shares one network
// address, so schools running their own copy can raise it with RATE_LIMIT_PER_MIN.
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 120);
const hits = new Map<string, { count: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (entry.reset < now) hits.delete(key);
}, 60_000).unref();
app.use('/api', (req, res, next) => {
  const key = req.ip ?? 'anon';
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) hits.set(key, { count: 1, reset: now + 60_000 });
  else if (++entry.count > RATE_LIMIT) return res.status(429).json({ error: 'Too many simulations at once. Wait a minute and try again.' });
  next();
});

function readInput(body: unknown): DecisionInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const decision = typeof b.decision === 'string' ? b.decision.trim() : '';
  if (decision.length < 3) throw Object.assign(new Error('Describe your decision in a few words first.'), { status: 400 });
  if (decision.length > 500) throw Object.assign(new Error('Keep the decision under 500 characters.'), { status: 400 });
  const scope = SCOPES.includes(b.scope as ScopeChoice) ? (b.scope as ScopeChoice) : 'auto';
  const crowdSize = typeof b.crowdSize === 'number' && Number.isFinite(b.crowdSize) ? b.crowdSize : 1000;
  // Who's in the room: { personaId: multiplier }, kept small and numeric.
  let mix: Record<string, number> | undefined;
  if (b.mix && typeof b.mix === 'object' && !Array.isArray(b.mix)) {
    mix = {};
    for (const [k, v] of Object.entries(b.mix as Record<string, unknown>).slice(0, 16)) {
      if (/^[a-z]{2,20}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) mix[k] = Math.max(0, Math.min(4, v));
    }
  }
  return { decision, scope, crowdSize, mix };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, engine: engine.name, version: ENGINE_VERSION }));

app.post('/api/analyze', (req, res, next) => {
  try {
    const { decision, scope } = readInput(req.body);
    res.json(analyze(decision, scope));
  } catch (err) {
    next(err);
  }
});

// Calibration from real surveys (see shared/calibration.ts). Rebuilt every few minutes; CALIBRATION=off disables it.
let calibration = { at: 0, table: {} as NonNullable<DecisionInput['calibration']> };
function currentCalibration() {
  if (process.env.CALIBRATION === 'off') return undefined;
  if (Date.now() - calibration.at > 5 * 60_000) calibration = { at: Date.now(), table: calibrationTable(calibrationRecords()) };
  return calibration.table;
}
/** Visitor input, plus the server's own calibration (never taken from the request). */
const readCalibrated = (body: unknown): DecisionInput => ({ ...readInput(body), calibration: currentCalibration() });

app.get('/api/track-record', (_req, res) => {
  const records = calibrationRecords();
  const label = (id: string) => ANCHORS.find((a) => a.id === id)?.label ?? id;
  res.json({
    ...trackRecord(records),
    calibration: Object.entries(calibrationTable(records)).map(([id, c]) => ({ topic: label(id), ...c })),
    // Topics and numbers only: what people wrote in surveys stays private.
    list: records.filter((r) => r.n >= 30).map((r) => ({ topic: label(r.anchor), predicted: r.predicted, actual: r.actual, answers: r.n })),
  });
});

app.use('/api/ai', aiRouter(readCalibrated));
app.use('/api/surveys', surveyRouter(readCalibrated));
app.use('/api/projects', projectRouter(readCalibrated));

app.post('/api/simulate', async (req, res, next) => {
  try {
    const started = Date.now();
    const result = await engine.run(readCalibrated(req.body));
    res.setHeader('Server-Timing', `engine;dur=${Date.now() - started}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Serve the built client in production.
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'The simulation failed. Try again in a moment.' : err.message });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`Ripple API listening on http://localhost:${port} (engine: ${engine.name}, AI report: ${AI_ENABLED ? 'on' : 'off'})`));
