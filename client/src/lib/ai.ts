import { answer, buildContext, writeReport, type AiReport, type ChatTurn } from '../../../shared/ai';
import { districtSummary } from '../../../shared/districts';
import type { SimulationResult } from '../../../shared/types';
import { apiFetch, HAS_SERVER } from './config';
import { loadDistricts } from './district';

/** "server": this site's server holds a key. "byok": the visitor can use their own key in this browser. */
export type AiMode = 'server' | 'byok';

export async function aiMode(): Promise<AiMode> {
  if (!HAS_SERVER) return 'byok';
  try {
    const res = await apiFetch('/api/ai/status', { timeoutMs: 4000 });
    if (res?.ok) {
      const j = (await res.json()) as { enabled?: boolean };
      if (j.enabled) return 'server';
    }
  } catch {
    /* fall through */
  }
  return 'byok';
}

const KEY = 'ripple:gemini-key';

export function storedKey(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Keeps a visitor's own key for this tab only, or on this device when they ask. Never sent to Ripple. */
export function storeKey(key: string | null, remember = false) {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (key) (remember ? localStorage : sessionStorage).setItem(KEY, key);
  } catch {
    /* storage blocked: the key lasts until the page closes */
  }
}

/** The visitor's own key, used straight from their browser to Google. */
const browserGemini = (key: string) => ({ key, timeoutMs: 60_000 });

async function districtFor(label: string | null) {
  if (!label) return null;
  const data = await loadDistricts();
  const d = Object.values(data.districts).find((x) => x.label === label);
  return d ? districtSummary(d, data.national) : null;
}

function friendly(err: unknown): Error {
  if (err instanceof Error && err.message) return err;
  return new Error('Gemini had a problem. Try again in a moment.');
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 180_000 });
  if (!res) throw new Error('Couldn’t reach the Ripple server.');
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? 'The AI report failed. Try again.');
  return j;
}

const inputOf = (r: SimulationResult, district: string | null) => ({ decision: r.decision, scope: r.scope, crowdSize: r.crowdSize, mix: r.mix, district });

export async function requestReport(mode: AiMode, r: SimulationResult, district: string | null, key: string | null): Promise<AiReport> {
  if (mode === 'server') return (await post<{ report: AiReport }>('/api/ai/report', inputOf(r, district))).report;
  if (!key) throw new Error('Add an API key first.');
  try {
    return await writeReport(browserGemini(key), buildContext(r, { district: await districtFor(district) }));
  } catch (err) {
    throw friendly(err);
  }
}

export async function requestAnswer(mode: AiMode, r: SimulationResult, district: string | null, key: string | null, history: ChatTurn[]): Promise<string> {
  if (mode === 'server') return (await post<{ answer: string }>('/api/ai/ask', { ...inputOf(r, district), history })).answer;
  if (!key) throw new Error('Add an API key first.');
  try {
    return await answer(browserGemini(key), buildContext(r, { district: await districtFor(district) }), history);
  } catch (err) {
    throw friendly(err);
  }
}
