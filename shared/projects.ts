/**
 * Saved projects and classes. No accounts, emails or passwords: a project is opened with a private
 * link, and students join a class with a short code and a nickname.
 */
import type { Scope } from './types';

export type ProjectKind = 'project' | 'class';

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  created: number;
  /** Classes only: the code students type to join. */
  joinCode?: string;
}

export interface ProjectItem {
  id: string;
  kind: 'simulation' | 'survey';
  decision: string;
  scope: Scope;
  mix?: Record<string, number>;
  district?: string | null;
  surveyId?: string;
  /** The student's nickname in a class; null for the owner. */
  author: string | null;
  created: number;
  /** The simulated result when it was saved. */
  snapshot: { verdict: string; support: number; oppose: number; net: number };
}

const fail = (message: string) => Object.assign(new Error(message), { status: 400 });

export function cleanName(x: unknown): string {
  const s = typeof x === 'string' ? x.trim().replace(/\s+/g, ' ') : '';
  if (s.length < 2) throw fail('Give it a name.');
  return s.slice(0, 80);
}

/** A first name or a handle. Contact details are refused so students don't share them by accident. */
export function cleanNickname(x: unknown): string {
  const s = typeof x === 'string' ? x.trim().replace(/\s+/g, ' ') : '';
  if (/@|\.(com|org|net|edu)\b/i.test(s)) throw fail('Use a first name or a nickname, not an email address.');
  if ((s.match(/\d/g) ?? []).length >= 7) throw fail('Use a first name or a nickname, not a phone number.');
  if (s.length < 2 || s.length > 24) throw fail('Nicknames are 2 to 24 characters.');
  return s;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeJoinCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(random(6), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export interface SurveySummary {
  n: number;
  support: number;
  predicted: number;
}

/** What a class (or project) has done, for the teacher's dashboard. */
export function rollup(items: ProjectItem[], surveys: Record<string, SurveySummary>) {
  const authors = new Map<string, number>();
  for (const it of items) if (it.author) authors.set(it.author, (authors.get(it.author) ?? 0) + 1);
  const answered = items.filter((it) => it.kind === 'survey' && it.surveyId && surveys[it.surveyId]?.n).map((it) => surveys[it.surveyId!]);
  const withData = answered.filter((s) => s.n >= 10);
  return {
    simulations: items.filter((it) => it.kind === 'simulation').length,
    surveys: items.filter((it) => it.kind === 'survey').length,
    answers: answered.reduce((t, s) => t + s.n, 0),
    byAuthor: [...authors.entries()].map(([author, n]) => ({ author, items: n })).sort((a, b) => b.items - a.items || a.author.localeCompare(b.author)),
    /** Average |real − predicted| support, over surveys with 10+ answers. */
    averageGap: withData.length ? Math.round(withData.reduce((t, s) => t + Math.abs(s.support - s.predicted), 0) / withData.length) : null,
  };
}
