/** Build-time settings. See vite.config.ts for the three build modes. */
export const BUILD_MODE = __BUILD_MODE__;

const envApi = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

/** Where the Ripple server lives: '' means same origin, null means there is no server (static hosting). */
export const API_BASE: string | null = BUILD_MODE === 'full' ? '' : envApi ? envApi : null;
export const HAS_SERVER = API_BASE !== null;

/** The hosted preview runs inside a sandboxed frame, so it keeps routes in memory. */
export const USE_MEMORY_ROUTER = BUILD_MODE === 'artifact';

/** GitHub Pages serves the site from /<repo>/, so the router needs that prefix. */
export const ROUTER_BASENAME = BUILD_MODE === 'pages' ? import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined : undefined;

/** A full URL to a route in this app, for share links and survey links. */
export function appUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  if (USE_MEMORY_ROUTER) return path;
  const base = ROUTER_BASENAME ?? '';
  return `${window.location.origin}${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Fetch from the Ripple server. Returns null when this build has no server or the
 * server can't be reached, so callers can fall back to running in the browser.
 */
export async function apiFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response | null> {
  if (API_BASE === null) return null;
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, { ...rest, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
