/**
 * Ripple simulation engine (v2).
 *
 * Pipeline:
 *   1. analyze()    Read the decision: topics, mitigations, all-or-nothing wording,
 *                   whether it lifts a rule, the setting, and the closest
 *                   well-known policy ("anchor").
 *   2. start        Pick a realistic starting point: a published poll when one
 *                   matches, a labeled estimate otherwise, then adjust for wording.
 *   3. score        Each persona weighs the decision by its values and by its own
 *                   stake in it (a student, a parent, a business owner…).
 *   4. calibrate    Shift everyone equally so day-one support in the anchor's
 *                   population matches the starting point. Group differences stay.
 *   5. crowd        Spawn N agents and let opinions spread between neighbors over
 *                   four moments (Day 1 → Year 1).
 *   6. report       Crosstabs, voices, a town hall, and fixes whose lift is measured
 *                   by re-running the model with the fix applied.
 *
 * Everything is deterministic for a given decision, so the same question always
 * produces the same report. The engine runs on the server and in the browser.
 */
import { ANCHORS, type Anchor, type AnchorVariant, type Line } from './anchors';
import { ALL_VALUES, MITIGATIONS, NEGATIVE_WORDS, POSITIVE_WORDS, TOPICS } from './lexicon';
import { GENERIC_LINES, LOSE, PERSONAS, SCOPE_META, VALUE_LABELS, WIN_OVER, WIN_OVER_PERSONAL, type Persona } from './personas';
import type {
  Analysis,
  CrowdAgent,
  DecisionInput,
  GroupSentiment,
  PersonaReaction,
  RealityCheck,
  Recommendation,
  Role,
  Scope,
  ScopeChoice,
  Signal,
  SimulationResult,
  SimulationSummary,
  Stance,
  ThemeInsight,
  TimelinePoint,
  TownHallMessage,
  Value,
  ValueMap,
} from './types';

export const ENGINE_VERSION = '2.0.0';

export const TIMELINE_STEPS = [
  { label: 'Day 1', sublabel: 'The announcement' },
  { label: 'Week 1', sublabel: 'Word spreads' },
  { label: 'Month 1', sublabel: 'Routines adjust' },
  { label: 'Year 1', sublabel: 'The new normal' },
];

/** Opinion above this counts as support, below its negative counts as opposition. */
export const STANCE_THRESHOLD = 0.15;

// ───────────────────────── random ─────────────────────────

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const round = (x: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(x * f) / f;
};
const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length) % arr.length];

