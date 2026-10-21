import type { Scope, ScopeChoice, SimulationResult } from '../../../shared/types';
import { appUrl } from './config';

const SCOPES: ScopeChoice[] = ['auto', 'personal', 'school', 'community', 'business'];

export function parseScope(value: string | null): ScopeChoice {
  return value && (SCOPES as string[]).includes(value) ? (value as ScopeChoice) : 'auto';
}

/** "maria:2,harold:0.5" ⇄ { maria: 2, harold: 0.5 } */
export function encodeMix(mix: Record<string, number>): string {
  return Object.entries(mix)
    .filter(([k, v]) => /^[a-z]{2,20}$/.test(k) && Number.isFinite(v) && v !== 1)
    .map(([k, v]) => `${k}:${Math.round(v * 100) / 100}`)
    .join(',');
}

export function decodeMix(value: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value) return out;
  for (const part of value.split(',').slice(0, 16)) {
    const [k, v] = part.split(':');
    const n = Number(v);
    if (/^[a-z]{2,20}$/.test(k ?? '') && Number.isFinite(n)) out[k] = Math.max(0, Math.min(4, n));
  }
  return out;
}

export function parseCrowd(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 100 && n <= 2000 ? Math.round(n / 50) * 50 : 1000;
}

export interface ShareState {
  decision: string;
  scope: ScopeChoice | Scope;
  crowdSize?: number;
  mix?: Record<string, number>;
  district?: string;
}

/** The simulator path that reproduces a result exactly (the engine is deterministic). */
export function simulatorPath(state: ShareState, run = true): string {
  const q = new URLSearchParams();
  q.set('d', state.decision);
  if (state.scope && state.scope !== 'auto') q.set('s', state.scope);
  if (state.crowdSize && state.crowdSize !== 1000) q.set('n', String(state.crowdSize));
  const m = encodeMix(state.mix ?? {});
  if (m) q.set('m', m);
  if (state.district) q.set('cd', state.district);
  if (run) q.set('run', '1');
  return `/simulate?${q.toString()}`;
}

export function shareUrlFor(r: SimulationResult, district?: string): string {
  return appUrl(simulatorPath({ decision: r.decision, scope: r.scope, crowdSize: r.crowdSize, mix: r.mix, district }));
}
