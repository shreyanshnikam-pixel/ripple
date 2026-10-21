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

const CHECKED = '2026-10-21';
const GOV = (congress: number, kind: string, n: string) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${kind}/BILLSTATUS-${congress}${kind}${n}.xml`;
type Draft = Omit<Bill, 'id' | 'url' | 'checked' | 'scope'> & { scope?: Scope };
const bill = (d: Draft): Bill => ({
  ...d,
  scope: d.scope ?? 'community',
  id: `${d.number.toLowerCase().replace(/[^a-z0-9]/g, '')}-${d.congress}`,
  url: congressUrl(d.number, d.congress),
  checked: CHECKED,
});

export const BILLS: Bill[] = [
  // ── Congress itself ──
  bill({
    topic: 'stock-trading', number: 'H.R. 7008', congress: 119, title: 'Stop Insider Trading Act', sponsor: 'Rep. Bryan Steil (R-WI)', introduced: '2026-01-12',
    status: 'Passed the House 232–198 on July 22, 2026. In the Senate, a vote to begin debate fell short of the 60 votes needed (53–47) on September 30, 2026.',
    stage: 'passed-one',
    summary: 'Would bar members of Congress, their spouses and dependent children from buying individual stocks. They could keep stocks they already own, but would have to give public notice 7 to 14 days before selling. The House-passed version also added a requirement to show photo ID to vote in federal elections.',
    decision: 'Ban members of Congress from buying individual stocks',
    sources: [GOV(119, 'hr', '7008'), 'https://abc7news.com/post/house-passes-bill-would-ban-members-buying-stock/19562103/'],
  }),
  bill({
    topic: 'stock-trading', number: 'S. 1498', congress: 119, title: 'HONEST Act', sponsor: 'Sen. Josh Hawley (R-MO)', introduced: '2025-04-28',
    status: 'Approved 8–7 by the Senate Homeland Security and Governmental Affairs Committee on July 30, 2025, and placed on the Senate calendar. No floor vote.',
    stage: 'committee',
    summary: 'Would generally bar members of Congress, the President and Vice President, and their spouses and dependents from owning or trading individual stocks, and require them to sell those holdings. Diversified funds and Treasury securities would still be allowed.',
    decision: 'Ban members of Congress from owning or trading individual stocks',
    sources: [GOV(119, 's', '1498')],
  }),
  bill({
    topic: 'congress-terms', number: 'H.J.Res. 12', congress: 119, title: 'Congressional term limits amendment', sponsor: 'Rep. Ralph Norman (R-SC)', introduced: '2025-01-06',
    status: 'Introduced; referred to the House Judiciary Committee. Sen. Ted Cruz’s S.J.Res. 1 is the identical Senate version.',
    stage: 'introduced',
    summary: 'A proposed constitutional amendment that would limit House members to three terms (six years) and senators to two terms (12 years). It would need a two-thirds vote in both chambers and ratification by three-fourths of the states.',
    decision: 'Set term limits for members of Congress',
    sources: [GOV(119, 'hjres', '12')],
  }),
  bill({
    topic: 'scotus-terms', number: 'H.R. 3544', congress: 119, title: 'Supreme Court TERM Act of 2025', sponsor: 'Rep. Hank Johnson (D-GA)', introduced: '2025-05-21',
    status: 'Introduced; referred to the House Judiciary Committee.',
    stage: 'introduced',
    summary: 'Would limit Supreme Court justices to 18 years of regular active service, after which they would take senior status. The President would appoint a justice in the first and third years after each presidential election.',
    decision: 'Set 18-year term limits for Supreme Court justices',
    sources: [GOV(119, 'hr', '3544')],
  }),
  // ── Elections ──
  bill({
    topic: 'voter-id', number: 'H.R. 22', congress: 119, title: 'SAVE Act', sponsor: 'Rep. Chip Roy (R-TX)', introduced: '2025-01-03',
    status: 'Passed the House 220–208 on April 10, 2025. The Senate has not voted on it.',
    stage: 'passed-one',
    summary: 'Would require people registering to vote in federal elections to show documentary proof of U.S. citizenship, such as a passport. States would have to offer another process for applicants without those documents and remove noncitizens from voter rolls. It does not require photo ID to vote.',
    decision: 'Require proof of citizenship to register to vote',
    sources: [GOV(119, 'hr', '22')],
  }),
  bill({
    topic: 'voter-id', number: 'S. 1383', congress: 119, title: 'SAVE America Act (House amendment to S. 1383)', sponsor: 'Sen. Rick Scott (R-FL)', introduced: '2025-04-09',
    status: 'The House replaced the text of S. 1383, a Senate-passed veterans bill, with the SAVE America Act and passed it 218–213 on February 11, 2026. The Senate voted 51–48 to take it up on March 17, 2026, but has not held a final vote.',
    stage: 'passed-one',
    summary: 'Keeps the SAVE Act’s proof-of-citizenship rule for registering and adds a requirement to show photo ID to get a ballot in federal elections. Voters without ID could cast a provisional ballot that counts only if they show ID within three days.',
    decision: 'Require voters to show a photo ID to vote in federal elections',
    sources: [GOV(119, 's', '1383')],
  }),
  bill({
    topic: 'election-holiday', number: 'H.R. 154', congress: 119, title: 'Election Day Act', sponsor: 'Rep. Brian Fitzpatrick (R-PA)', introduced: '2025-01-03',
    status: 'Introduced; referred to the House Oversight and Government Reform Committee.',
    stage: 'introduced',
    summary: 'Would add Election Day to the list of federal legal public holidays. Cosponsored by Rep. Debbie Dingell (D-MI).',
    decision: 'Make Election Day a national holiday',
    sources: [GOV(119, 'hr', '154')],
  }),
  bill({
    topic: 'voting-age', number: 'H.J.Res. 16', congress: 119, title: 'Voting age of 16 amendment', sponsor: 'Rep. Grace Meng (D-NY)', introduced: '2025-01-09',
    status: 'Introduced; referred to the House Judiciary Committee.',
    stage: 'introduced',
    summary: 'A proposed constitutional amendment guaranteeing that citizens 16 and older can’t be denied the right to vote on account of age. It would need a two-thirds vote in both chambers and ratification by three-fourths of the states.',
    decision: 'Lower the voting age to 16',
    sources: [GOV(119, 'hjres', '16')],
  }),
  bill({
    topic: 'popular-vote', number: 'S.J.Res. 218', congress: 119, title: 'Direct election of the President amendment', sponsor: 'Sen. Brian Schatz (D-HI)', introduced: '2026-09-29',
    status: 'Introduced; referred to the Senate Judiciary Committee. Rep. Steve Cohen (D-TN) introduced the identical H.J.Res. 218 on October 1, 2026.',
    stage: 'introduced',
    summary: 'A proposed constitutional amendment that would abolish the Electoral College and elect the President and Vice President by national popular vote.',
    decision: 'Elect the president by national popular vote instead of the Electoral College',
    sources: [GOV(119, 'sjres', '218')],
  }),
  // ── Kids, tech and AI ──
  bill({
    topic: 'social-minors', number: 'H.R. 7757', congress: 119, title: 'KIDS Act', sponsor: 'Rep. Brett Guthrie (R-KY)', introduced: '2026-03-03',
    status: 'Passed the House 267–117 on June 29, 2026. Referred to the Senate Commerce, Science, and Transportation Committee.',
    stage: 'passed-one',
    summary: 'A package of children’s online safety bills, including a House version of the Kids Online Safety Act. It would require social media platforms to turn on protective default settings for minors and give parents tools to manage minors’ accounts. Unlike the Senate bill, it has no “duty of care” for platforms.',
    decision: 'Require social media platforms to turn on safety settings for kids and teens by default',
    sources: [GOV(119, 'hr', '7757'), 'https://energycommerce.house.gov/posts/e-and-c-leadership-celebrates-house-passage-of-kids-act'],
  }),
  bill({
    topic: 'social-minors', number: 'S. 1748', congress: 119, title: 'Kids Online Safety Act', sponsor: 'Sen. Marsha Blackburn (R-TN)', introduced: '2025-05-14',
    status: 'Approved unanimously, with changes, by the Senate Commerce, Science, and Transportation Committee on August 5, 2026. Awaiting a Senate floor vote.',
    stage: 'committee',
    summary: 'Would require online platforms to take reasonable steps to prevent specified harms to users under 17 (a “duty of care”) and give minors the most protective privacy and safety settings by default. Co-led by Sen. Richard Blumenthal (D-CT).',
    decision: 'Require social media companies to protect kids and teens online',
    sources: [GOV(119, 's', '1748')],
  }),
  bill({
    topic: 'tiktok-ban', number: 'H.R. 815', congress: 118, title: 'Protecting Americans from Foreign Adversary Controlled Applications Act', sponsor: 'Rep. Cathy McMorris Rodgers (R-WA)', introduced: '2023-02-02',
    status: 'Became Public Law 118-50 on April 24, 2024, as part of a national security spending package. The Supreme Court upheld it 9–0 in January 2025. A new majority-American-owned TikTok joint venture was finalized in January 2026.',
    stage: 'law',
    summary: 'Required ByteDance to sell TikTok’s U.S. operations or face a U.S. ban, under which app stores and web hosts could not distribute or support the app. The President can apply the same rules to other apps controlled by foreign adversaries.',
    decision: 'Ban TikTok in the U.S. unless ByteDance sells it',
    sources: [GOV(118, 'hr', '815'), 'https://www.scotusblog.com/cases/case-files/tiktok-inc-v-garland'],
  }),
  bill({
    topic: 'ai-rules', number: 'S. 146', congress: 119, title: 'TAKE IT DOWN Act', sponsor: 'Sen. Ted Cruz (R-TX)', introduced: '2025-01-16',
    status: 'Became Public Law 119-12 on May 19, 2025. It passed the Senate by unanimous consent and the House 409–2.',
    stage: 'law',
    summary: 'Makes it a federal crime to publish intimate images of a person without consent, including AI-generated deepfakes. Platforms must remove such images within 48 hours after the person shown asks.',
    decision: 'Make it a crime to post AI deepfake nude images of real people without consent',
    sources: [GOV(119, 's', '146')],
  }),
  bill({
    topic: 'ai-rules', number: 'S. 1367', congress: 119, title: 'NO FAKES Act of 2025', sponsor: 'Sen. Chris Coons (D-DE)', introduced: '2025-04-09',
    status: 'Introduced; referred to the Senate Judiciary Committee. The House version is H.R. 2794.',
    stage: 'introduced',
    summary: 'Would create a federal right to control the use of your voice and likeness in AI-generated digital replicas, with a notice-and-takedown process for online services and exceptions for news, sports and satire.',
    decision: 'Pass a law giving people control over AI copies of their voice and likeness',
    sources: [GOV(119, 's', '1367')],
  }),
  // ── Health and safety ──
  bill({
    topic: 'drug-prices', number: 'H.R. 5376', congress: 117, title: 'Inflation Reduction Act of 2022', sponsor: 'Rep. John Yarmuth (D-KY)', introduced: '2021-09-27',
    status: 'Became Public Law 117-169 on August 16, 2022. The first negotiated Medicare prices, for 10 drugs, took effect January 1, 2026.',
    stage: 'law',
    summary: 'Among many provisions, it lets Medicare negotiate prices directly with drugmakers for some high-cost drugs. Negotiated prices for 15 more drugs, including Ozempic and Wegovy, take effect January 1, 2027.',
    decision: 'Let Medicare negotiate prescription drug prices',
    sources: [GOV(117, 'hr', '5376'), 'https://www.cms.gov/newsroom/fact-sheets/medicare-drug-price-negotiation-program-negotiated-prices-initial-price-applicability-year-2026'],
  }),
  bill({
    topic: 'guns', number: 'S. 2938', congress: 117, title: 'Bipartisan Safer Communities Act', sponsor: 'Sen. Marco Rubio (R-FL)', introduced: '2021-10-05',
    status: 'Became Public Law 117-159 on June 25, 2022 (Senate 65–33, House 234–193). The gun provisions were negotiated by Sens. Chris Murphy (D-CT) and John Cornyn (R-TX) and added to this bill.',
    stage: 'law',
    summary: 'Expanded background checks for gun buyers under 21, created federal crimes for straw purchasing and gun trafficking, let federal grants fund state crisis-intervention programs, and funded mental health and school safety programs.',
    decision: 'Require stronger background checks for gun buyers under 21',
    sources: [GOV(117, 's', '2938')],
  }),
  bill({
    topic: 'guns', number: 'H.R. 18', congress: 119, title: 'Bipartisan Background Checks Act of 2025', sponsor: 'Rep. Mike Thompson (D-CA)', introduced: '2025-06-10',
    status: 'Introduced; referred to the House Judiciary Committee. Co-led by Rep. Brian Fitzpatrick (R-PA).',
    stage: 'introduced',
    summary: 'Would require background checks on most gun sales and transfers between private parties, run through a licensed dealer. Some transfers, such as gifts between spouses, would be exempt.',
    decision: 'Require background checks on all gun sales',
    sources: [GOV(119, 'hr', '18')],
  }),
  bill({
    topic: 'marijuana', number: 'H.R. 5068', congress: 119, title: 'MORE Act', sponsor: 'Rep. Jerrold Nadler (D-NY)', introduced: '2025-08-29',
    status: 'Introduced; referred to the House Judiciary Committee and other committees.',
    stage: 'introduced',
    summary: 'Would remove marijuana from the federal list of controlled substances, end federal criminal penalties for it, set up a process to expunge past federal convictions, and tax cannabis products.',
    decision: 'Legalize marijuana nationwide',
    sources: [GOV(119, 'hr', '5068')],
  }),
  // ── Work, money and the economy ──
  bill({
    topic: 'min-wage', number: 'S. 1332', congress: 119, title: 'Raise the Wage Act of 2025', sponsor: 'Sen. Bernie Sanders (I-VT)', introduced: '2025-04-08',
    status: 'Introduced; referred to the Senate HELP Committee. The House version is H.R. 2743.',
    stage: 'introduced',
    summary: 'Would raise the federal minimum wage from $7.25 to $17 an hour in steps over five years and phase out lower “subminimum” wages for tipped, youth and disabled workers.',
    decision: 'Raise the federal minimum wage to $17 an hour by 2030',
    sources: [GOV(119, 's', '1332')],
  }),
  bill({
    topic: 'min-wage', number: 'S. 2013', congress: 119, title: 'Higher Wages for American Workers Act of 2025', sponsor: 'Sen. Josh Hawley (R-MO)', introduced: '2025-06-10',
    status: 'Introduced; referred to the Senate HELP Committee. Cosponsored by Sen. Peter Welch (D-VT).',
    stage: 'introduced',
    summary: 'Would raise the federal minimum wage to $15 an hour, then raise it each year with inflation.',
    decision: 'Raise the federal minimum wage to $15 an hour',
    sources: [GOV(119, 's', '2013')],
  }),
  bill({
    topic: 'tax-the-rich', number: 'S. 2845', congress: 119, title: 'Billionaires Income Tax Act', sponsor: 'Sen. Ron Wyden (D-OR)', introduced: '2025-09-17',
    status: 'Introduced; referred to the Senate Finance Committee. The House version is H.R. 5427.',
    stage: 'introduced',
    summary: 'Would require people with more than $1 billion in assets or $100 million in yearly income for three years in a row to pay tax each year on gains in the value of their assets, instead of only when they sell. It would not raise tax rates.',
    decision: 'Raise taxes on billionaires by taxing the growth of their assets every year',
    sources: [GOV(119, 's', '2845')],
  }),
  bill({
    topic: 'daylight-saving', number: 'H.R. 139', congress: 119, title: 'Sunshine Protection Act of 2025', sponsor: 'Rep. Vern Buchanan (R-FL)', introduced: '2025-01-03',
    status: 'Passed the House 308–117 on July 14, 2026. Referred to the Senate Commerce, Science, and Transportation Committee. The Senate version is S. 29 (Sen. Rick Scott, R-FL).',
    stage: 'passed-one',
    summary: 'Would make daylight saving time permanent, ending the twice-a-year clock change. Places that don’t observe daylight saving time, like Hawaii and most of Arizona, could keep standard time.',
    decision: 'Make daylight saving time permanent and stop changing the clocks',
    sources: [GOV(119, 'hr', '139')],
  }),
  bill({
    topic: 'gas-cars', number: 'H.J.Res. 88', congress: 119, title: 'Disapproval of California’s Advanced Clean Cars II waiver', sponsor: 'Rep. John Joyce (R-PA)', introduced: '2025-04-02',
    status: 'Became Public Law 119-16 on June 12, 2025 (House 246–164, Senate 51–44).',
    stage: 'law',
    summary: 'Used the Congressional Review Act to revoke the federal waiver that let California require all new cars and light trucks sold in the state to be zero-emission by 2035. Simulating it runs the phase-out that Congress blocked.',
    decision: 'Phase out sales of new gas-powered cars by 2035',
    sources: [GOV(119, 'hjres', '88')],
  }),
  // ── Schools ──
  bill({
    topic: 'phones-school', number: 'S. 404', congress: 119, title: 'Focus on Learning Act', sponsor: 'Sen. Tom Cotton (R-AR)', introduced: '2025-02-05',
    status: 'Introduced; referred to the Senate HELP Committee. Cosponsored by Sen. Tim Kaine (D-VA); the House version is H.R. 1275.',
    stage: 'introduced',
    summary: 'Would have the Surgeon General study how phones in K–12 schools affect learning and mental health, and fund a pilot program of grants for phone lockers so schools can go phone-free, with exemptions for health needs and students with disabilities.',
    decision: 'Ban phones during class in public schools',
    scope: 'school',
    sources: [GOV(119, 's', '404')],
  }),
  bill({
    topic: 'free-meals', number: 'S. 4518', congress: 119, title: 'Universal School Meals Program Act of 2026', sponsor: 'Sen. Bernie Sanders (I-VT)', introduced: '2026-05-13',
    status: 'Introduced; referred to the Senate Agriculture Committee. The House version is H.R. 8798 (Rep. Ilhan Omar, D-MN).',
    stage: 'introduced',
    summary: 'Would provide free breakfast, lunch, dinner and a snack to all students regardless of family income, wipe out school meal debt, and expand free summer meals.',
    decision: 'Give free school meals to all students',
    sources: [GOV(119, 's', '4518')],
  }),
];

export const billsForTopic = (topic: string): Bill[] => BILLS.filter((b) => b.topic === topic);