/** Standard normal CDF (Abramowitz & Stegun 7.1.26). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// ───────────────────────── text ─────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

interface TextIndex {
  tokens: string[];
  tokenSet: Set<string>;
  padded: string;
}

function indexText(text: string): TextIndex {
  const norm = normalize(text);
  const tokens = norm.split(/[^a-z0-9]+/).filter(Boolean);
  return {
    tokens,
    tokenSet: new Set(tokens),
    padded: ' ' + norm.replace(/[^a-z0-9 .'$\-éè:]/g, ' ').replace(/\s+/g, ' ') + ' ',
  };
}

function matchKeyword(kw: string, idx: TextIndex): string | null {
  if (kw === '=$') return idx.padded.includes('$') ? '$' : null;
  if (kw.startsWith('=')) {
    const w = kw.slice(1);
    return idx.tokenSet.has(w) ? w : null;
  }
  if (/[^a-z0-9]/.test(kw)) return idx.padded.includes(' ' + kw) ? kw : null;
  const t = idx.tokens.find((tok) => tok.startsWith(kw));
  return t ?? null;
}

const VERBS = new Set(
  (
    'ban build start add close move quit raise make require switch replace cut open create launch introduce allow remove ' +
    'increase lower hire adopt buy take join drop sell offer give extend shorten lengthen cancel end merge eliminate install ' +
    'plant paint expand reduce implement provide fund rename relocate convert transform turn let shift change stop begin go ' +
    'apply study travel learn get become rent lease invest spend save attend skip accept decline transfer enroll enlist pursue ' +
    'leave stay keep host hold approve pass legalize restrict limit enforce mandate charge pay double triple cap freeze partner ' +
    'outsource automate digitize publish rebrand discontinue phase rezone demolish renovate upgrade put run plan try use tell ' +
    'ask propose marry date break adopt bring replace serve teach train ditch scrap delay postpone push hire fire lay tear ' +
    'require prohibit mandate permit cover subsidize waive forgive grant expand restore return block close build reopen ' +
    'allow let offer require host celebrate rename redesign rewrite publish post share stream sign apply commit choose pick ' +
    'live work drive bike walk sleep eat wake skip drop'
  ).split(/\s+/),
);

const IRREGULAR: Record<string, string> = {
  ban: 'banning', cut: 'cutting', quit: 'quitting', shut: 'shutting', put: 'putting', get: 'getting', stop: 'stopping',
  drop: 'dropping', plan: 'planning', run: 'running', swap: 'swapping', set: 'setting', let: 'letting', begin: 'beginning',
  admit: 'admitting', ship: 'shipping', skip: 'skipping', cap: 'capping', see: 'seeing', be: 'being', lie: 'lying',
  die: 'dying', tie: 'tying', scrap: 'scrapping', commit: 'committing', permit: 'permitting', submit: 'submitting',
  lay: 'laying', pay: 'paying', stay: 'staying', play: 'playing', delay: 'delaying', ditch: 'ditching',
};

function gerund(v: string): string {
  if (IRREGULAR[v]) return IRREGULAR[v];
  if (v.endsWith('ie')) return v.slice(0, -2) + 'ying';
  if (v.endsWith('ee') || v.endsWith('ye') || v.endsWith('oe')) return v + 'ing';
  if (v.endsWith('e')) return v.slice(0, -1) + 'ing';
  return v + 'ing';
}

const ORG =
  '(?:council|board|district|city|town|school|county|state|government|company|team|club|class|administration|mayor|principal|' +
  'family|business|store|shop|community|students|parents|department|staff|country|nation|congress|legislature|university|' +
  'college|library|church|neighborhood|hoa|pta|league|restaurant|cafe|café|bakery|startup|firm|organization|nonprofit|' +
  'leaders|officials|government|village|park|band|group)';

const STRIP: RegExp[] = [
  /^(?:decision|idea|proposal|question|plan)\s*:\s*/i,
  new RegExp(`^(?:should|could|would|can|will|do|does|must|shall)\\s+(?:i|we|you|they|it|he|she|(?:the|our|my|this|your)\\s+(?:[\\w'-]+\\s+){0,2}${ORG}s?)\\s+`, 'i'),
  /^(?:i'?m|i am|we'?re|we are)\s+(?:thinking\s+(?:about|of)|considering|planning\s+(?:to|on)|going\s+to|about\s+to|debating(?:\s+whether\s+to)?|deciding\s+(?:whether|if)\s+(?:to|i\s+should|we\s+should)|trying\s+to\s+decide\s+(?:whether|if)\s+(?:to|i\s+should|we\s+should))\s+/i,
  /^(?:i|we)\s+(?:want|plan|hope|need|intend|would\s+like|'d\s+like)\s+to\s+/i,
  /^(?:i|we)\s+(?:should|could|might|will|must|may)\s+/i,
  /^(?:what\s+if|how\s+about|maybe)\s+(?:i|we|they|you)?\s*/i,
  /^(?:should|could|would|will)\s+/i,
  /^(?:whether|if)\s+(?:to|i\s+should|we\s+should)\s+/i,
  /^(?:let'?s|lets)\s+/i,
  /^to\s+/i,
];

/** Words that are only capitalized because they start the sentence. */
const COMMON_START = new Set(
  ('a an the this that these those our my your their his her its more less new free all every each no longer shorter later ' +
    'earlier mandatory optional school city town public local healthier cheaper better smaller bigger universal weekly daily ' +
    'monthly year-round extra fewer stricter later-start one two three four five some any another').split(' '),
);

const FLIP: Record<string, string> = {
  my: 'your', me: 'you', i: 'you', "i'm": "you're", im: "you're", mine: 'yours', myself: 'yourself', "i've": "you've", "i'll": "you'll",
};

/** Turn a free-form decision into a short phrase people can say in a sentence. */
export function extractPhrase(decision: string, scope: Scope): { phrase: string; selfPhrase: string } {
  const fallback = scope === 'personal' ? 'this idea' : 'this plan';
  let text = decision.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const startsWithModal = /^(should|could|would|can|will|do|does|must|shall)\b/i.test(text);
  for (let pass = 0; pass < 3; pass++) {
    for (const re of STRIP) text = text.replace(re, '');
  }
  text = text.replace(/[?.!]+$/g, '').trim();

  // Cut long phrases at the first clause boundary.
  const clause = text.split(/[,;]|:(?!\d)|\s(?:because|so that|so|in order to|which|since|instead of|rather than)\s/i)[0].trim();
  if (clause.split(' ').length >= 2) text = clause;

  let words = text.split(' ').filter(Boolean);
  if (!words.length) return { phrase: fallback, selfPhrase: fallback };

  // "Lincoln High should start school later" → "start school later".
  const modalAt = words.slice(0, 6).findIndex((w, j) => j > 0 && /^(should|must|will|could|needs?|ought|wants?|plans?)$/i.test(w));
  if (modalAt > 0) {
    let rest = words.slice(modalAt + 1);
    if (/^to$/i.test(rest[0] ?? '')) rest = rest.slice(1);
    if (rest.length && VERBS.has(rest[0].toLowerCase())) words = rest;
  }
  // "Should Lincoln High start school later?" → find the verb in the first few words.
  if (startsWithModal && !VERBS.has(words[0].toLowerCase())) {
    const i = words.slice(0, 5).findIndex((w, j) => j > 0 && VERBS.has(w.toLowerCase()));
    if (i > 0) words = words.slice(i);
  }

  const first = words[0].toLowerCase();
  if (VERBS.has(first)) words[0] = gerund(first);
  else if (COMMON_START.has(first) || /[-\d]/.test(first)) words[0] = first;

  if (words.length > 13) return { phrase: fallback, selfPhrase: fallback };

  const selfPhrase = words.join(' ');
  const phrase =
    scope === 'personal'
      ? words.map((w) => {
          const key = w.toLowerCase();
          return FLIP[key] ?? w;
        }).join(' ')
      : selfPhrase;
  return { phrase, selfPhrase };
}

const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lowerFirst = (s: string) => (s && !/^I\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const fill = (tpl: string, phrase: string) =>
  tpl.replace(/\{Phrase\}/g, capFirst(phrase)).replace(/\{phrase\}/g, phrase).replace(/\.\.(?!\.)/g, '.').replace(/\.\?/g, '?');
/** Third person → first person, for spoken lines in the town hall. */
const firstPerson = (s: string) => s.replace(/\bthey\b/g, 'I').replace(/\bthem\b/g, 'me').replace(/\btheir\b/g, 'my');

// ───────────────────────── analysis ─────────────────────────

/** "Lift the ban on…", "repeal the curfew", "stop requiring…" */
const LIFT_RE =
  /\b(lift|lifting|end|ending|repeal|repealing|remove|removing|reverse|reversing|overturn|overturning|scrap|scrapping|undo|undoing|drop|dropping|cancel|canceling|cancelling|get rid of|relax|relaxing|loosen|loosening)\b(?:\s+[\w'-]+){0,3}?\s+(ban|bans|restriction|restrictions|rule|rules|requirement|requirements|mandate|mandates|prohibition|curfew|limit|limits)\b/;
const NEG_RE = /\b(don'?t|do not|stop|no longer|never|shouldn'?t|should not|not)\s+(ban|banning|require|requiring|restrict|restricting|prohibit|prohibiting|limit|limiting|mandate|mandating)\b/;
/** Quantifiers that widen a rule. Time spans ("the entire school day") describe a variant, not extremity. */
const QUANT_RE = /\b(all|every|any|entire|entirely|whole|total|totally|completely|everyone|everybody|anyone)\b(?!\s+(?:day|school day|week|weekend|year|semester|class|period|time|times|of the time))/g;
const ABSOLUTE_RE = /\b(forever|permanent|permanently|always|never|zero tolerance|outright|at all times|no exceptions|without exception)\b|100\s?%/g;
const IMMEDIATE_RE = /\b(immediately|overnight|tomorrow|right away|effective immediately|next week|starting monday)\b/;

const BURDEN_TOPICS = new Set(['restrict', 'closure', 'cost-up', 'environment-harm']);

const MITIGATION_LOGIT: Record<string, { d: number; label: string }> = {
  pilot: { d: 0.35, label: 'Starts with a pilot or gradual phase-in' },
  optional: { d: 0.4, label: 'Includes an opt-out or a choice' },
  support: { d: 0.35, label: 'Helps people with the cost' },
  input: { d: 0.25, label: 'Asks the people affected first' },
  training: { d: 0.15, label: 'Comes with training and support' },
  safeguards: { d: 0.25, label: 'Adds safeguards and oversight' },
};

interface AnchorMatch {
  anchor: Anchor;
  variant?: AnchorVariant;
  flipped: boolean;
}

interface FullAnalysis {
  analysis: Analysis;
  idx: TextIndex;
  norm: string;
  match: AnchorMatch | null;
  burden: boolean;
  /** Extremity that actually counts (0 when there is no burden, or when it is inherent to the anchor). */
  effExtremity: number;
  extremeWords: string[];
  restricted: boolean;
  immediate: boolean;
  pct: number | null;
  topicCount: number;
}

function anchorKeywordsMatch(a: Anchor, idx: TextIndex, restrictHit: boolean): boolean {
  for (const g of a.all) {
    if (g === '@restrict') {
      if (!restrictHit) return false;
      continue;
    }
    if (!g.some((kw) => matchKeyword(kw, idx))) return false;
  }
  return !(a.none ?? []).some((kw) => matchKeyword(kw, idx));
}

function findAnchor(idx: TextIndex, scope: Scope, restrictHit: boolean, lifted: boolean): AnchorMatch | null {
  for (const anchor of ANCHORS) {
    if (!anchor.scopes.includes(scope)) continue;
    if (!anchorKeywordsMatch(anchor, idx, restrictHit)) continue;
    const variant = anchor.variants?.find((v) => v.when.some((kw) => matchKeyword(kw, idx)));
    return { anchor, variant, flipped: lifted && anchor.all.includes('@restrict') };
  }
  return null;
}

export function analyze(decision: string, scopeChoice: ScopeChoice = 'auto'): Analysis {
  return analyzeFull(decision, scopeChoice).analysis;
}

function analyzeFull(decision: string, scopeChoice: ScopeChoice = 'auto'): FullAnalysis {
  const idx = indexText(decision);
  const norm = normalize(decision);
  const lifted = LIFT_RE.test(norm) || NEG_RE.test(norm);
  const signals: Signal[] = [];
  const impacts: Record<Value, number> = Object.fromEntries(ALL_VALUES.map((v) => [v, 0])) as Record<Value, number>;
  const scopeScore: Record<Scope, number> = { personal: 0, school: 0, community: 0, business: 0 };
  const allowRule = TOPICS.find((t) => t.id === 'allow')!;
  let change = 0.15;
  let polar = 0.15;
  let topicCount = 0;
  let restricted = false;

  for (const topic of TOPICS) {
    const matches = [...new Set(topic.keywords.map((kw) => matchKeyword(kw, idx)).filter((m): m is string => !!m))];
    if (!matches.length) continue;
    let rule = topic;
    if (topic.id === 'restrict') {
      restricted = true;
      // Undoing a ban is the opposite of a ban.
      if (lifted) rule = { ...allowRule, label: 'Undoing a rule' };
    }
    if (rule.id === 'allow' && signals.some((s) => s.id === 'allow')) continue;
    const strength = Math.min(1.25, 0.8 + 0.2 * matches.length);
    signals.push({ id: rule.id, label: rule.label, matches, kind: 'topic' });
    if (Object.keys(rule.impacts).length) topicCount++;
    for (const [v, amt] of Object.entries(rule.impacts) as [Value, number][]) impacts[v] += amt * strength;
    change = Math.max(change, rule.change ?? 0);
    polar = Math.max(polar, rule.polar ?? 0);
    if (rule.scopeHint) scopeScore[rule.scopeHint] += matches.length * 1.5;
  }
  if (topicCount >= 3) change = Math.min(1, change + 0.1);
  for (const v of ALL_VALUES) impacts[v] = Math.tanh(impacts[v] * 1.15);

  for (const m of MITIGATIONS) {
    const matches = [...new Set(m.keywords.map((kw) => matchKeyword(kw, idx)).filter((x): x is string => !!x))];
    if (!matches.length) continue;
    signals.push({ id: m.id, label: m.label, matches, kind: 'mitigation' });
    for (const [v, f] of Object.entries(m.soften) as [Value, number][]) if (impacts[v] < 0) impacts[v] *= f;
    for (const [v, b] of Object.entries(m.boost ?? {}) as [Value, number][]) impacts[v] = clamp(impacts[v] + b);
    change *= m.changeFactor ?? 1;
    polar *= m.polarFactor ?? 1;
  }

  const pos = POSITIVE_WORDS.filter((w) => idx.tokens.some((t) => t.startsWith(w))).length;
  const neg = NEGATIVE_WORDS.filter((w) => idx.tokenSet.has(w)).length;
  const framing = clamp((pos - neg) * 0.04, -0.12, 0.12);

  if (/\b(i|i'm|im|me|my|myself|mine)\b/.test(norm)) scopeScore.personal += 2.5;
  if (/\b(we|our|us)\b/.test(norm)) scopeScore.community += 0.4;
  let weakDefault: Scope | null = null;
  for (const a of ANCHORS) {
    if (!a.hint && !a.weakHint) continue;
    if (!anchorKeywordsMatch(a, idx, restricted)) continue;
    if (a.hint) scopeScore[a.hint] += 3;
    if (a.weakHint && !weakDefault) weakDefault = a.weakHint;
  }
  // Phone and device bans are most often about school, but only assume that when nothing else says otherwise.
  const assumed = weakDefault && Object.values(scopeScore).every((v) => v === 0) ? weakDefault : null;
  if (assumed) scopeScore[assumed] += 1;

  let scope: Scope = 'community';
  let scopeWasDetected = false;
  if (scopeChoice !== 'auto') scope = scopeChoice;
  else {
    let best = 0;
    for (const s of ['school', 'business', 'personal', 'community'] as Scope[]) {
      if (scopeScore[s] > best) {
        best = scopeScore[s];
        scope = s;
      }
    }
    scopeWasDetected = best > 0;
  }

  const match = findAnchor(idx, scope, restricted, lifted);
  const ids = new Set(signals.map((s) => s.id));
  const burden = [...BURDEN_TOPICS].some((id) => ids.has(id)) && !lifted;

  const quantWords = norm.match(QUANT_RE) ?? [];
  const absWords = norm.match(ABSOLUTE_RE) ?? [];
  const quant = match?.anchor.inherentlyBroad ? 0 : Math.min(1, quantWords.length * 0.45);
  const absolute = Math.min(1, absWords.length * 0.45);
  const extremity = round(clamp(quant + absolute, 0, 1), 2);
  const effExtremity = burden ? extremity : 0;
  const extremeWords = [...new Set([...(match?.anchor.inherentlyBroad ? [] : quantWords), ...absWords])];

  change = clamp(change + 0.25 * effExtremity, 0, 1);
  polar = clamp(Math.max(polar, match?.anchor.polar ?? 0) + 0.2 * effExtremity, 0, 1);

  const pctMatch = norm.match(/(\d+(?:\.\d+)?)\s?(?:%|percent)/);
  const pct = pctMatch ? Number(pctMatch[1]) : null;

  const words = idx.tokens.length;
  const hasMitigation = signals.some((s) => s.kind === 'mitigation');
  const detail = clamp(0.12 + topicCount * 0.14 + (match ? 0.2 : 0) + Math.min(words, 30) / 70 + (hasMitigation ? 0.1 : 0), 0, 1);

  const tips: string[] = [];
  if (scopeChoice === 'auto' && assumed === scope)
    tips.push(`Ripple assumed you meant at ${scope}, where bans like this come up most often. Pick another setting if you meant somewhere else.`);
  else if (scopeChoice === 'auto' && !scopeWasDetected)
    tips.push('Ripple couldn’t tell who this affects, so it assumed your whole community. Pick a setting if you meant a school, a business or your own life.');
  if (effExtremity >= 0.4)
    tips.push(`All-or-nothing wording (“${extremeWords.join('”, “')}”) lowers support. Narrower versions usually do better.`);
  if (words < 6 && !match) tips.push('Add a little more: who does this affect, and when would it start?');
  if (topicCount === 0 && !match) tips.push('Name the topic so Ripple can read it: schools, parks, taxes, jobs, phones, transit…');
  const mentionsCost = signals.some((s) => ['cost-up', 'cost-down', 'support', 'pay'].includes(s.id));
  if (!mentionsCost && words >= 6 && scope !== 'personal' && !match) tips.push('Mention the cost, or who pays for it.');
  const mentionsTime = /\b(next|fall|spring|summer|winter|month|months|year|years|week|weeks|20\d\d|semester|starting|by)\b/.test(norm);
  if (!mentionsTime && words >= 6 && !match) tips.push('Add a timeline, like “starting next fall.”');

  const { phrase, selfPhrase } = extractPhrase(decision, scope);
  const analysis: Analysis = {
    scope,
    scopeWasDetected,
    phrase,
    selfPhrase,
    signals,
    impacts: Object.fromEntries(ALL_VALUES.filter((v) => Math.abs(impacts[v]) > 0.005).map((v) => [v, round(impacts[v], 3)])) as ValueMap,
    changeMagnitude: round(change, 3),
    polarizing: round(polar, 3),
    detail: round(detail, 2),
    framing,
    extremity,
    lifted,
    anchor: match
      ? { id: match.anchor.id, label: anchorLabel(match), basis: match.flipped ? 'estimate' : (match.variant?.basis ?? match.anchor.basis) }
      : undefined,
    tips: tips.slice(0, 2),
  };
  return { analysis, idx, norm, match, burden, effExtremity, extremeWords, restricted, immediate: IMMEDIATE_RE.test(norm), pct, topicCount };
}

/** Where a simulation of this decision would start (the poll or estimate), without running the crowd. */
export function startFor(decision: string, scopeChoice: ScopeChoice = 'auto'): RealityCheck['anchor'] {
  return startingPoint(analyzeFull(decision, scopeChoice)).anchor;
}

function anchorLabel(m: AnchorMatch) {
  const label = m.variant?.label ?? m.anchor.label;
  return m.flipped ? `Undoing: ${label.toLowerCase()}` : label;
}

// ───────────────────────── starting point ─────────────────────────

const logit = (p: number) => Math.log(p / (1 - p));
const logistic = (x: number) => 1 / (1 + Math.exp(-x));

const PUBLIC_WEIGHT: Record<Value, number> = {
  cost: 1, freedom: 0.85, safety: 0.7, wellbeing: 0.7, time: 0.55, stability: 0.5, equity: 0.45, community: 0.45,
  environment: 0.4, growth: 0.45, tradition: 0.3, innovation: 0.3,
};

interface Target {
  anchor: RealityCheck['anchor'];
  adjustments: { label: string; points: number }[];
  target: number;
}

function startingPoint(fa: FullAnalysis, calibration?: DecisionInput['calibration']): Target {
  const a = fa.analysis;
  let anchor: RealityCheck['anchor'];
  if (fa.match) {
    const { anchor: an, variant: v, flipped } = fa.match;
    const basis = v?.basis ?? an.basis;
    let support = v?.support ?? an.support;
    const source = basis === 'poll' ? (v?.source ?? an.source) : undefined;
    let note = v ? v.note : an.note;
    if (flipped) {
      support = clamp(90 - support, 5, 90);
      note = `Estimated as the mirror image of ${(v?.label ?? an.label).toLowerCase()}${source ? ` (${source.org}, ${source.year})` : ''}.`;
    }
    anchor = {
      id: an.id,
      label: anchorLabel(fa.match),
      support,
      basis: flipped ? 'estimate' : basis,
      population: v?.population ?? an.population ?? 'everyone',
      source: flipped ? undefined : source,
      note,
    };
  } else if (fa.topicCount === 0) {
    anchor = {
      id: 'low-stakes',
      label: 'A low-stakes or unfamiliar decision',
      support: 28,
      basis: 'model',
      population: 'everyone',
      note: 'Ripple found little that people would react strongly to, so most of the crowd stays undecided.',
    };
  } else {
    let appeal = 0;
    for (const v of ALL_VALUES) appeal += PUBLIC_WEIGHT[v] * (a.impacts[v] ?? 0);
    let L = 0.85 * appeal - 0.7 * a.changeMagnitude + 0.25;
    if (fa.restricted && !a.lifted && a.scope === 'community') L -= 0.5;
    if (a.scope === 'personal') L += 0.3;
    anchor = {
      id: 'model',
      label: 'Ripple’s own model',
      support: Math.round(logistic(clamp(L, -3.5, 3)) * 100),
      basis: 'model',
      population: 'everyone',
      note: 'No well-known poll matches this decision, so Ripple starts from its model of how people weigh costs, freedoms and benefits.',
    };
  }

  const shifts: { label: string; d: number }[] = [];
  if (fa.effExtremity > 0) shifts.push({ label: `All-or-nothing wording (“${fa.extremeWords.join('”, “')}”)`, d: -1.15 * fa.effExtremity });
  if (fa.immediate && fa.burden) shifts.push({ label: 'No time to adjust', d: -0.3 });
  if (fa.pct != null && a.signals.some((s) => s.id === 'cost-up')) {
    if (fa.pct >= 10) shifts.push({ label: `A large increase (${fa.pct}%)`, d: -0.4 });
    else if (fa.pct <= 2) shifts.push({ label: `A small increase (${fa.pct}%)`, d: 0.15 });
  }
  for (const s of a.signals) if (s.kind === 'mitigation' && MITIGATION_LOGIT[s.id]) shifts.push(MITIGATION_LOGIT[s.id]);
  if (Math.abs(a.framing) >= 0.04) shifts.push({ label: a.framing > 0 ? 'Hopeful wording' : 'Heavy-handed wording', d: a.framing * 3 });

  let p = clamp(anchor.support / 100, 0.02, 0.97);
  const adjustments: { label: string; points: number }[] = [];
  for (const s of shifts) {
    const next = clamp(logistic(logit(p) + s.d), 0.02, 0.97);
    const points = Math.round((next - p) * 100);
    if (points !== 0) adjustments.push({ label: s.label, points });
    p = next;
  }
  const cal = fa.match ? calibration?.[anchor.id] : undefined;
  if (cal && cal.points) {
    const next = clamp(p + cal.points / 100, 0.02, 0.97);
    adjustments.push({ label: `Calibrated with ${cal.surveys} real surveys (${cal.answers.toLocaleString('en-US')} answers)`, points: Math.round((next - p) * 100) });
    p = next;
  }
  return { anchor, adjustments, target: p };
}

// ───────────────────────── scoring ─────────────────────────

const THETA = Math.atanh(STANCE_THRESHOLD) / 1.15;

interface Scored {
  persona: Persona;
  fundamentals: number;
  stake: number;
  stakeRole: Role | null;
  shock: number;
  score: number;
  contributions: Partial<Record<Value, number>>;
  valueWeight: number;
}

function stakeFor(p: Persona, match: AnchorMatch | null): { stake: number; role: Role | null } {
  if (!match) return { stake: 0, role: null };
  const vals = p.roles
    .map((r) => ({ r, s: match.anchor.stakes[r] }))
    .filter((x): x is { r: Role; s: number } => x.s !== undefined)
    .sort((x, y) => Math.abs(y.s) - Math.abs(x.s));
  if (!vals.length) return { stake: 0, role: null };
  // Self-interest matters, but people also weigh the bigger picture: damp it so no group is unanimous.
  const s = 0.65 * clamp(vals[0].s + 0.3 * vals.slice(1).reduce((t, x) => t + x.s, 0), -0.9, 0.9);
  return { stake: match.flipped ? -s : s, role: vals[0].r };
}

function scorePersona(p: Persona, fa: FullAnalysis, noise: number): Scored {
  const a = fa.analysis;
  let raw = 0;
  let absW = 0;
  const contributions: Partial<Record<Value, number>> = {};
  for (const v of ALL_VALUES) {
    const w = p.values[v] ?? 0;
    absW += Math.abs(w);
    let c = w * (a.impacts[v] ?? 0);
    if (c < 0) c *= 1 + 0.6 * fa.effExtremity;
    if (Math.abs(c) > 0.001) contributions[v] = c;
    raw += c;
  }
  const valueWeight = fa.match ? 0.6 : 1;
  const { stake, role } = stakeFor(p, fa.match);
  const fundamentals = (valueWeight * raw) / Math.max(1.1, absW * 0.42) + stake + a.framing + noise;
  // Change-averse people react badly to disruption at first; change-seekers enjoy it.
  const shock = (0.3 - p.changeAversion) * a.changeMagnitude * 0.6;
  return { persona: p, fundamentals, stake, stakeRole: role, shock, score: Math.tanh((fundamentals + shock) * 1.15), contributions, valueWeight };
}

function stanceOf(score: number): Stance {
  if (score > 0.5) return 'strong-support';
  if (score > STANCE_THRESHOLD) return 'support';
  if (score >= -STANCE_THRESHOLD) return 'neutral';
  if (score >= -0.5) return 'oppose';
  return 'strong-oppose';
}

function agentSigma(a: Analysis) {
  return 0.4 + 0.14 * a.polarizing;
}

function inPopulation(p: Persona, pop: RealityCheck['anchor']['population']): boolean {
  const adult = !p.roles.some((r) => r === 'student' || r === 'teen' || r === 'sibling') && (p.age >= 18 || p.age === 0);
  if (pop === 'adults') return adult;
  if (pop === 'parents') return p.roles.includes('parent');
  return true;
}

function populationWeights(personas: Persona[], shares: number[], pop: RealityCheck['anchor']['population']): number[] {
  let w = personas.map((p, i) => (inPopulation(p, pop) ? shares[i] : 0));
  if (!w.some((x) => x > 0) && pop === 'parents') w = personas.map((p, i) => (inPopulation(p, 'adults') ? shares[i] : 0));
  if (!w.some((x) => x > 0)) w = shares.slice();
  return w;
}

function expectedSupport(scored: Scored[], weights: number[], delta: number, sigma: number) {
  let tot = 0;
  let s = 0;
  scored.forEach((x, i) => {
    if (!weights[i]) return;
    tot += weights[i];
    s += weights[i] * (1 - normCdf((THETA - (x.fundamentals + x.shock + delta)) / sigma));
  });
  return tot ? s / tot : 0;
}

/** Shift everyone's lean by the same amount so the population's support hits the target. */
function calibrate(scored: Scored[], weights: number[], target: number, sigma: number): number {
  let lo = -4;
  let hi = 4;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (expectedSupport(scored, weights, mid, sigma) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

interface Prepared {
  decision: string;
  fa: FullAnalysis;
  personas: Persona[];
  shares: number[];
  scored: Scored[];
  sigma: number;
  start: Target;
  popWeights: number[];
  noises: number[];
  seed: number;
  mix?: Record<string, number>;
}

function prepare(input: DecisionInput, noisesOverride?: number[]): Prepared {
  const decision = (input.decision ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!decision) throw new Error('Describe the decision you want to simulate.');
  const fa = analyzeFull(decision, input.scope ?? 'auto');
  const scope = fa.analysis.scope;
  const personas = PERSONAS[scope];
  const seed = hashString(normalize(decision) + '|' + scope);
  const rng = mulberry32(seed);
  const noises = noisesOverride ?? personas.map(() => (rng() - 0.5) * 0.2);
  const scored = personas.map((p, i) => scorePersona(p, fa, noises[i]));
  // Low-stakes decisions stir weaker feelings, so opinions bunch up near "undecided".
  const lowStakes = fa.topicCount === 0 && !fa.match;
  const sigma = agentSigma(fa.analysis) * (lowStakes ? 0.45 : 1);
  if (lowStakes) for (const s of scored) s.shock *= 0.4;
  const start = startingPoint(fa, input.calibration);

  // Calibrate on a typical room, then apply the user's mix of who's in it.
  const typical = personas.map((p) => p.share);
  const popTypical = populationWeights(personas, typical, start.anchor.population);
  const delta = calibrate(scored, popTypical, start.target, sigma);
  for (const s of scored) {
    s.fundamentals += delta;
    s.score = Math.tanh((s.fundamentals + s.shock) * 1.15);
  }
  const mixed = personas.map((p) => p.share * clamp(input.mix?.[p.id] ?? 1, 0, 4));
  const total = mixed.reduce((t, x) => t + x, 0) || 1;
  const shares = mixed.map((x) => x / total);
  return { decision, fa, personas, shares, scored, sigma, start, popWeights: populationWeights(personas, shares, start.anchor.population), noises, seed, mix: input.mix };
}

/** Day-one support and net support (points), estimated analytically without running the crowd. */
function quickStats(input: DecisionInput, noises?: number[]): { net: number; support: number } {
  const pr = prepare(input, noises);
  let net = 0;
  let support = 0;
  pr.scored.forEach((s, i) => {
    const m = s.fundamentals + s.shock;
    const sup = 1 - normCdf((THETA - m) / pr.sigma);
    const opp = normCdf((-THETA - m) / pr.sigma);
    net += pr.shares[i] * (sup - opp);
    support += pr.shares[i] * sup;
  });
  return { net: net * 100, support: support * 100 };
}

// ───────────────────────── crowd ─────────────────────────

function buildCrowd(scored: Scored[], shareList: number[], a: Analysis, n: number, rng: () => number, sigma: number) {
  // Largest-remainder allocation of agents to personas.
  const raw = shareList.map((s) => s * n);
  const counts = raw.map(Math.floor);
  let left = n - counts.reduce((s, c) => s + c, 0);
  raw
    .map((r, i) => ({ i, r: r - Math.floor(r) }))
    .sort((x, y) => y.r - x.r)
    .forEach(({ i }) => {
      if (left > 0) {
        counts[i]++;
        left--;
      }
    });

  // Sunflower (phyllotaxis) layout gives an even disc; a twisted angle key groups
  // each persona into a curved "neighborhood" arm.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = Array.from({ length: n }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / n);
    const t = i * golden;
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    const ang = (Math.atan2(y, x) + r * 2.2 + Math.PI * 4) % (Math.PI * 2);
    return { x, y, ang };
  });
  const order = pts.map((_, i) => i).sort((i, j) => pts[i].ang - pts[j].ang);
  const owner = new Array<number>(n);
  let k = 0;
  counts.forEach((c, pi) => {
    for (let j = 0; j < c; j++) owner[order[k++]] = pi;
  });
  // Mix neighborhoods a little: people don't live in perfect bubbles.
  for (let m = 0; m < n * 0.14; m++) {
    const i = Math.floor(rng() * n);
    const j = Math.floor(rng() * n);
    [owner[i], owner[j]] = [owner[j], owner[i]];
  }

  // k nearest neighbors (brute force is fine for n ≤ 2000).
  const K = 7;
  const neighbors: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const best: { j: number; d: number }[] = [];
    const xi = pts[i].x;
    const yi = pts[i].y;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pts[j].x - xi;
      const dy = pts[j].y - yi;
      const d = dx * dx + dy * dy;
      if (best.length < K) {
        best.push({ j, d });
        best.sort((u, v) => u.d - v.d);
      } else if (d < best[K - 1].d) {
        best[K - 1] = { j, d };
        best.sort((u, v) => u.d - v.d);
      }
    }
    neighbors[i] = best.map((b) => b.j);
  }

  const fund = new Float64Array(n);
  const shock = new Float64Array(n);
  let o = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = scored[owner[i]];
    fund[i] = s.fundamentals + gaussian(rng) * sigma;
    shock[i] = s.shock * (0.5 + rng());
    o[i] = clamp(Math.tanh((fund[i] + shock[i]) * 1.15));
  }

  const history: Float64Array[] = [o.slice()];
  const decay = [1, 0.7, 0.4, 0.15];
  const confidence = 0.95 - 0.5 * a.polarizing;
  for (let step = 1; step < decay.length; step++) {
    for (let iter = 0; iter < 3; iter++) {
      const next = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const target = Math.tanh((fund[i] + shock[i] * decay[step]) * 1.15);
        let v = o[i] + (target - o[i]) * 0.35;
        let sum = 0;
        let cnt = 0;
        for (const j of neighbors[i]) {
          if (Math.abs(o[j] - o[i]) < confidence) {
            sum += o[j];
            cnt++;
          }
        }
        if (cnt) v += (sum / cnt - v) * 0.22;
        // Echo chambers: on divisive topics, strong views harden.
        v += Math.sign(v) * 0.05 * a.polarizing * (1 - Math.abs(v)) * (Math.abs(v) > 0.3 ? 1 : 0);
        next[i] = clamp(v);
      }
      o = next;
    }
    history.push(o.slice());
  }

  const agents: CrowdAgent[] = Array.from({ length: n }, (_, i) => ({
    p: owner[i],
    x: round(pts[i].x, 3),
    y: round(pts[i].y, 3),
    o: history.map((h) => round(h[i], 2)),
  }));
  return { agents, history, owner };
}

function shares(values: ArrayLike<number>, mask?: (i: number) => boolean) {
  let s = 0;
  let o = 0;
  let c = 0;
  for (let i = 0; i < values.length; i++) {
    if (mask && !mask(i)) continue;
    c++;
    if (values[i] > STANCE_THRESHOLD) s++;
    else if (values[i] < -STANCE_THRESHOLD) o++;
  }
  if (!c) return { support: 0, neutral: 0, oppose: 0, count: 0 };
  const support = round((s / c) * 100);
  const oppose = round((o / c) * 100);
  return { support, oppose, neutral: 100 - support - oppose, count: c };
}

// ───────────────────────── recommendations ─────────────────────────

interface FixText {
  title: string;
  detail: string;
  modifier: string;
}
interface Fix extends FixText {
  id: string;
  mitigation: string;
  personal?: FixText;
  business?: FixText;
}

const FIXES: Record<Value, Fix> = {
  cost: {
    id: 'cost', mitigation: 'support', title: 'Show the math',
    detail: 'Publish a plain-language cost breakdown and cap what any one household pays. Cost-sensitive groups want numbers, not promises.',
    modifier: ', with a published cost breakdown, a cap on household costs, and financial aid for low-income families',
    personal: { title: 'Build a runway first', detail: 'Save an emergency fund before you leap. The money-minded people in your life relax when there is a cushion.', modifier: ', after saving up an emergency fund first' },
    business: { title: 'Explain the why', detail: 'Tell customers exactly where the money goes, and soften the change with a loyalty reward for regulars.', modifier: ', with a clear explanation to customers and a loyalty reward for regulars' },
  },
  stability: {
    id: 'stability', mitigation: 'pilot', title: 'Start with a pilot',
    detail: 'Run a small pilot first, then decide on a full rollout. A gradual phase-in takes the edge off for people who value stability.',
    modifier: ', starting with a small pilot and a gradual phase-in',
    personal: { title: 'Do a trial run', detail: 'Test it before fully committing: a summer, a semester, a part-time version. A trial run is easier for everyone to say yes to.', modifier: ', starting with a trial run before fully committing' },
  },
  tradition: {
    id: 'tradition', mitigation: 'input', title: 'Keep what people love',
    detail: 'Name the traditions that stay the same, and invite long-time members to help shape what changes.',
    modifier: ', while keeping what people value most and asking long-time members for input',
    personal: { title: 'Keep your roots', detail: 'Show how you will stay connected to family traditions and the people who matter. It answers the loudest worry.', modifier: ', while staying close to family and asking for their input' },
  },
  freedom: {
    id: 'freedom', mitigation: 'optional', title: 'Offer a choice',
    detail: 'Make it optional at first, or add clear exceptions. People resist rules they did not get to choose.',
    modifier: ', with an opt-out option for anyone who needs one',
  },
  safety: {
    id: 'safety', mitigation: 'safeguards', title: 'Lead with safeguards',
    detail: 'Share a safety plan reviewed by an independent group before launch, and publish how you will measure it.',
    modifier: ', with a safety plan and independent oversight',
  },
  equity: {
    id: 'equity', mitigation: 'support', title: 'Design for access',
    detail: 'Add a sliding scale, translation, and accessibility support so the benefits reach the people with the least.',
    modifier: ', with a sliding scale and accessibility support for those who need it most',
  },
  community: {
    id: 'community', mitigation: 'input', title: 'Ask before you act',
    detail: 'Run a survey and a listening session with the groups most affected. People who feel heard become collaborators.',
    modifier: ', after a survey and a listening session with the people affected',
    personal: { title: 'Talk it through first', detail: 'Sit down with the people closest to you before deciding. Asking for input turns worry into support.', modifier: ', after talking it through with family and asking for their input' },
  },
  time: {
    id: 'time', mitigation: 'pilot', title: 'Give people time',
    detail: 'Announce changes months in advance and adjust schedules, transit, and deadlines so nobody’s week falls apart.',
    modifier: ', announced months in advance with a gradual transition',
  },
  wellbeing: {
    id: 'wellbeing', mitigation: 'input', title: 'Bring in the experts',
    detail: 'Partner with health professionals and share what the research says about stress and well-being. Check in regularly.',
    modifier: ', guided by health experts with regular check-ins',
  },
  environment: {
    id: 'environment', mitigation: 'none', title: 'Shrink the footprint',
    detail: 'Add an environmental plan, such as offsets, recycling, or greener materials, and report on it publicly.',
    modifier: ', with an environmental plan to offset its footprint',
  },
  growth: {
    id: 'growth', mitigation: 'none', title: 'Spell out the upside',
    detail: 'Show who gains and when: jobs, skills, or opportunities, with a timeline people can hold you to.',
    modifier: ', with clear goals and a plan to create new opportunities',
  },
  innovation: {
    id: 'innovation', mitigation: 'training', title: 'Train people first',
    detail: 'Offer training and hands-on support so people who are less comfortable with new tools are not left behind.',
    modifier: ', with training and support for everyone',
  },
};

/** Removes all-or-nothing words to suggest a narrower version of the same decision. */
function narrowed(decision: string): string | null {
  const out = decision
    .replace(/\b(forever|permanently|always|outright|at all times|with no exceptions|no exceptions|without exception|immediately|overnight)\b/gi, '')
    .replace(/\b(all|every|any|entire|entirely|whole|totally|completely)\s+(?!day\b|school day\b|week\b|year\b)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.?!])/g, '$1')
    .trim();
  return out && out.toLowerCase() !== decision.toLowerCase().trim() ? out : null;
}

