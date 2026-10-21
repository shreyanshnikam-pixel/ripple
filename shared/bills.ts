/**
 * Real federal bills and laws on questions Ripple has polling for.
 * Every fact was checked against Congress.gov, official member or committee pages, or
 * major news on the date in `checked`. Bills move: Congress.gov has the latest.
 */
import type { Scope } from './types';

export type BillStage = 'introduced' | 'committee' | 'passed-one' | 'passed-both' | 'law';

export const BILL_STAGES: { id: BillStage; label: string }[] = [
  { id: 'introduced', label: 'Introduced' },
  { id: 'committee', label: 'Committee action' },
  { id: 'passed-one', label: 'Passed one chamber' },
  { id: 'passed-both', label: 'Passed both' },
  { id: 'law', label: 'Law' },
];

export interface Bill {
  /** Stable slug, e.g. "s29-119". */
  id: string;
  /** The Ripple topic (anchor id) the bill is about. */
  topic: string;
  /** As Congress writes it: "H.R. 139", "S. 29", "H.J.Res. 12". */
  number: string;
  congress: number;
  title: string;
  /** e.g. "Sen. Rick Scott (R-FL)" */
  sponsor: string;
  /** YYYY-MM-DD */
  introduced: string;
  /** The latest major action, in plain words. */
  status: string;
  stage: BillStage;
  /** Neutral, plain-English description of what it does or would do. */
  summary: string;
  url: string;
  /** What Ripple simulates for this bill. */
  decision: string;
  scope: Scope;
  sources: string[];
  /** YYYY-MM-DD the facts were checked. */
  checked: string;
}

const KIND: Record<string, string> = {
  'H.R.': 'house-bill',
  'S.': 'senate-bill',
  'H.J.Res.': 'house-joint-resolution',
  'S.J.Res.': 'senate-joint-resolution',
  'H.Res.': 'house-resolution',
  'S.Res.': 'senate-resolution',
  'H.Con.Res.': 'house-concurrent-resolution',
  'S.Con.Res.': 'senate-concurrent-resolution',
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** "H.R. 139", 119 → https://www.congress.gov/bill/119th-congress/house-bill/139 */
export function congressUrl(number: string, congress: number): string {
  const m = /^([A-Z][A-Za-z.]*?)\s*(\d+)$/.exec(number.trim());
  const kind = m && KIND[m[1]];
  if (!m || !kind) throw new Error(`Unknown bill number: ${number}`);
  return `https://www.congress.gov/bill/${ordinal(congress)}-congress/${kind}/${m[2]}`;
}

export const BILLS: Bill[] = [];

export const billsForTopic = (topic: string): Bill[] => BILLS.filter((b) => b.topic === topic);
