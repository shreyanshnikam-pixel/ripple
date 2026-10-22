/**
 * Saved projects and classes.
 *
 *   POST   /api/projects                    { name, kind: 'project' | 'class' }   → { id, key, joinCode? }
 *   POST   /api/projects/join               { code, nickname }                   → { id, token, nickname }
 *   GET    /api/projects/:id                                                     → project, items, roll-up
 *   POST   /api/projects/:id/items          { kind: 'simulation', decision, scope?, mix?, district? }
 *                                           | { kind: 'survey', surveyId }      → item
 *   DELETE /api/projects/:id/items/:itemId                                      → { ok }
 *
 * Access uses the x-ripple-key header: the owner's key (from the private link) or a student's
 * member token (from joining). No accounts, emails or passwords are stored.
 */
import express, { type Request, type Router } from 'express';
import { randomBytes } from 'node:crypto';
import { simulate } from '../shared/engine';
import { cleanName, cleanNickname, makeJoinCode, rollup, type ProjectItem, type ProjectKind, type SurveySummary } from '../shared/projects';
import type { SurveyDef } from '../shared/surveys';
import type { DecisionInput } from '../shared/types';
import { db } from './db';

const token = (bytes: number) => randomBytes(bytes).toString('base64url');
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
const MAX_ITEMS = 500;
const MAX_MEMBERS = 200;

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

type Row = { id: string; key: string; name: string; kind: ProjectKind; join_code: string | null; created: number };

/** Who is asking: the owner (private link key) or a class member (join token). */
function access(id: string, req: Request) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) throw fail(404, 'That project doesn’t exist.');
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Row | undefined;
  if (!p) throw fail(404, 'That project doesn’t exist.');
  const key = req.get('x-ripple-key') ?? '';
  if (key && key === p.key) return { p, role: 'owner' as const, member: null };
  const m = key ? (db.prepare('SELECT id, nickname FROM members WHERE project = ? AND token = ?').get(id, key) as { id: number; nickname: string } | undefined) : undefined;
  if (m) return { p, role: 'member' as const, member: m };
  throw fail(403, 'This link is missing its private key. Open the project from the link you saved, or join the class again.');
}

function surveySummaries(ids: string[]): Record<string, SurveySummary> {
  const out: Record<string, SurveySummary> = {};
  for (const id of ids) {
    const row = db.prepare('SELECT def FROM surveys WHERE id = ?').get(id) as { def: string } | undefined;
    if (!row) continue;
    const def = JSON.parse(row.def) as SurveyDef;
    const c = db.prepare(`SELECT COUNT(*) AS n, SUM(CASE WHEN stance = 'support' THEN 1 ELSE 0 END) AS yes FROM responses WHERE survey = ?`).get(id) as { n: number; yes: number | null };
    out[id] = { n: c.n, support: c.n ? Math.round(((c.yes ?? 0) / c.n) * 100) : 0, predicted: def.predicted.support };
  }
  return out;
}

