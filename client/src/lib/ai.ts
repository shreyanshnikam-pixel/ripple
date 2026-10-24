import { answer, buildContext, writeReport, type AiReport, type ChatTurn } from '../../../shared/ai';
import { districtSummary } from '../../../shared/districts';
import type { SimulationResult } from '../../../shared/types';
import { AI_BASE, apiFetch, HAS_SERVER } from './config';
import { loadDistricts } from './district';

/**
 * "server": this site's server (or its hosted AI service) holds a key, so visitors need nothing.
 * "byok": the visitor can use their own key in this browser.
 */
export type AiMode = 'server' | 'byok';

/** Static builds with a hosted AI service send it the simulation summary; the full server re-runs the simulation itself. */
const hosted = !HAS_SERVER && !!AI_BASE;

async function aiFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response | null> {
  if (!hosted) return apiFetch(path, init);
  const { timeoutMs = 8000, ...rest } = init;
  try {
    return await fetch(`${AI_BASE}${path}`, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return null;
  }
}

export async function aiMode(): Promise<AiMode> {
  if (!HAS_SERVER && !hosted) return 'byok';
  try {
    const res = await aiFetch('/api/ai/status', { timeoutMs: 6000 });
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
  const res = await aiFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 300_000 });
  if (!res) throw new Error(hosted ? 'Couldn’t reach the AI service. Try again in a minute.' : 'Couldn’t reach the Ripple server.');
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? 'The AI report failed. Try again.');
  return j;
}

const inputOf = (r: SimulationResult, district: string | null) => ({ decision: r.decision, scope: r.scope, crowdSize: r.crowdSize, mix: r.mix, district });
/** What a request carries: the decision for the full server, or the simulation summary for the hosted service. */
const payload = async (r: SimulationResult, district: string | null) =>
  hosted ? { context: buildContext(r, { district: await districtFor(district) }) } : inputOf(r, district);

export async function requestReport(mode: AiMode, r: SimulationResult, district: string | null, key: string | null): Promise<AiReport> {
  if (mode === 'server') return (await post<{ report: AiReport }>('/api/ai/report', await payload(r, district))).report;
  if (!key) throw new Error('Add an API key first.');
  try {
    return await writeReport(browserGemini(key), buildContext(r, { district: await districtFor(district) }));
  } catch (err) {
    throw friendly(err);
  }
}

export async function requestAnswer(mode: AiMode, r: SimulationResult, district: string | null, key: string | null, history: ChatTurn[]): Promise<string> {
  if (mode === 'server') return (await post<{ answer: string }>('/api/ai/ask', { ...(await payload(r, district)), history })).answer;
  if (!key) throw new Error('Add an API key first.');
  try {
    return await answer(browserGemini(key), buildContext(r, { district: await districtFor(district) }), history);
  } catch (err) {
    throw friendly(err);
  }
}
