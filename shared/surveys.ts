/**
 * "Listen for real": a 30-second survey that asks real people the same question Ripple
 * simulated, then compares their answers with the prediction.
 */
import type { Scope, SimulationResult } from './types';

export type SurveyStance = 'support' | 'neutral' | 'oppose';

export interface SurveyDef {
  id: string;
  decision: string;
  scope: Scope;
  /** The simulated groups, offered as "Which describes you?" (optional for respondents). */
  groups: string[];
  /** Ripple's day-one prediction, frozen when the survey was made. */
  predicted: { support: number; neutral: number; oppose: number; byGroup: Record<string, number> };
  district: string | null;
  created: number;
  /** The topic Ripple matched (for calibration), when it started from a poll or estimate. */
  anchor?: string | null;
}

export interface SurveyResponse {
  stance: SurveyStance;
  group: string | null;
  reason: string | null;
  at: number;
}

export function makeSurvey(r: SimulationResult, id: string, district: string | null = null, now = Date.now()): SurveyDef {
  return {
    id,
    decision: r.decision,
    scope: r.scope,
    groups: r.groups.map((g) => g.group),
    predicted: {
      support: r.summary.support,
      neutral: r.summary.neutral,
      oppose: r.summary.oppose,
      byGroup: Object.fromEntries(r.groups.map((g) => [g.group, g.support])),
    },
    district,
    created: now,
    anchor: r.reality && r.reality.anchor.basis !== 'model' ? r.reality.anchor.id : null,
  };
}

const STANCES: SurveyStance[] = ['support', 'neutral', 'oppose'];

/** Cleans one answer. Unknown groups become "no answer"; reasons are trimmed and capped. */
export function readResponse(x: unknown, groups: string[]): Omit<SurveyResponse, 'at'> {
  const o = (x ?? null) as Record<string, unknown> | null;
  if (!o || !STANCES.includes(o.stance as SurveyStance)) throw Object.assign(new Error('Choose for, not sure, or against.'), { status: 400 });
  const group = typeof o.group === 'string' && groups.includes(o.group) ? o.group : null;
  const reason = typeof o.reason === 'string' && o.reason.trim() ? o.reason.trim().replace(/\s+/g, ' ').slice(0, 280) : null;
  return { stance: o.stance as SurveyStance, group, reason };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
/** Smallest group size worth showing on its own. */
export const MIN_GROUP = 3;

export interface Tally {
  n: number;
  counts: Record<SurveyStance, number>;
  support: number;
  neutral: number;
  oppose: number;
  net: number;
  byGroup: { group: string; n: number; support: number; oppose: number }[];
}

export function tally(responses: Pick<SurveyResponse, 'stance' | 'group'>[]): Tally {
  const counts = { support: 0, neutral: 0, oppose: 0 };
  const groups = new Map<string, { n: number; support: number; oppose: number }>();
  for (const r of responses) {
    counts[r.stance]++;
    if (r.group) {
      const g = groups.get(r.group) ?? { n: 0, support: 0, oppose: 0 };
      g.n++;
      if (r.stance === 'support') g.support++;
      if (r.stance === 'oppose') g.oppose++;
      groups.set(r.group, g);
    }
  }
  const n = responses.length;
  const support = pct(counts.support, n);
  const oppose = pct(counts.oppose, n);
  return {
    n,
    counts,
    support,
    neutral: n ? 100 - support - oppose : 0,
    oppose,
    net: support - oppose,
    byGroup: [...groups.entries()]
      .filter(([, g]) => g.n >= MIN_GROUP)
      .map(([group, g]) => ({ group, n: g.n, support: pct(g.support, g.n), oppose: pct(g.oppose, g.n) }))
      .sort((a, b) => b.n - a.n),
  };
}

/** How real answers line up with the prediction, with an honest note about sample size. */
export function compareWithPrediction(def: SurveyDef, t: Tally) {
  const enough = t.n >= 30;
  // 95% margin of error for a share, at its widest (50%). Real surveys aren't random samples, so this is a floor.
  const margin = t.n ? Math.round((1.96 * Math.sqrt(0.25 / t.n)) * 100) : 100;
  const gap = t.support - def.predicted.support;
  const note = !t.n
    ? 'No answers yet. Share the link and check back.'
    : !enough
      ? `With ${t.n} answer${t.n === 1 ? '' : 's'}, treat this as a conversation starter, not a poll.`
      : Math.abs(gap) <= margin
        ? `Real answers land within ${margin} points of Ripple’s prediction.`
        : `Real support is ${Math.abs(gap)} points ${gap > 0 ? 'higher' : 'lower'} than Ripple predicted. That’s worth understanding: who did the simulation miss?`;
  return { enough, margin, gap, note };
}
