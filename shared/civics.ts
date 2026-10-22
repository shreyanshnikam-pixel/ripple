/**
 * "Take it further": who makes a decision like this for real, and a starter letter to them.
 * The letter cites real polls only. Simulated numbers stay in Ripple.
 */
import { billsForTopic } from './bills';
import type { Member } from './districts';
import type { SimulationResult } from './types';

export type Level = 'federal' | 'state' | 'local' | 'school-board' | 'school' | 'business' | 'personal';

/** Questions Congress votes on (and has recent bills about). */
const FEDERAL = new Set([
  'stock-trading', 'scotus-terms', 'age-limits', 'congress-terms', 'popular-vote', 'voter-id', 'election-holiday',
  'auto-registration', 'early-voting', 'vote-by-mail', 'felon-voting', 'voting-age', 'marijuana', 'drug-prices', 'guns',
  'ai-rules', 'min-wage', 'daylight-saving', 'tax-the-rich', 'gas-cars', 'tiktok-ban', 'social-minors',
]);
/** Community questions that school boards usually decide. */
const SCHOOL_BOARD = new Set(['four-day-school', 'free-meals', 'later-start', 'earlier-start', 'cut-programs']);

export interface WhoDecides {
  level: Level;
  title: string;
  detail: string;
}

export function whoDecides(r: SimulationResult): WhoDecides {
  const id = r.reality?.anchor.id ?? '';
  if (r.scope === 'personal') return { level: 'personal', title: 'You', detail: 'It’s your call. Talk it through with the people it affects most before you decide.' };
  if (r.scope === 'business') return { level: 'business', title: 'The owners and managers', detail: 'Bring the team in early. People accept changes they helped shape.' };
  if (r.scope === 'school')
    return { level: 'school', title: 'Your principal, school board or student council', detail: 'Rules like this are set by the school or the district. Student councils can put it on the agenda, and school board meetings are public.' };
  if (FEDERAL.has(id))
    return { level: 'federal', title: 'Congress', detail: 'This is a national question. Your U.S. representative and senators vote on bills like this, and their offices count every message from people they represent.' };
  if (SCHOOL_BOARD.has(id))
    return { level: 'school-board', title: 'Your school board', detail: 'School boards set calendars, schedules and meal programs. Their meetings are public and usually include time for comments.' };
  return { level: 'local', title: 'Your city council or county board', detail: 'Decisions like this are usually made locally. Most councils take public comment at every meeting, in person or in writing.' };
}

/** Questions state legislatures also decide (or mostly decide). */
const STATE = new Set([
  'voter-id', 'early-voting', 'vote-by-mail', 'felon-voting', 'auto-registration', 'marijuana', 'guns', 'min-wage',
  'social-minors', 'phones-school', 'devices-school', 'later-start', 'gas-cars', 'daylight-saving', 'housing', 'rent-control',
  'free-meals', 'school-security', 'armed-teachers', 'speed-cameras', 'plastic', 'gas-stoves',
]);
/** Questions cities and counties also act on. */
const LOCAL_TOO = new Set(['min-wage', 'housing', 'rent-control', 'plastic', 'gas-stoves', 'leaf-blowers', 'renewables', 'solar-farm']);

export interface DecisionBody {
  level: Level;
  title: string;
  detail: string;
  links: { label: string; url: string }[];
}

const HOUSE_FINDER = { label: 'Find your representative', url: 'https://www.house.gov/representatives/find-your-representative' };
const STATE_FINDER = { label: 'Find your state legislators', url: 'https://openstates.org/find_your_legislator/' };
const LOCAL_FINDER = { label: 'Find your local government', url: 'https://www.usa.gov/local-governments' };

