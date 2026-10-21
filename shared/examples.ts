import type { Scope } from './types';

export interface Example {
  text: string;
  scope: Scope;
  tag: string;
}

/** Sample decisions used across the UI (hero placeholder, chips, use cases). */
export const EXAMPLES: Example[] = [
  { text: 'Start high school at 9:00 a.m. instead of 7:30 so students get more sleep', scope: 'school', tag: 'School board' },
  { text: 'Ban phones during the school day', scope: 'school', tag: 'Principal' },
  { text: 'Switch our district to a four-day school week', scope: 'school', tag: 'District' },
  { text: 'Replace final exams with group projects', scope: 'school', tag: 'Teachers' },
  { text: 'Turn the downtown parking lot into a public park', scope: 'community', tag: 'City council' },
  { text: 'Ban gas-powered leaf blowers in our town starting next spring', scope: 'community', tag: 'Town board' },
  { text: 'Raise the local sales tax by 1% to fund a new library', scope: 'community', tag: 'Ballot measure' },
  { text: 'Make city buses free for everyone', scope: 'community', tag: 'Transit' },
  { text: "I'm thinking about quitting my job to start a bakery", scope: 'personal', tag: 'Career' },
  { text: 'Should I take a gap year before college?', scope: 'personal', tag: 'Education' },
  { text: 'Move across the country for a new job', scope: 'personal', tag: 'Life' },
  { text: 'Raise our café prices by 15% to pay staff a living wage', scope: 'business', tag: 'Small business' },
  { text: 'Let our employees work remote on Fridays', scope: 'business', tag: 'Workplace' },
  { text: 'Switch our shop to 100% compostable packaging', scope: 'business', tag: 'Sustainability' },
];
