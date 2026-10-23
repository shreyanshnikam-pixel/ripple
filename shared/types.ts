// Shared types for the Ripple simulation engine.
// Both the Express API and the React client import from here, so the
// contract between them lives in one place.

export type Scope = 'personal' | 'school' | 'community' | 'business';
export type ScopeChoice = Scope | 'auto';

export type Stance = 'strong-support' | 'support' | 'neutral' | 'oppose' | 'strong-oppose';

/** The things people care about. Every persona weighs these differently. */
export type Value =
  | 'cost'
  | 'safety'
  | 'equity'
  | 'environment'
  | 'tradition'
  | 'innovation'
  | 'freedom'
  | 'community'
  | 'growth'
  | 'wellbeing'
  | 'stability'
  | 'time';

export type ValueMap = Partial<Record<Value, number>>;

export interface DecisionInput {
  decision: string;
  scope?: ScopeChoice;
  /** Number of simulated people in the crowd (100 – 2000). */
  crowdSize?: number;
  /** Who's in the room: multiplies a persona's share of the crowd (0 – 4, default 1). */
  mix?: Record<string, number>;
  /**
   * Set by the Ripple server only (never accepted from visitors): small, labeled corrections per topic,
   * learned from real surveys. See shared/calibration.ts.
   */
  calibration?: Record<string, { points: number; surveys: number; answers: number }>;
}

export type Role =
  | 'student' | 'teen' | 'parent' | 'teacher' | 'admin' | 'counselor' | 'coach' | 'elder' | 'worker' | 'owner'
  | 'young-adult' | 'health' | 'activist' | 'taxpayer' | 'commuter' | 'family' | 'friend' | 'mentor' | 'partner'
  | 'money' | 'future-self' | 'customer' | 'regular' | 'employee' | 'manager' | 'investor' | 'neighbor' | 'creator'
  | 'supplier' | 'grandparent' | 'sibling';

export interface PollSource {
  org: string;
  year: number;
  url: string;
  /** Plain-language description of what was measured. */
  finding: string;
}

/** Where a simulation's starting point came from. */
export interface RealityCheck {
  anchor: {
    id: string;
    label: string;
    /** Support (%) the anchor starts from, before adjustments. */
    support: number;
    basis: 'poll' | 'estimate' | 'model';
    /** Which part of the crowd the anchor describes. */
    population: 'adults' | 'parents' | 'everyone';
    source?: PollSource;
    note?: string;
  };
  adjustments: { label: string; points: number }[];
  /** Support (%) Ripple aims for in that population after adjustments. */
  target: number;
  /** Support (%) the simulated crowd actually showed in that population on day 1. */
  simulated: number;
}

export interface Signal {
  id: string;
  label: string;
  /** Words in the decision that triggered this signal. */
  matches: string[];
  kind: 'topic' | 'mitigation';
}

export interface Analysis {
  scope: Scope;
  scopeWasDetected: boolean;
  /** The decision as a short phrase, from other people's point of view. */
  phrase: string;
  /** The decision as a short phrase, in the decider's own words. */
  selfPhrase: string;
  signals: Signal[];
  impacts: ValueMap;
  /** 0 – 1. How much this decision disrupts the status quo. */
  changeMagnitude: number;
  /** 0 – 1. How likely the topic is to split people into camps. */
  polarizing: number;
  /** 0 – 1. How much detail the engine could read from the text. */
  detail: number;
  /** Small nudge from positive or negative wording (-0.12 – 0.12). */
  framing: number;
  /** 0 – 1. All-or-nothing wording such as "all", "every", "forever". */
  extremity: number;
  /** True when the decision undoes a ban or rule ("lift the ban on…"). */
  lifted: boolean;
  /** The best-matching well-known policy, if any (id + label). */
  anchor?: { id: string; label: string; basis: 'poll' | 'estimate' };
  tips: string[];
  /** For a decision typed in Spanish: the rough English Ripple read it as. */
  readAs?: string;
}

export interface PersonaReaction {
  id: string;
  name: string;
  age: number;
  role: string;
  group: string;
  hue: number;
  initials: string;
  stance: Stance;
  /** -1 (strongly against) to 1 (strongly for). */
  score: number;
  quote: string;
  /** The reason in their own words (the second half of the quote). */
  reason: string;
  concern: { value: Value; label: string; direction: 'pro' | 'con' };
  changeMind: string;
  /** 'win' = what would win them over, 'lose' = what would turn them against it. */
  changeMindType: 'win' | 'lose';
  /** Share of the simulated crowd this archetype represents (0 – 1). */
  share: number;
}

export interface GroupSentiment {
  personaId: string;
  group: string;
  hue: number;
  support: number;
  neutral: number;
  oppose: number;
  net: number;
  count: number;
}

export interface TimelinePoint {
  label: string;
  sublabel: string;
  support: number;
  neutral: number;
  oppose: number;
  net: number;
}

export interface ThemeInsight {
  value: Value;
  label: string;
  /** 0 – 1 relative importance in the conversation. */
  weight: number;
  /** -1 – 1: does this theme push people for or against? */
  sentiment: number;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  target: string;
  /** Text appended to the decision when the user applies this fix. */
  modifier: string;
  /** A rewritten decision to use instead (for "narrow it down" fixes). */
  replace?: string;
  /** Projected change in net support (points), measured by re-running the simulation. */
  projectedLift: number;
  /** Projected day-one support (%) with this fix applied. */
  projectedSupport: number;
}

export interface TownHallMessage {
  speakerId: string;
  name: string;
  role: string;
  hue: number;
  initials: string;
  stance: Stance | 'moderator';
  text: string;
  replyTo?: string;
  agrees: number;
}

export interface CrowdAgent {
  /** Index into result.personas */
  p: number;
  x: number;
  y: number;
  /** Opinion at each timeline step (-1 – 1). */
  o: number[];
}

export interface SimulationSummary {
  verdict: string;
  headline: string;
  support: number;
  neutral: number;
  oppose: number;
  net: number;
  /** Net support after a year of social influence and adjustment. */
  longTermNet: number;
  trajectory: string;
  polarization: number;
  backlashRisk: 'Low' | 'Moderate' | 'High';
  confidence: 'Low' | 'Medium' | 'High';
  marginOfError: number;
}

export interface SimulationResult {
  id: string;
  version: string;
  engine: 'heuristic-v1' | string;
  decision: string;
  scope: Scope;
  crowdSize: number;
  createdAt: string;
  summary: SimulationSummary;
  analysis: Analysis;
  personas: PersonaReaction[];
  groups: GroupSentiment[];
  timeline: TimelinePoint[];
  themes: ThemeInsight[];
  recommendations: Recommendation[];
  townHall: TownHallMessage[];
  crowd: CrowdAgent[];
  reality: RealityCheck | null;
  /** Who's in the room: multipliers that differ from 1 for this setting's groups. */
  mix: Record<string, number>;
}
