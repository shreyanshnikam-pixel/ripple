import { simulate } from '../../../shared/engine';
import type { DecisionInput, SimulationResult } from '../../../shared/types';
import { apiFetch } from './config';

export type Source = 'api' | 'browser';

class UserError extends Error {}

/**
 * Run a simulation on the Ripple server. If there is no server (static hosting,
 * the hosted preview, offline), run the same engine in the browser instead.
 */
export async function runSimulation(input: DecisionInput): Promise<{ result: SimulationResult; source: Source }> {
  const res = await apiFetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    timeoutMs: 6000,
  });
  if (res?.ok) return { result: (await res.json()) as SimulationResult, source: 'api' };
  if (res && res.status >= 400 && res.status < 500 && res.status !== 404) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new UserError(body.error ?? 'Check your decision and try again.');
  }
  return { result: simulate(input), source: 'browser' };
}
