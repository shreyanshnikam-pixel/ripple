import type { Project, ProjectItem, SurveySummary } from '../../../shared/projects';
import { apiFetch, HAS_SERVER } from './config';
import { addLocalSimulation, addLocalSurvey, createLocalProject, getLocalProject, isLocalProject, joinLocalClass, removeLocalItem } from './projects-local';
import { readStore, writeStore } from './store';

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
  const list = readStore<SavedProject[]>(STORE, []);
  return Array.isArray(list) ? list.filter((p) => p && p.id) : [];
}

export function rememberProject(p: SavedProject) {
  const all = savedProjects();
  const rest = all.filter((x) => x.id !== p.id);
  writeStore(STORE, [{ ...all.find((x) => x.id === p.id), ...p }, ...rest]);
}

export function forgetProject(id: string) {
  writeStore(STORE, savedProjects().filter((x) => x.id !== id));
}

/** Without a server, projects and classes live on this device (see projects-local.ts). */
export const PROJECTS_ON_DEVICE = !HAS_SERVER;

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
  if (PROJECTS_ON_DEVICE) {
    const out = createLocalProject(name, kind);
    rememberProject({ id: out.id, key: out.key, name: name.trim(), kind });
    return out;
  }
  const out = await call<{ id: string; key: string; joinCode: string | null }>('POST', '/api/projects', { name, kind });
  rememberProject({ id: out.id, key: out.key, name: name.trim(), kind });
  return out;
}

export async function joinClass(code: string, nickname: string) {
  if (PROJECTS_ON_DEVICE) {
    const out = joinLocalClass(code, nickname);
    rememberProject({ id: out.id, token: out.token, nickname: out.nickname, name: out.name, kind: 'class' });
    return out;
  }
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

export const getProject = async (id: string, key: string) =>
  isLocalProject(id) ? getLocalProject(id, key) : call<ProjectView>('GET', `/api/projects/${encodeURIComponent(id)}`, undefined, key);

export const addSimulation = async (id: string, key: string, input: { decision: string; scope: string; mix?: Record<string, number>; district?: string | null; crowdSize?: number }) =>
  isLocalProject(id) ? addLocalSimulation(id, key, input) : call<ProjectItem>('POST', `/api/projects/${encodeURIComponent(id)}/items`, { kind: 'simulation', ...input }, key);

export const addSurvey = async (id: string, key: string, surveyId: string) =>
  isLocalProject(id) ? addLocalSurvey(id, key, surveyId) : call<ProjectItem>('POST', `/api/projects/${encodeURIComponent(id)}/items`, { kind: 'survey', surveyId }, key);

export const removeItem = async (id: string, key: string, itemId: string) =>
  isLocalProject(id) ? removeLocalItem(id, key, itemId) : call<{ ok: true }>('DELETE', `/api/projects/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, undefined, key);