function recommend(pr: Prepared, baseNet: number): Recommendation[] {
  const { fa, scored, shares: w, decision, noises } = pr;
  const scope = fa.analysis.scope;
  const recs: Recommendation[] = [];
  const stats = (d: string) => quickStats({ decision: d, scope, mix: pr.mix }, noises);

  // 1. Narrower versions of the same decision.
  const alts = [...(fa.match && !fa.match.flipped ? (fa.match.anchor.alternatives ?? []) : [])];
  const narrow = fa.effExtremity > 0 ? narrowed(decision) : null;
  if (narrow && !alts.some((x) => x.decision === narrow))
    alts.push({ title: 'Make it less absolute', detail: 'Drop the all-or-nothing wording. Rules with room for exceptions are far easier for people to accept.', decision: narrow });
  for (const alt of alts) {
    if (alt.decision.toLowerCase() === decision.toLowerCase()) continue;
    const st = stats(alt.decision);
    const lift = Math.round(st.net - baseNet);
    if (lift >= 3)
      recs.push({ id: `alt-${recs.length}`, title: alt.title, detail: alt.detail, target: 'Everyone, especially the most opposed', modifier: '', replace: alt.decision, projectedLift: lift, projectedSupport: Math.round(st.support) });
  }

  // 2. Add-ons that address the biggest reasons for opposition.
  const drive: Partial<Record<Value, number>> = {};
  const driveBy: Partial<Record<Value, { group: string; amt: number }[]>> = {};
  scored.forEach((s, i) => {
    const add = (v: Value, amt: number) => {
      if (amt <= 0) return;
      drive[v] = (drive[v] ?? 0) + w[i] * amt;
      (driveBy[v] ??= []).push({ group: s.persona.group, amt: w[i] * amt });
    };
    for (const [v, c] of Object.entries(s.contributions) as [Value, number][]) add(v, -c * s.valueWeight);
    add('stability', -s.shock);
    if (s.stake < 0) add('freedom', -s.stake * 0.3);
  });
  const used = new Set(fa.analysis.signals.filter((x) => x.kind === 'mitigation').map((x) => x.id));
  const candidates = (Object.keys(drive) as Value[]).sort((x, y) => (drive[y] ?? 0) - (drive[x] ?? 0));
  for (const fallback of ['community', 'stability'] as Value[]) if (!candidates.includes(fallback)) candidates.push(fallback);
  const seen = new Set<string>();
  let added = 0;
  for (const v of candidates) {
    if (added >= 3) break;
    const fix = FIXES[v];
    const key = fix.mitigation === 'none' ? fix.id : fix.mitigation;
    if (seen.has(key) || (fix.mitigation !== 'none' && used.has(fix.mitigation))) continue;
    const variant: FixText = (scope === 'personal' && fix.personal) || (scope === 'business' && fix.business) || fix;
    if (decision.toLowerCase().includes(variant.modifier.slice(2, 30).toLowerCase())) continue;
    const st = stats(decision.replace(/[.?!]+$/, '') + variant.modifier);
    const lift = Math.round(st.net - baseNet);
    if (lift < 1 && added >= 2) continue;
    seen.add(key);
    added++;
    const targets = (driveBy[v] ?? []).sort((x, y) => y.amt - x.amt).slice(0, 2).map((t) => t.group);
    recs.push({ id: fix.id, title: variant.title, detail: variant.detail, target: targets.length ? [...new Set(targets)].join(' & ') : 'Undecided people', modifier: variant.modifier, projectedLift: Math.max(1, lift), projectedSupport: Math.round(st.support) });
  }
  return recs.sort((x, y) => y.projectedLift - x.projectedLift).slice(0, 4);
}

