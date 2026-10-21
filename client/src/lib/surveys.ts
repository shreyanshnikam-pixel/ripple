import { makeSurvey, readResponse, tally, type SurveyDef, type SurveyStance, type Tally } from '../../../shared/surveys';
import type { SimulationResult } from '../../../shared/types';
import { apiFetch, HAS_SERVER } from './config';

/**
 * Surveys live on the Ripple server when there is one (a link anyone can open).
 * On a static site they live on this device ("pass the phone around" mode); their ids start with "l-".
 */
export const isLocal = (id: string) => id.startsWith('l-');

type LocalStore = Record<string, { def: SurveyDef; key: string; responses: { stance: SurveyStance; group: string | null; reason: string | null; at: number }[] }>;
const STORE = 'ripple:surveys';
const MINE = 'ripple:my-surveys';
const VOTER = 'ripple:voter';

function readJSON<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('This browser won’t let Ripple save the survey (storage is blocked or full).');
  }
}

const randomId = (n: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
};

/** An anonymous id for this browser, so one person answers once. */
export function voterId(): string {
  let v: string | null = null;
  try {
    v = localStorage.getItem(VOTER);
    if (!v) {
      v = randomId(20);
      localStorage.setItem(VOTER, v);
    }
  } catch {
    v ??= randomId(20);
  }
  return v;
}

/** Surveys made on this device, with their owner keys (so results show written reasons). */
export function mySurveys(): Record<string, string> {
  return readJSON<Record<string, string>>(MINE, {});
}
function rememberMine(id: string, key: string) {
  try {
    writeJSON(MINE, { ...mySurveys(), [id]: key });
  } catch {
    /* the results link still carries the key */
  }
}

async function json<T>(res: Response | null): Promise<T> {
  if (!res) throw new Error('Couldn’t reach the Ripple server.');
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.');
  return j;
}

export async function createSurvey(r: SimulationResult, district: string | null): Promise<{ id: string; key: string; local: boolean }> {
  if (HAS_SERVER) {
    try {
      const res = await apiFetch('/api/surveys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision: r.decision, scope: r.scope, crowdSize: r.crowdSize, mix: r.mix, district }),
        timeoutMs: 8000,
      });
      if (res && res.status !== 404) {
        const out = await json<{ id: string; key: string }>(res);
        rememberMine(out.id, out.key);
        return { ...out, local: false };
      }
    } catch (err) {
      if (err instanceof Error && !/reach/.test(err.message)) throw err;
    }
  }
  const id = `l-${randomId(8)}`;
  const key = randomId(16);
  const store = readJSON<LocalStore>(STORE, {});
  store[id] = { def: makeSurvey(r, id, district), key, responses: [] };
  writeJSON(STORE, store);
  rememberMine(id, key);
  return { id, key, local: true };
}

export async function getSurvey(id: string): Promise<SurveyDef> {
  if (isLocal(id)) {
    const s = readJSON<LocalStore>(STORE, {})[id];
    if (!s) throw new Error('This survey was made on another device. On-device surveys only open where they were made.');
    return s.def;
  }
  return json<SurveyDef>(await apiFetch(`/api/surveys/${encodeURIComponent(id)}`, { timeoutMs: 8000 }));
}

export async function answerSurvey(def: SurveyDef, answer: { stance: SurveyStance; group: string | null; reason: string | null }): Promise<void> {
  if (isLocal(def.id)) {
    const store = readJSON<LocalStore>(STORE, {});
    const s = store[def.id];
    if (!s) throw new Error('This survey isn’t on this device.');
    s.responses.push({ ...readResponse(answer, def.groups), at: Date.now() });
    writeJSON(STORE, store);
    return;
  }
  await json(await apiFetch(`/api/surveys/${encodeURIComponent(def.id)}/responses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...answer, voter: voterId() }), timeoutMs: 8000 }));
}

export interface SurveyResults {
  def: SurveyDef;
  tally: Tally;
  owner: boolean;
  reasons?: { stance: SurveyStance; group: string | null; reason: string }[];
}

export async function surveyResults(id: string, key: string | null): Promise<SurveyResults> {
  if (isLocal(id)) {
    const s = readJSON<LocalStore>(STORE, {})[id];
    if (!s) throw new Error('This survey was made on another device.');
    const owner = !!key && key === s.key;
    return {
      def: s.def,
      tally: tally(s.responses),
      owner,
      reasons: owner ? s.responses.filter((x) => x.reason).map((x) => ({ stance: x.stance, group: x.group, reason: x.reason! })).reverse() : undefined,
    };
  }
  const q = key ? `?k=${encodeURIComponent(key)}` : '';
  return json<SurveyResults>(await apiFetch(`/api/surveys/${encodeURIComponent(id)}/results${q}`, { timeoutMs: 8000 }));
}
