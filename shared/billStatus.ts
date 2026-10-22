/**
 * Live bill updates: reads Congress.gov's official bill-status records (published as XML by
 * GovInfo, no API key needed) and keeps each bill's progress current.
 * scripts/update-bills.ts runs this and writes shared/bill-status.json; bills.ts merges it in.
 */
import type { Bill, BillStage } from './bills';

export interface ParsedStatus {
  stage: BillStage;
  latest: { date: string; text: string };
  passed: { house: string | null; senate: string | null };
  law: string | null;
}

const KIND: Record<string, string> = { 'H.R.': 'hr', 'S.': 's', 'H.J.Res.': 'hjres', 'S.J.Res.': 'sjres', 'H.Res.': 'hres', 'S.Res.': 'sres', 'H.Con.Res.': 'hconres', 'S.Con.Res.': 'sconres' };

export function govinfoUrl(number: string, congress: number): string {
  const m = /^([A-Z][A-Za-z.]*?)\s*(\d+)$/.exec(number.trim());
  const kind = m && KIND[m[1]];
  if (!m || !kind) throw new Error(`Unknown bill number: ${number}`);
  return `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${kind}/BILLSTATUS-${congress}${kind}${m[2]}.xml`;
}

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function parseBillStatus(xml: string): ParsedStatus {
  // The bill's own action list (related bills carry only a latestAction, never an <actions> list).
  const block = /<actions>([\s\S]*?)<\/actions>/.exec(xml)?.[1] ?? '';
  const actions = [...block.matchAll(/<item>[\s\S]*?<actionDate>(\d{4}-\d{2}-\d{2})<\/actionDate>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/item>/g)].map((m) => ({
    date: m[1],
    text: decode(m[2]).trim(),
  }));
  if (!actions.length) throw new Error('No actions found in the bill-status record.');
  const latest = actions.reduce((a, b) => (b.date > a.date ? b : a));
  const first = (re: RegExp) => actions.filter((a) => re.test(a.text)).map((a) => a.date).sort()[0] ?? null;
  const house = first(/Passed\/agreed to in House/);
  const senate = first(/Passed\/agreed to in Senate/);
  const law = /<laws>[\s\S]*?<number>([\d-]+)<\/number>/.exec(xml)?.[1] ?? /Became Public Law No: ([\d-]+)/.exec(actions.map((a) => a.text).join('\n'))?.[1] ?? null;
  const reported = actions.some((a) => /Ordered to be Reported|Reported by|reported (with|without) (an )?amendment|Committee .*reported/i.test(a.text));
  const stage: BillStage = law ? 'law' : house && senate ? 'passed-both' : house || senate ? 'passed-one' : reported ? 'committee' : 'introduced';
  return { stage, latest, passed: { house, senate }, law };
}

const ORDER: BillStage[] = ['introduced', 'committee', 'passed-one', 'passed-both', 'law'];
const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/**
 * Merges an official record into a hand-checked bill. The hand-written status stays until Congress
 * acts again after it was checked; a stage never moves backwards.
 */
export function applyStatus(bill: Bill, s: ParsedStatus): Bill {
  if (s.latest.date <= bill.checked) return bill;
  const advance = bill.autoStage === false ? s.stage === 'law' : ORDER.indexOf(s.stage) > ORDER.indexOf(bill.stage);
  const stage = advance ? s.stage : bill.stage;
  const status = s.law ? `Became Public Law ${s.law}. Latest action, ${fmt(s.latest.date)}: ${s.latest.text}` : `Latest action, ${fmt(s.latest.date)}: ${s.latest.text}`;
  return { ...bill, stage, status, checked: s.latest.date };
}