// ───────────────────────── voices ─────────────────────────

const ROLE_NOUN: Record<Role, string> = {
  student: 'a student', teen: 'a teenager', parent: 'a parent', teacher: 'a teacher', admin: 'a school leader', counselor: 'a counselor',
  coach: 'a coach', elder: 'an older resident', worker: 'a worker', owner: 'a business owner', 'young-adult': 'a young adult',
  health: 'a health worker', activist: 'an advocate', taxpayer: 'a taxpayer', commuter: 'a commuter', family: 'family', friend: 'a friend',
  mentor: 'a mentor', partner: 'a partner', money: 'the money-minded one', 'future-self': 'your future self', customer: 'a customer',
  regular: 'a regular', employee: 'an employee', manager: 'a manager', investor: 'an investor', neighbor: 'a neighbor', creator: 'a creator',
  supplier: 'a supplier', grandparent: 'a grandparent', sibling: 'a sibling',
};

/** The persona's own words for this kind of decision, skipping phrasings someone else already used. */
function roleLine(p: Persona, match: AnchorMatch | null, key: keyof Line, used: Set<string>): { text: string; role: Role } | undefined {
  if (!match) return undefined;
  const lines = match.anchor.lines ?? {};
  // When a ban is lifted, a "pro" line about the ban is a "con" about lifting it.
  const k: keyof Line = match.flipped ? ({ pro: 'con', con: 'pro', win: 'lose', lose: 'win' } as const)[key] : key;
  if (match.flipped && (k === 'win' || k === 'lose')) return undefined;
  for (const r of p.roles) {
    const t = lines[r]?.[k];
    const options = t === undefined ? [] : Array.isArray(t) ? t : [t];
    const fresh = options.find((o) => !used.has(o));
    if (fresh) {
      used.add(fresh);
      return { text: fresh, role: r };
    }
  }
  return undefined;
}

