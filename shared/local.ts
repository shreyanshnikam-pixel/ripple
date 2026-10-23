/**
 * Local decisions: the kind a city council, school board or ballot measure settles.
 * Shown on the District page so a visitor can run their own town's questions with
 * their district's crowd. Every one is tested to start from the right poll or estimate.
 */
import type { Scope } from './types';

export type LocalCategory = 'places' | 'schools' | 'taxes' | 'housing' | 'streets' | 'energy';

export const LOCAL_CATEGORIES: { id: LocalCategory; label: string }[] = [
  { id: 'places', label: 'Parks & public places' },
  { id: 'schools', label: 'Schools' },
  { id: 'taxes', label: 'Taxes & bond votes' },
  { id: 'housing', label: 'Housing' },
  { id: 'streets', label: 'Streets & getting around' },
  { id: 'energy', label: 'Energy & environment' },
];

export interface LocalDecision {
  id: string;
  category: LocalCategory;
  /** Who usually decides it. */
  who: string;
  /** A short name for the card. */
  title: string;
  /** What Ripple simulates (the engine reads English). */
  decision: string;
  scope: Scope;
  /** The anchor the decision should start from. */
  topic: string;
}

const d = (x: Omit<LocalDecision, 'scope'> & { scope?: Scope }): LocalDecision => ({ scope: 'community', ...x });

export const LOCAL_DECISIONS: LocalDecision[] = [
  d({ id: 'park', category: 'places', who: 'City council', title: 'Parking lot to a park', decision: 'Turn the downtown parking lot into a public park', topic: 'parking-to-park' }),
  d({ id: 'pool', category: 'places', who: 'City council', title: 'Close the town pool', decision: 'Close the town pool to save money', topic: 'close-place' }),
  d({ id: 'library-tax', category: 'places', who: 'Ballot measure', title: 'A tax for a new library', decision: 'Raise the local sales tax by 1% to fund a new library', topic: 'local-tax' }),

  d({ id: 'start-time', category: 'schools', who: 'School board', title: 'Start high school later', decision: 'Start high school at 8:30 a.m. instead of 7:30', topic: 'later-start' }),
  d({ id: 'school-officers', category: 'schools', who: 'School board', title: 'An officer in every school', decision: 'Put a school resource officer in every school', topic: 'school-security' }),
  d({ id: 'free-lunch', category: 'schools', who: 'School board', title: 'Free lunch for every student', decision: 'Make school lunch free for all students', topic: 'free-meals' }),

  d({ id: 'school-bond', category: 'taxes', who: 'Bond vote', title: 'A school building bond', decision: 'Pass a $40 million school bond to fix old school buildings', topic: 'local-tax' }),
  d({ id: 'teacher-pay', category: 'taxes', who: 'Ballot measure', title: 'Property tax for teacher pay', decision: 'Raise local property taxes to increase teacher salaries', topic: 'local-tax' }),

  d({ id: 'duplexes', category: 'housing', who: 'City council', title: 'Allow duplexes and townhomes', decision: 'Allow duplexes and townhomes in single-family neighborhoods', topic: 'housing' }),
  d({ id: 'apartments', category: 'housing', who: 'Planning board', title: 'A new apartment building', decision: 'Approve a new apartment building downtown', topic: 'housing' }),
  d({ id: 'shelter', category: 'housing', who: 'City council', title: 'A homeless shelter', decision: 'Open a homeless shelter near downtown', topic: 'shelter' }),
  d({ id: 'rent-cap', category: 'housing', who: 'City council', title: 'Cap rent increases', decision: 'Cap yearly rent increases at 5%', topic: 'rent-control' }),

  d({ id: 'bike-lanes', category: 'streets', who: 'City council', title: 'Protected bike lanes', decision: 'Add protected bike lanes on Main Street', topic: 'bike-lanes' }),
  d({ id: 'speed-cameras', category: 'streets', who: 'City council', title: 'Speed cameras near schools', decision: 'Install speed cameras near schools', topic: 'speed-cameras' }),
  d({ id: 'free-buses', category: 'streets', who: 'Transit board', title: 'Free city buses', decision: 'Make city buses free to ride', topic: 'free-transit' }),

  d({ id: 'solar-farm', category: 'energy', who: 'County board', title: 'A solar farm', decision: 'Build a solar farm on the old landfill', topic: 'solar-farm' }),
  d({ id: 'leaf-blowers', category: 'energy', who: 'Town board', title: 'Ban gas leaf blowers', decision: 'Ban gas-powered leaf blowers starting next spring', topic: 'leaf-blowers' }),
];

export const localByCategory = (c: LocalCategory) => LOCAL_DECISIONS.filter((x) => x.category === c);