export function projectRouter(readInput: (body: unknown) => DecisionInput): Router {
  const r = express.Router();

  r.post('/', (req, res, next) => {
    try {
      if (limited(`project:${req.ip}`, 20, 60 * 60_000)) throw fail(429, 'That’s a lot of new projects. Try again in an hour.');
      const b = (req.body ?? {}) as Record<string, unknown>;
      const kind: ProjectKind = b.kind === 'class' ? 'class' : 'project';
      const name = cleanName(b.name);
      const id = token(6);
      const key = token(18);
      let joinCode: string | null = null;
      if (kind === 'class') {
        for (let i = 0; i < 10 && !joinCode; i++) {
          const c = makeJoinCode();
          if (!db.prepare('SELECT 1 FROM projects WHERE join_code = ?').get(c)) joinCode = c;
        }
        if (!joinCode) throw fail(500, 'Couldn’t make a join code. Try again.');
      }
      db.prepare('INSERT INTO projects (id, key, name, kind, join_code, created) VALUES (?, ?, ?, ?, ?, ?)').run(id, key, name, kind, joinCode, Date.now());
      res.status(201).json({ id, key, joinCode });
    } catch (err) {
      next(err);
    }
  });

  r.post('/join', (req, res, next) => {
    try {
      if (limited(`join:${req.ip}`, 120, 60 * 60_000)) throw fail(429, 'Too many tries. Wait a little and try again.');
      const b = (req.body ?? {}) as Record<string, unknown>;
      const code = typeof b.code === 'string' ? b.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      const p = db.prepare(`SELECT * FROM projects WHERE join_code = ? AND kind = 'class'`).get(code) as Row | undefined;
      if (!p) throw fail(404, 'No class has that code. Check it with your teacher.');
      const nickname = cleanNickname(b.nickname);
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM members WHERE project = ?').get(p.id) as { n: number };
      if (n >= MAX_MEMBERS) throw fail(409, 'This class is full.');
      if (db.prepare('SELECT 1 FROM members WHERE project = ? AND nickname = ?').get(p.id, nickname)) throw fail(409, 'Someone in this class already uses that nickname. Try another.');
      const t = token(18);
      db.prepare('INSERT INTO members (project, token, nickname, created) VALUES (?, ?, ?, ?)').run(p.id, t, nickname, Date.now());
      res.status(201).json({ id: p.id, token: t, nickname, name: p.name });
    } catch (err) {
      next(err);
    }
  });

  r.get('/:id', (req, res, next) => {
    try {
      const { p, role, member } = access(req.params.id, req);
      const rows = db.prepare('SELECT id, data, created FROM items WHERE project = ? ORDER BY created DESC').all(p.id) as { id: string; data: string; created: number }[];
      const items = rows.map((x) => ({ ...(JSON.parse(x.data) as Omit<ProjectItem, 'id' | 'created'>), id: x.id, created: x.created }));
      const surveys = surveySummaries(items.filter((i) => i.surveyId).map((i) => i.surveyId!));
      const members = db.prepare('SELECT nickname FROM members WHERE project = ? ORDER BY created').all(p.id) as { nickname: string }[];
      res.json({
        project: { id: p.id, name: p.name, kind: p.kind, created: p.created, joinCode: role === 'owner' ? p.join_code : undefined },
        role,
        me: member?.nickname ?? null,
        items,
        surveys,
        members: role === 'owner' ? members.map((m) => m.nickname) : undefined,
        memberCount: members.length,
        rollup: rollup(items, surveys),
      });
    } catch (err) {
      next(err);
    }
  });

  r.post('/:id/items', (req, res, next) => {
    try {
      const { p, member } = access(req.params.id, req);
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM items WHERE project = ?').get(p.id) as { n: number };
      if (n >= MAX_ITEMS) throw fail(409, 'This project is full. Start a new one.');
      const b = (req.body ?? {}) as Record<string, unknown>;
      let item: Omit<ProjectItem, 'id' | 'created'>;
      if (b.kind === 'survey') {
        const sid = typeof b.surveyId === 'string' ? b.surveyId : '';
        const row = db.prepare('SELECT def FROM surveys WHERE id = ?').get(sid) as { def: string } | undefined;
        if (!row) throw fail(404, 'That survey doesn’t exist.');
        const def = JSON.parse(row.def) as SurveyDef;
        const pr = def.predicted;
        item = { kind: 'survey', decision: def.decision, scope: def.scope, surveyId: sid, district: def.district, author: member?.nickname ?? null, snapshot: { verdict: 'Survey', support: pr.support, oppose: pr.oppose, net: pr.support - pr.oppose } };
      } else {
        const input = readInput(b);
        const result = simulate(input, { withRecommendations: false });
        const district = typeof b.district === 'string' && /^[A-Z]{2}-(AL|\d{1,2})$/.test(b.district) ? b.district : null;
        const s = result.summary;
        item = { kind: 'simulation', decision: result.decision, scope: result.scope, mix: result.mix, district, author: member?.nickname ?? null, snapshot: { verdict: s.verdict, support: s.support, oppose: s.oppose, net: s.net } };
      }
      const id = token(6);
      const created = Date.now();
      db.prepare('INSERT INTO items (id, project, data, author, member, created) VALUES (?, ?, ?, ?, ?, ?)').run(id, p.id, JSON.stringify(item), item.author, member?.id ?? null, created);
      res.status(201).json({ ...item, id, created });
    } catch (err) {
      next(err);
    }
  });

  r.delete('/:id/items/:itemId', (req, res, next) => {
    try {
      const { p, role, member } = access(req.params.id, req);
      const row = db.prepare('SELECT member FROM items WHERE id = ? AND project = ?').get(req.params.itemId, p.id) as { member: number | null } | undefined;
      if (!row) throw fail(404, 'That item is already gone.');
      if (role !== 'owner' && row.member !== member?.id) throw fail(403, 'Only the teacher or the student who added it can remove it.');
      db.prepare('DELETE FROM items WHERE id = ?').run(req.params.itemId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