function voice(s: Scored, score: number, fa: FullAnalysis, used: Set<string>): Omit<PersonaReaction, 'id' | 'name' | 'age' | 'role' | 'group' | 'hue' | 'initials' | 'share'> {
  const p = s.persona;
  const stance = stanceOf(score);
  const entries = Object.entries(s.contributions) as [Value, number][];
  const positives = entries.filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1]);
  const negatives = entries.filter(([, c]) => c < 0).sort((x, y) => x[1] - y[1]);
  let direction: 'pro' | 'con' =
    score > STANCE_THRESHOLD ? 'pro' : score < -STANCE_THRESHOLD ? 'con' : (s.stake || score) >= 0 ? 'pro' : 'con';
  let concernValue: Value = (direction === 'pro' ? positives[0]?.[0] : negatives[0]?.[0]) ?? (direction === 'pro' ? 'community' : 'stability');
  // Prefer a value this persona has a voice line for, if it is almost as important.
  if (!p.lines[concernValue]) {
    const alt = (direction === 'pro' ? positives : negatives).find(([v, c]) => p.lines[v] && Math.abs(c) > Math.abs(s.contributions[concernValue] ?? 0) * 0.5);
    if (alt) concernValue = alt[0];
  }
  const anchorLine = roleLine(p, fa.match, direction, used);
  const valueLine = (p.lines[concernValue] ?? GENERIC_LINES[concernValue])[direction];
  const reason = anchorLine?.text ?? valueLine;
  const concernLabel = anchorLine ? `What it means for them as ${ROLE_NOUN[anchorLine.role]}` : VALUE_LABELS[concernValue];
  if (!anchorLine && direction !== (score >= 0 ? 'pro' : 'con')) direction = score >= 0 ? 'pro' : 'con';

  const opener = {
    'strong-support': p.openers.strongSupport,
    support: p.openers.support,
    neutral: p.openers.neutral,
    oppose: p.openers.oppose,
    'strong-oppose': p.openers.strongOppose,
  }[stance];
  const changeMindType: 'win' | 'lose' = score > STANCE_THRESHOLD ? 'lose' : 'win';
  const persuade = changeMindType === 'win' ? (negatives[0]?.[0] ?? concernValue) : concernValue;
  // Prefer the value that moves this person, but never repeat a line someone else already said.
  const pickVariant = (table: Record<Value, string[]>) => {
    const order: Value[] = [persuade, ...(changeMindType === 'win' ? negatives : positives).map(([v]) => v), 'community', 'stability', 'time', 'equity'];
    for (const v of order) {
      const list = table[v];
      const start = hashString(p.id + v) % list.length;
      for (let i = 0; i < list.length; i++) {
        const t = list[(start + i) % list.length];
        if (!used.has(t)) {
          used.add(t);
          return t;
        }
      }
    }
    return table[persuade][0];
  };
  const personal = changeMindType === 'win' && fa.analysis.scope === 'personal' ? WIN_OVER_PERSONAL[persuade] : undefined;
  const changeMind =
    roleLine(p, fa.match, changeMindType, used)?.text ??
    (personal && !used.has(personal) ? (used.add(personal), personal) : pickVariant(changeMindType === 'win' ? WIN_OVER : LOSE));
  return {
    stance,
    score: round(score, 2),
    quote: `${fill(opener, fa.analysis.phrase)} ${reason}`,
    reason,
    concern: { value: concernValue, label: concernLabel, direction },
    changeMind,
    changeMindType,
  };
}