/** Everyone with a say, the main decision-maker first. `st` is a two-letter state code when known. */
export function decisionBodies(r: SimulationResult, st?: string | null): DecisionBody[] {
  const main = whoDecides(r);
  const id = r.reality?.anchor.id ?? '';
  const stateLinks = [...(st && /^[A-Z]{2}$/.test(st) && st !== 'DC' && st !== 'PR' ? [{ label: `Your state legislature on Open States`, url: `https://openstates.org/${st.toLowerCase()}/` }] : []), STATE_FINDER];
  const state: DecisionBody = {
    level: 'state',
    title: 'Your state legislature',
    detail: main.level === 'federal' ? 'States make many of their own rules on this, too. Your state senator and representative vote on them.' : 'Some states set rules on this, too. Your state senator and representative vote on them.',
    links: stateLinks,
  };
  const local: DecisionBody = { level: 'local', title: 'Your city council or county board', detail: 'Cities and counties can act on this, too. Most councils take public comment at every meeting.', links: [LOCAL_FINDER] };
  const first: DecisionBody = {
    ...main,
    links: main.level === 'federal' ? [HOUSE_FINDER] : main.level === 'local' ? [LOCAL_FINDER] : [],
  };
  if (main.level === 'personal' || main.level === 'business') return [first];
  const out = [first];
  if (STATE.has(id)) out.push(state);
  if (main.level !== 'local' && LOCAL_TOO.has(id) && r.scope === 'community') out.push(local);
  return out;
}

export interface LetterTarget {
  /** e.g. "CA-12" */
  label: string;
  rep: Member | null;
}

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** True when the "letter" is a message to people you know rather than to officials. */
export const isConversation = (level: Level) => level === 'personal' || level === 'business';

/** A starter letter the writer finishes in their own words. It never takes a side. */
export function letterFor(r: SimulationResult, target: LetterTarget | null, to?: Level): string {
  const main = whoDecides(r);
  const who = to ? { ...main, level: to } : main;
  if (isConversation(who.level)) {
    return [
      'Hi [name],',
      `I’m thinking about a decision and I’d like your honest take before I make it: “${r.decision.trim().replace(/[.?!]+$/, '')}.”`,
      'How would it affect you? What worries you about it? What would make it work better for you?',
      'Thanks for being straight with me.',
    ].join('\n\n');
  }
  const greeting =
    who.level === 'federal'
      ? `Dear Representative ${target?.rep?.last ?? '[name]'},`
      : who.level === 'state'
        ? 'Dear [State Senator or Representative name],'
        : who.level === 'local'
        ? 'Dear Council Members,'
        : who.level === 'school-board'
          ? 'Dear School Board Members,'
          : who.level === 'school'
            ? 'Dear [principal, school board or student council],'
            : 'Hello [name],';
  const decision = `“${r.decision.trim().replace(/[.?!]+$/, '')}.”`;
  const intro =
    who.level === 'federal'
      ? `I’m a constituent in ${target?.label ?? '[your congressional district]'}, and I’m writing about a proposal: ${decision}`
      : who.level === 'state'
        ? `I live in your district in [your town], and I’m writing about a proposal: ${decision}`
        : who.level === 'local'
        ? `I live in [your town], and I’m writing about a proposal: ${decision}`
        : `I’m writing about a proposal: ${decision}`;

  const a = r.reality?.anchor;
  const poll =
    a && a.basis === 'poll' && a.source
      ? `For context: in a ${a.source.year} survey by ${a.source.org}, ${a.support}% of ${a.population === 'parents' ? 'parents' : 'those'} surveyed supported ${lowerFirst(a.label)}. (${a.source.url})`
      : null;

  // Offices sort constituent mail by bill, so name the one furthest along.
  const order = ['law', 'passed-both', 'passed-one', 'committee', 'introduced'];
  const bill = who.level === 'federal' && a ? [...billsForTopic(a.id)].sort((x, y) => order.indexOf(x.stage) - order.indexOf(y.stage))[0] : undefined;
  const related = bill ? `Related legislation: ${bill.number}, the ${bill.title} (${bill.congress}th Congress).` : null;

  const thanks =
    who.level === 'federal' ? 'Thank you for your time and for listening to the people you represent.' : 'Thank you for your time and for your service.';
  const sign =
    who.level === 'federal' || who.level === 'state'
      ? 'Sincerely,\n[Your name]\n[Your street address and ZIP code, so the office can confirm you live in the district]'
      : 'Sincerely,\n[Your name]';

  return [
    greeting,
    intro,
    poll,
    related,
    'I [support / oppose] this because [your reasons, in your own words: how it would affect you, your family or your community].',
    thanks,
    sign,
  ]
    .filter(Boolean)
    .join('\n\n');
}
