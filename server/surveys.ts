/**
 * "Listen for real" surveys, stored in SQLite (Node's built-in node:sqlite).
 *
 *   POST /api/surveys                    { decision, scope?, crowdSize?, mix?, district? } → { id, key }
 *   GET  /api/surveys/:id                                                              → SurveyDef
 *   POST /api/surveys/:id/responses      { stance, group?, reason?, voter }            → { ok }
 *   GET  /api/surveys/:id/results?k=key                                                → { def, tally, reasons? }
 *
 * Answers are anonymous. Written reasons are shown only to the person who made the survey (the key).
 */
import express, { type Router } from 'express';
import { randomBytes } from 'node:crypto';
import { simulate } from '../shared/engine';
import { db } from './db';
import type { CalibrationRecord } from '../shared/calibration';
import { makeSurvey, readResponse, tally, type SurveyDef, type SurveyStance } from '../shared/surveys';
import type { DecisionInput } from '../shared/types';

const MAX_RESPONSES = 5000;
const token = (bytes: number) => randomBytes(bytes).toString('base64url');
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

const limits = new Map<string, { count: number; reset: number }>();
function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const e = limits.get(key);
  if (!e || e.reset < now) limits.set(key, { count: 1, reset: now + windowMs });
  else if (++e.count > max) return true;
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
}, 60_000).unref();

function load(id: string): { def: SurveyDef; key: string } {
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) throw fail(404, 'That survey doesn’t exist.');
  const row = db.prepare('SELECT def, key FROM surveys WHERE id = ?').get(id) as { def: string; key: string } | undefined;
  if (!row) throw fail(404, 'That survey doesn’t exist.');
  return { def: JSON.parse(row.def) as SurveyDef, key: row.key };
}

/** Every survey with a known topic: what Ripple predicted and what people answered. */
export function calibrationRecords(): CalibrationRecord[] {
  const rows = db
    .prepare(
      `SELECT s.def AS def, COUNT(r.id) AS n, SUM(CASE WHEN r.stance = 'support' THEN 1 ELSE 0 END) AS yes
       FROM surveys s JOIN responses r ON r.survey = s.id GROUP BY s.id`,
    )
    .all() as { def: string; n: number; yes: number }[];
  const out: CalibrationRecord[] = [];
  for (const row of rows) {
    const def = JSON.parse(row.def) as SurveyDef;
    if (def.anchor && row.n > 0) out.push({ anchor: def.anchor, predicted: def.predicted.support, actual: Math.round((row.yes / row.n) * 100), n: row.n });
  }
  return out;
}

export function surveyRouter(readInput: (body: unknown) => DecisionInput): Router {
  const r = express.Router();

  r.post('/', (req, res, next) => {
    try {
      if (limited(`create:${req.ip}`, 20, 60 * 60_000)) throw fail(429, 'That’s a lot of surveys. Try again in an hour.');
      const input = readInput(req.body);
      const label = (req.body as Record<string, unknown>)?.district;
      const district = typeof label === 'string' && /^[A-Z]{2}-(AL|\d{1,2})$/.test(label) ? label : null;
      const id = token(6);
      const key = token(18);
      const def = makeSurvey(simulate(input, { withRecommendations: false }), id, district);
      db.prepare('INSERT INTO surveys (id, key, def, created) VALUES (?, ?, ?, ?)').run(id, key, JSON.stringify(def), def.created);
      res.status(201).json({ id, key });
    } catch (err) {
      next(err);
    }
  });

  r.get('/:id', (req, res, next) => {
    try {
      res.json(load(req.params.id).def);
    } catch (err) {
      next(err);
    }
  });

  r.post('/:id/responses', (req, res, next) => {
    try {
      const { def } = load(req.params.id);
      if (limited(`answer:${req.ip}:${def.id}`, 60, 60 * 60_000)) throw fail(429, 'Too many answers from this network. Try again later.');
      const voter = (req.body as Record<string, unknown>)?.voter;
      if (typeof voter !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(voter)) throw fail(400, 'This browser couldn’t be identified. Reload and try again.');
      const answer = readResponse(req.body, def.groups);
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM responses WHERE survey = ?').get(def.id) as { n: number };
      if (n >= MAX_RESPONSES) throw fail(409, 'This survey is full.');
      try {
        db.prepare('INSERT INTO responses (survey, stance, grp, reason, voter, created) VALUES (?, ?, ?, ?, ?, ?)').run(def.id, answer.stance, answer.group, answer.reason, voter, Date.now());
      } catch {
        throw fail(409, 'You’ve already answered this survey.');
      }
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  r.get('/:id/results', (req, res, next) => {
    try {
      const { def, key } = load(req.params.id);
      const rows = db.prepare('SELECT stance, grp, reason, created FROM responses WHERE survey = ? ORDER BY created DESC').all(def.id) as {
        stance: SurveyStance;
        grp: string | null;
        reason: string | null;
        created: number;
      }[];
      const owner = typeof req.query.k === 'string' && req.query.k === key;
      res.json({
        def,
        tally: tally(rows.map((x) => ({ stance: x.stance, group: x.grp }))),
        owner,
        reasons: owner ? rows.filter((x) => x.reason).slice(0, 200).map((x) => ({ stance: x.stance, group: x.grp, reason: x.reason })) : undefined,
      });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
