/**
 * Projects and classes without a server (the GitHub Pages site and the single-file preview).
 * They live on this device, with ids starting with "l-", and work like the server version:
 * the owner opens a project with its key, and students join a class with its code and a nickname
 * (on this same device, e.g. a classroom computer or a phone passed around).
 */
import { simulate } from '../../../shared/engine';
import { cleanName, cleanNickname, makeJoinCode, rollup, type ProjectItem, type ProjectKind, type SurveySummary } from '../../../shared/projects';
import type { DecisionInput, Scope } from '../../../shared/types';
import type { ProjectView } from './projects';
import { readStore, writeStore } from './store';

export const isLocalProject = (id: string) => id.startsWith('l-');

interface LocalProject {
  id: string;
  key: string;
  name: string;
  kind: ProjectKind;
  joinCode: string | null;
  created: number;
  members: { token: string; nickname: string; created: number }[];
  items: (ProjectItem & { memberToken: string | null })[];
}
type Store = Record<string, LocalProject>;
const STORE = 'ripple:local-projects';
const MAX_ITEMS = 500;
const MAX_MEMBERS = 200;

const randomId = (n: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
};
const load = () => readStore<Store>(STORE, {});
const save = (s: Store) => writeStore(STORE, s);

function access(id: string, key: string) {
  const s = load();
  const p = s[id];
  if (!p) throw new Error('This project was made on another device. Projects on this copy of Ripple only open where they were made.');
  if (key === p.key) return { s, p, role: 'owner' as const, member: null };
  const member = p.members.find((m) => m.token === key);
  if (member) return { s, p, role: 'member' as const, member };
  throw new Error('This link is missing its private key. Open the project from the link you saved, or join the class again.');
}

/** Survey answers for survey items (on-device surveys only). */
type SurveyStore = Record<string, { def: { predicted: { support: number } }; responses: { stance: string }[] }>;
function surveySummaries(ids: string[]): Record<string, SurveySummary> {
  const store = readStore<SurveyStore>('ripple:surveys', {});
  const out: Record<string, SurveySummary> = {};
  for (const id of ids) {
    const sv = store[id];
    if (!sv) continue;
    const n = sv.responses.length;
    const yes = sv.responses.filter((r) => r.stance === 'support').length;
    out[id] = { n, support: n ? Math.round((yes / n) * 100) : 0, predicted: sv.def.predicted.support };
  }
  return out;
}

export function createLocalProject(name: string, kind: ProjectKind) {
  const s = load();
  const clean = cleanName(name);
  let joinCode: string | null = null;
  if (kind === 'class') {
    const used = new Set(Object.values(s).map((p) => p.joinCode));
    do joinCode = makeJoinCode();
    while (used.has(joinCode));
  }
  const p: LocalProject = { id: `l-${randomId(7)}`, key: randomId(18), name: clean, kind, joinCode, created: Date.now(), members: [], items: [] };
  s[p.id] = p;
  save(s);
  return { id: p.id, key: p.key, joinCode };
}

export function joinLocalClass(code: string, nickname: string) {
  const s = load();
  const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const p = Object.values(s).find((x) => x.kind === 'class' && x.joinCode === c);
  if (!p)
    throw new Error(
      'No class on this device has that code. In this copy of Ripple, classes live on the device that made them. To join from your own device, your teacher needs the version with the Ripple server.',
    );
  const nick = cleanNickname(nickname);
  if (p.members.length >= MAX_MEMBERS) throw new Error('This class is full.');
  if (p.members.some((m) => m.nickname === nick)) throw new Error('Someone in this class already uses that nickname. Try another.');
  const token = randomId(18);
  p.members.push({ token, nickname: nick, created: Date.now() });
  save(s);
  return { id: p.id, token, nickname: nick, name: p.name };
}

export function getLocalProject(id: string, key: string): ProjectView {
  const { p, role, member } = access(id, key);
  const items: ProjectItem[] = [...p.items].sort((a, b) => b.created - a.created).map(({ memberToken: _, ...it }) => it);
  const surveys = surveySummaries(items.filter((i) => i.surveyId).map((i) => i.surveyId!));
  return {
    project: { id: p.id, name: p.name, kind: p.kind, created: p.created, joinCode: role === 'owner' ? (p.joinCode ?? undefined) : undefined },
    role,
    me: member?.nickname ?? null,
    items,
    surveys,
    members: role === 'owner' ? p.members.map((m) => m.nickname) : undefined,
    memberCount: p.members.length,
    rollup: rollup(items, surveys),
  };
}

function addItem(id: string, key: string, make: (author: string | null) => Omit<ProjectItem, 'id' | 'created'>): ProjectItem {
  const { s, p, member } = access(id, key);
  if (p.items.length >= MAX_ITEMS) throw new Error('This project is full. Start a new one.');
  const item = { ...make(member?.nickname ?? null), id: randomId(6), created: Date.now() };
  p.items.push({ ...item, memberToken: member?.token ?? null });
  save(s);
  return item;
}

export function addLocalSimulation(id: string, key: string, input: { decision: string; scope: string; mix?: Record<string, number>; district?: string | null; crowdSize?: number }) {
  const decision = input.decision.trim().slice(0, 500);
  if (decision.length < 3) throw new Error('Describe the decision in a few words.');
  const di: DecisionInput = { decision, scope: (['community', 'school', 'business', 'personal', 'auto'].includes(input.scope) ? input.scope : 'auto') as DecisionInput['scope'], mix: input.mix, crowdSize: input.crowdSize };
  const r = simulate(di, { withRecommendations: false });
  const district = input.district && /^[A-Z]{2}-(AL|\d{1,2})$/.test(input.district) ? input.district : null;
  return addItem(id, key, (author) => ({
    kind: 'simulation',
    decision: r.decision,
    scope: r.scope as Scope,
    mix: r.mix,
    district,
    author,
    snapshot: { verdict: r.summary.verdict, support: r.summary.support, oppose: r.summary.oppose, net: r.summary.net },
  }));
}

export function addLocalSurvey(id: string, key: string, surveyId: string) {
  const store = readStore<Record<string, { def: { decision: string; scope: Scope; district?: string | null; predicted: { support: number; oppose: number } } }>>('ripple:surveys', {});
  const sv = store[surveyId];
  if (!sv) throw new Error('That survey isn’t on this device, so it can’t be added to an on-device project.');
  const pr = sv.def.predicted;
  return addItem(id, key, (author) => ({
    kind: 'survey',
    decision: sv.def.decision,
    scope: sv.def.scope,
    surveyId,
    district: sv.def.district ?? null,
    author,
    snapshot: { verdict: 'Survey', support: pr.support, oppose: pr.oppose, net: pr.support - pr.oppose },
  }));
}

export function removeLocalItem(id: string, key: string, itemId: string) {
  const { s, p, role, member } = access(id, key);
  const it = p.items.find((x) => x.id === itemId);
  if (!it) throw new Error('That item is already gone.');
  if (role !== 'owner' && it.memberToken !== member?.token) throw new Error('Only the teacher or the student who added it can remove it.');
  p.items = p.items.filter((x) => x.id !== itemId);
  save(s);
  return { ok: true as const };
}