// ───────────────────────── main ─────────────────────────

export interface SimulateOptions {
  withRecommendations?: boolean;
}

export function simulate(input: DecisionInput, opts: SimulateOptions = {}): SimulationResult {
  const pr = prepare(input);
  const { decision, fa, personas, scored, shares: shareList, start } = pr;
  const analysis = fa.analysis;
  const scope = analysis.scope;
  const crowdSize = Math.round(clamp(input.crowdSize ?? 1000, 100, 2000));
  const rng = mulberry32(pr.seed ^ 0x9e3779b9);

  const { agents, history, owner } = buildCrowd(scored, shareList, analysis, crowdSize, rng, pr.sigma);

  // ── timeline
  const timeline: TimelinePoint[] = history.map((h, i) => {
    const s = shares(h);
    return { ...TIMELINE_STEPS[i], support: s.support, neutral: s.neutral, oppose: s.oppose, net: s.support - s.oppose };
  });
  const day1 = timeline[0];
  const year1 = timeline[timeline.length - 1];

  // ── groups (crosstabs at announcement)
  const groups: GroupSentiment[] = personas.map((p, pi) => {
    const s = shares(history[0], (i) => owner[i] === pi);
    return { personaId: p.id, group: p.group, hue: p.hue, support: s.support, neutral: s.neutral, oppose: s.oppose, net: s.support - s.oppose, count: s.count };
  });

  // ── reality check
  const inPop = personas.map((p) => inPopulation(p, start.anchor.population));
  const popAny = inPop.some((x, i) => x && groups[i].count > 0);
  const popShare = shares(history[0], (i) => (popAny ? inPop[owner[i]] : true));
  const reality: RealityCheck = {
    anchor: start.anchor,
    adjustments: start.adjustments,
    target: Math.round(start.target * 100),
    simulated: popShare.support,
  };

  // ── personas
  const groupMean = personas.map((_, pi) => {
    let sum = 0;
    let c = 0;
    for (let i = 0; i < history[0].length; i++)
      if (owner[i] === pi) {
        sum += history[0][i];
        c++;
      }
    return c ? sum / c : scored[pi].score;
  });
  // The people with the most at stake speak first, so they get the most specific lines.
  const used = new Set<string>();
  const voices: ReturnType<typeof voice>[] = new Array(scored.length);
  scored
    .map((s, pi) => ({ s, pi }))
    .sort((x, y) => Math.abs(y.s.stake) - Math.abs(x.s.stake))
    .forEach(({ s, pi }) => (voices[pi] = voice(s, clamp(groupMean[pi] * 0.6 + s.score * 0.4), fa, used)));
  const reactions: PersonaReaction[] = scored.map((s, pi) => {
    const p = s.persona;
    return {
      id: p.id,
      name: p.name,
      age: p.age,
      role: p.role,
      group: p.group,
      hue: p.hue,
      initials: p.name.replace(/^(Dr|Mr|Mrs|Ms|Coach|Grandpa)\.?\s+/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      share: round(shareList[pi], 3),
      ...voices[pi],
    };
  });

  // ── themes
  const importance: Partial<Record<Value, number>> = {};
  const lean: Partial<Record<Value, number>> = {};
  scored.forEach((s, i) => {
    const w = shareList[i];
    for (const [v, c] of Object.entries(s.contributions) as [Value, number][]) {
      importance[v] = (importance[v] ?? 0) + w * Math.abs(c);
      lean[v] = (lean[v] ?? 0) + w * c;
    }
    if (s.shock < 0) {
      importance.stability = (importance.stability ?? 0) + w * -s.shock * 0.6;
      lean.stability = (lean.stability ?? 0) + w * s.shock * 0.6;
    }
  });
  const maxImp = Math.max(0.0001, ...Object.values(importance).map((x) => x ?? 0));
  const themes: ThemeInsight[] = (Object.keys(importance) as Value[])
    .map((v) => ({
      value: v,
      label: VALUE_LABELS[v],
      weight: round((importance[v] ?? 0) / maxImp, 2),
      sentiment: round(clamp((lean[v] ?? 0) / Math.max(0.0001, importance[v] ?? 0)), 2),
    }))
    .filter((t) => t.weight >= 0.08)
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 6);

  // ── summary
  const net = day1.net;
  const verdict =
    net >= 35 ? 'Broad support' : net >= 12 ? 'Leaning support' : net > -12 ? 'Divided' : net > -35 ? 'Leaning against' : 'Strong opposition';
  const sortedGroups = [...groups].filter((g) => g.count > 0).sort((x, y) => y.net - x.net);
  const allies = sortedGroups.filter((g) => g.net >= 15).slice(0, 2);
  const resisters = [...sortedGroups].reverse().filter((g) => g.net <= -15).slice(0, 2);
  const join = (gs: GroupSentiment[]) => gs.map((g) => g.group.toLowerCase()).join(' and ');
  let headline: string;
  if (allies.length && resisters.length)
    headline = `${capFirst(join(allies))} are your strongest allies. ${capFirst(join(resisters))} will push back hardest.`;
  else if (allies.length) headline = `${capFirst(join(allies))} lead the support, and no group is strongly opposed.`;
  else if (resisters.length && sortedGroups.every((g) => g.net < 0)) headline = `Every group leans against it. ${capFirst(join(resisters))} are the most opposed.`;
  else if (resisters.length) headline = `${capFirst(join(resisters))} lead the opposition, and no group is strongly in favor.`;
  else headline = 'No group feels strongly yet. Most people are waiting to hear more.';

  const drift = year1.net - day1.net;
  const trajectory =
    drift >= 8
      ? `Support grows over time: net support climbs from ${signed(day1.net)} to ${signed(year1.net)} after a year as routines adjust.`
      : drift <= -8
        ? `Opposition hardens over time: net support falls from ${signed(day1.net)} to ${signed(year1.net)} as people dig in.`
        : `Opinions stay fairly steady: net support moves from ${signed(day1.net)} to ${signed(year1.net)} over a year.`;

  let strong = 0;
  let mean = 0;
  const h0 = history[0];
  for (let i = 0; i < h0.length; i++) {
    if (h0[i] < -0.5) strong++;
    mean += h0[i];
  }
  mean /= h0.length;
  let variance = 0;
  for (let i = 0; i < h0.length; i++) variance += (h0[i] - mean) ** 2;
  const std = Math.sqrt(variance / h0.length);
  const strongShare = strong / h0.length;

  const summary: SimulationSummary = {
    verdict,
    headline,
    support: day1.support,
    neutral: day1.neutral,
    oppose: day1.oppose,
    net,
    longTermNet: year1.net,
    trajectory,
    polarization: round(clamp((std - 0.28) / 0.32, 0, 1), 2),
    backlashRisk: strongShare > 0.26 ? 'High' : strongShare > 0.13 ? 'Moderate' : 'Low',
    confidence: analysis.detail >= 0.75 ? 'High' : analysis.detail >= 0.45 ? 'Medium' : 'Low',
    marginOfError: round(1.96 * Math.sqrt(0.25 / crowdSize) * 100, 1),
  };

  const recommendations = opts.withRecommendations === false ? [] : recommend(pr, quickStats({ decision, scope, mix: input.mix }, pr.noises).net);
  const townHall = buildTownHall(reactions, analysis, scope, summary, crowdSize, rng);

  return {
    id: pr.seed.toString(36) + Date.now().toString(36),
    version: ENGINE_VERSION,
    engine: 'heuristic-v2',
    decision,
    scope,
    crowdSize,
    createdAt: new Date().toISOString(),
    summary,
    analysis,
    personas: reactions,
    groups,
    timeline,
    themes,
    recommendations,
    townHall,
    crowd: agents,
    reality,
    mix: Object.fromEntries(
      personas
        .map((p) => [p.id, clamp(input.mix?.[p.id] ?? 1, 0, 4)] as const)
        .filter(([, v]) => v !== 1),
    ),
  };
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

const firstName = (name: string) => {
  const parts = name.split(' ');
  if (/^(Dr\.|Mr\.|Mrs\.|Ms\.|Coach)$/.test(parts[0])) return `${parts[0]} ${parts[parts.length - 1]}`;
  if (parts[0] === 'Grandpa' || parts[0] === 'Future') return name;
  return parts[0];
};

function buildTownHall(
  reactions: PersonaReaction[],
  a: Analysis,
  scope: Scope,
  summary: SimulationSummary,
  crowdSize: number,
  rng: () => number,
): TownHallMessage[] {
  const meta = SCOPE_META[scope];
  const msgs: TownHallMessage[] = [];
  const opening: Record<Scope, string> = {
    personal: `So… I've been thinking about ${a.selfPhrase}. What do you all honestly think?`,
    community: `Welcome, everyone. Tonight's agenda item: ${a.phrase}. Each speaker gets two minutes. Let's begin.`,
    school: `Okay, everyone, today's forum topic is ${a.phrase}. Raise your hand if you want to speak.`,
    business: `Thanks for joining. On the agenda: ${a.phrase}. Let's hear from everyone it affects.`,
  };
  const mod = (text: string): TownHallMessage => ({ speakerId: 'moderator', name: meta.moderator, role: meta.forum, hue: 40, initials: scope === 'personal' ? 'You' : '§', stance: 'moderator', text, agrees: 0 });
  msgs.push(mod(opening[scope]));

  const sorted = [...reactions].sort((x, y) => y.score - x.score);
  const used = new Set<string>();
  const take = (r?: PersonaReaction) => {
    if (!r || used.has(r.id)) return undefined;
    used.add(r.id);
    return r;
  };
  const top = take(sorted[0]);
  const bottom = take(sorted[sorted.length - 1]);
  const middle = take([...sorted].sort((x, y) => Math.abs(x.score) - Math.abs(y.score)).find((r) => !used.has(r.id)));
  const second = take(sorted.find((r) => !used.has(r.id)));
  const secondLow = take([...sorted].reverse().find((r) => !used.has(r.id)));

  const agreeFor = (r: PersonaReaction) => {
    if (scope === 'personal') return Math.floor(rng() * 4) + 1;
    const pct = r.score > STANCE_THRESHOLD ? summary.support : r.score < -STANCE_THRESHOLD ? summary.oppose : summary.neutral;
    return Math.max(1, Math.round(((crowdSize * pct) / 100) * (0.2 + 0.3 * rng())));
  };
  const say = (r: PersonaReaction, text: string, replyTo?: PersonaReaction) =>
    msgs.push({ speakerId: r.id, name: r.name, role: r.role, hue: r.hue, initials: r.initials, stance: r.stance, text, replyTo: replyTo?.name, agrees: agreeFor(r) });
  const sameSide = (x: PersonaReaction, y: PersonaReaction) => Math.sign(Math.round(x.score * 3)) === Math.sign(Math.round(y.score * 3));

  if (top) say(top, top.quote);
  if (bottom && top) {
    const lead = sameSide(top, bottom)
      ? pick([`I'm with ${firstName(top.name)}, mostly.`, `Building on what ${firstName(top.name)} said.`], rng)
      : pick([`I hear you, ${firstName(top.name)}. I see it differently.`, `With respect, ${firstName(top.name)}, that's easy to say.`, `${firstName(top.name)}, I'm going to push back.`], rng);
    say(bottom, `${lead} ${bottom.reason}`, top);
  }
  if (middle) say(middle, middle.quote);
  if (second && bottom) {
    const lead = sameSide(second, bottom)
      ? pick([`${firstName(bottom.name)} has a point.`, `I share ${firstName(bottom.name)}'s worry.`], rng)
      : pick([`${firstName(bottom.name)}, I get the worry. But look at it this way.`, `Fair point, ${firstName(bottom.name)}, but here's my side.`], rng);
    say(second, `${lead} ${second.reason}`, bottom);
  }
  if (secondLow) say(secondLow, secondLow.quote);
  if (bottom && bottom.score < STANCE_THRESHOLD) {
    say(bottom, `Here's what would change my mind: ${firstPerson(lowerFirst(bottom.changeMind))}`);
  }

  const counts = { for: 0, against: 0, unsure: 0 };
  reactions.forEach((r) => (r.score > STANCE_THRESHOLD ? counts.for++ : r.score < -STANCE_THRESHOLD ? counts.against++ : counts.unsure++));
  msgs.push(
    mod(
      scope === 'personal'
        ? `Okay. Around the table, that's ${counts.for} for, ${counts.against} against, and ${counts.unsure} unsure. Lots to think about. Thank you.`
        : `Thank you, everyone. Show of hands: ${summary.support}% for, ${summary.oppose}% against, ${summary.neutral}% still deciding.`,
    ),
  );
  return msgs.map((m) => ({ ...m, text: m.text.replace(/\.\.(?!\.)/g, '.') }));
}
