import type { Project, ProjectItem, SurveySummary } from '../../../shared/projects';
import { apiFetch } from './config';

/** Projects and classes this browser can open: owner keys or student join tokens, kept on this device only. */
export interface SavedProject {
  id: string;
  name: string;
  kind: Project['kind'];
  /** Owner's private key. */
  key?: string;
  /** Student's join token. */
  token?: string;
  nickname?: string;
}

const STORE = 'ripple:projects';

export function savedProjects(): SavedProject[] {
  try {
    return (JSON.parse(localStorage.getItem(STORE) ?? '[]') as SavedProject[]).filter((p) => p && p.id);
  } catch {
    return [];
  }
}

export function rememberProject(p: SavedProject) {
  try {
    const rest = savedProjects().filter((x) => x.id !== p.id);
    localStorage.setItem(STORE, JSON.stringify([{ ...savedProjects().find((x) => x.id === p.id), ...p }, ...rest]));
  } catch {
    /* storage blocked: keep the private link instead */
  }
}

export function forgetProject(id: string) {
  try {
    localStorage.setItem(STORE, JSON.stringify(savedProjects().filter((x) => x.id !== id)));
  } catch {
    /* nothing to forget */
  }
}

export const credentialFor = (id: string) => {
  const p = savedProjects().find((x) => x.id === id);
  return p?.key ?? p?.token ?? null;
};

async function call<T>(method: string, path: string, body?: unknown, key?: string | null): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...(key ? { 'x-ripple-key': key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs: 10_000,
  });
  if (!res) throw new Error('Couldn’t reach the Ripple server.');
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.');
  return j;
}

export async function createProject(name: string, kind: Project['kind']) {
  const out = await call<{ id: string; key: string; joinCode: string | null }>('POST', '/api/projects', { name, kind });
  rememberProject({ id: out.id, key: out.key, name: name.trim(), kind });
  return out;
}

export async function joinClass(code: string, nickname: string) {
  const out = await call<{ id: string; token: string; nickname: string; name: string }>('POST', '/api/projects/join', { code, nickname });
  rememberProject({ id: out.id, token: out.token, nickname: out.nickname, name: out.name, kind: 'class' });
  return out;
}

export interface ProjectView {
  project: Project;
  role: 'owner' | 'member';
  me: string | null;
  items: ProjectItem[];
  surveys: Record<string, SurveySummary>;
  members?: string[];
  memberCount: number;
  rollup: { simulations: number; surveys: number; answers: number; byAuthor: { author: string; items: number }[]; averageGap: number | null };
}

export const getProject = (id: string, key: string) => call<ProjectView>('GET', `/api/projects/${encodeURIComponent(id)}`, undefined, key);

export const addSimulation = (id: string, key: string, input: { decision: string; scope: string; mix?: Record<string, number>; district?: string | null; crowdSize?: number }) =>
  call<ProjectItem>('POST', `/api/projects/${encodeURIComponent(id)}/items`, { kind: 'simulation', ...input }, key);

export const addSurvey = (id: string, key: string, surveyId: string) => call<ProjectItem>('POST', `/api/projects/${encodeURIComponent(id)}/items`, { kind: 'survey', surveyId }, key);

export const removeItem = (id: string, key: string, itemId: string) => call<{ ok: true }>('DELETE', `/api/projects/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, undefined, key);
