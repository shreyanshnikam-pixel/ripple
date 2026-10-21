import { simulate } from '../../../shared/engine';
import type { DecisionInput, SimulationResult } from '../../../shared/types';


export type Source = 'api' | 'browser';

class UserError extends Error {}

/**
 * Run a simulation on the Ripple API. If the server isn't reachable (offline,
 * static hosting, demo build), run the same engine in the browser instead.
 */
export async function runSimulation(input: DecisionInput): Promise<{ result: SimulationResult; source: Source }> {
  if (!__DEMO_BUILD__) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return { result: (await res.json()) as SimulationResult, source: 'api' };
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new UserError(body.error ?? 'Check your decision and try again.');
      }
    } catch (err) {
      if (err instanceof UserError) throw err;
      // fall through to the in-browser engine
    }
  }
  return { result: simulate(input), source: 'browser' };
}
