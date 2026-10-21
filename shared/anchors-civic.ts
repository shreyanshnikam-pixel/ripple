/**
 * Congress, elections and national policy: well-known decisions with a realistic
 * starting point. Same format as anchors.ts. Every "poll" source below was checked
 * against the publisher's page; "estimate" entries say so in the app.
 */
import type { Anchor } from './anchors';
import type { PollSource } from './types';

const PEW_POPVOTE: PollSource = {
  org: 'Pew Research Center',
  year: 2024,
  url: 'https://www.pewresearch.org/short-reads/2024/09/25/majority-of-americans-continue-to-favor-moving-away-from-electoral-college/',
  finding: '63% of U.S. adults prefer electing the president by national popular vote; 35% prefer the Electoral College',
};
const GALLUP_VERIFY: PollSource = {
  org: 'Gallup',
  year: 2024,
  url: 'https://news.gallup.com/poll/652523/americans-endorse-early-voting-voter-verification.aspx',
  finding: '83% of U.S. adults favor requiring proof of citizenship when registering to vote for the first time; 84% favor photo ID to vote (October 2024)',
};
const PEW_VOTING = (finding: string): PollSource => ({
  org: 'Pew Research Center',
  year: 2024,
  url: 'https://www.pewresearch.org/politics/2024/02/07/bipartisan-support-for-early-in-person-voting-voter-id-election-day-national-holiday/',
  finding,
});
const UMD_STOCKS: PollSource = {
  org: 'University of Maryland, Program for Public Consultation',
  year: 2023,
  url: 'https://drum.lib.umd.edu/items/6dbca567-f940-4897-bde1-02610cfb5ef6',
  finding: '86% favor banning members of Congress from trading individual stocks, with large majorities in both parties',
};
const APNORC_SCOTUS: PollSource = {
  org: 'AP-NORC',
  year: 2022,
  url: 'https://apnorc.org/ap-norc-poll-2-in-3-in-us-favor-term-limits-for-justices/',
  finding: '67% of U.S. adults support a set number of years for Supreme Court justices instead of life terms',
};
const MARIST_AGE: PollSource = {
  org: 'NPR/PBS News/Marist Poll (reported by FOX 6)',
  year: 2026,
  url: 'https://www.fox6now.com/news/poll-support-age-caps-term-limits-congress',
  finding: '80% of Americans support a maximum age for candidates for the House and Senate',
};
const PEW_MARIJUANA: PollSource = {
  org: 'Pew Research Center',
  year: 2024,
  url: 'https://www.pewresearch.org/politics/2024/03/26/most-americans-favor-legalizing-marijuana-for-medical-recreational-use/',
  finding: '57% say marijuana should be legal for medical and recreational use, 32% for medical use only, 11% not at all',
};
const KFF_DRUGS: PollSource = {
  org: 'KFF',
  year: 2024,
  url: 'https://www.kff.org/health-costs/allowing-medicare-to-negotiate-drug-prices-remains-broadly-popular-among-voters-though-most-are-unaware-of-the-law-and-its-projected-savings/',
  finding: '85% of voters support letting the federal government negotiate the price of some prescription drugs for people with Medicare',
};
const PEW_GUNS = (finding: string): PollSource => ({
  org: 'Pew Research Center',
  year: 2021,
  url: 'https://www.pewresearch.org/politics/2021/04/20/amid-a-series-of-mass-shootings-in-the-u-s-gun-policy-remains-deeply-divisive/',
  finding,
});
export const PEW_TAXES = (finding: string): PollSource => ({
  org: 'Pew Research Center',
  year: 2025,
  url: 'https://www.pewresearch.org/short-reads/2025/03/19/most-americans-continue-to-favor-raising-taxes-on-corporations-higher-income-households/',
  finding,
});

const CONGRESS = ['congress', 'lawmaker', 'senator', 'representatives', 'members of the house', 'politician', 'elected official', 'legislator', 'the house', 'the senate'];

export const CIVIC_ANCHORS: Anchor[] = [
  {
    id: 'stock-trading', label: 'Banning stock trading by members of Congress', scopes: ['community'], hint: 'community',
    all: [['stock', 'trading', 'trade stock', 'insider trading'], [...CONGRESS, 'members of congress']],
    support: 86, basis: 'poll', population: 'adults', source: UMD_STOCKS, polar: 0.2,
    stakes: { taxpayer: 0.3, elder: 0.15, 'young-adult': 0.2, activist: 0.25, owner: 0.1, worker: 0.15 },
    lines: {
      taxpayer: { pro: 'They write the rules for the companies they invest in. That’s a conflict of interest.', con: 'They’re citizens too. Stricter disclosure should be enough.' },
      elder: { pro: 'In my day, public service meant serving the public, not your portfolio.' },
      'young-adult': { pro: 'If I traded on inside information, I’d go to jail.' },
      owner: { pro: 'I play by the rules. So should they.' },
      activist: { pro: 'This should be the easiest ethics vote Congress ever takes.' },
    },
  },
  {
    id: 'scotus-terms', label: 'Term limits for Supreme Court justices', scopes: ['community', 'school'], hint: 'community',
    all: [['term limit', 'term-limit', 'retirement age', '18-year', 'life term', 'lifetime appointment', 'limit how long'], ['supreme court', 'justices', '=justice']],
    support: 67, basis: 'poll', population: 'adults', source: APNORC_SCOTUS, polar: 0.6,
    stakes: { activist: 0.3, 'young-adult': 0.2, student: 0.15, elder: -0.15, taxpayer: -0.05 },
    lines: {
      activist: { pro: 'Nobody should hold that much power for forty years.' },
      elder: { con: 'Lifetime appointments keep judges independent from politics.' },
      'young-adult': { pro: 'Every president should get to pick justices on a regular schedule.' },
    },
  },
  {
    id: 'age-limits', label: 'Age limits for members of Congress', scopes: ['community', 'school'], hint: 'community',
    all: [['age limit', 'maximum age', 'age cap', 'too old', 'mandatory retirement', 'upper age'], [...CONGRESS, 'candidates', 'president', 'federal office', 'office']],
    support: 80, basis: 'poll', population: 'adults', source: MARIST_AGE, polar: 0.3,
    stakes: { elder: -0.3, 'young-adult': 0.3, student: 0.25, teen: 0.2, activist: 0.1, taxpayer: 0.1 },
    lines: {
      elder: { con: 'Age isn’t the problem. Bad judgment comes at every age.', pro: 'Even I know when it’s time to hand over the keys.' },
      'young-adult': { pro: 'Congress should look more like the country it represents.' },
      student: { pro: 'The people writing laws about my future won’t be around to live in it.' },
    },
  },
  {
    id: 'congress-terms', label: 'Term limits for members of Congress', scopes: ['community', 'school'], hint: 'community',
    all: [['term limit', 'term-limit', 'limit the number of terms', 'limit terms', 'limit how many terms'], CONGRESS], none: ['supreme court', 'justice'],
    support: 80, basis: 'estimate', population: 'adults', polar: 0.3,
    note: 'Ripple estimate. National polls regularly find large majorities in both parties for congressional term limits.',
    stakes: { taxpayer: 0.25, 'young-adult': 0.2, elder: -0.05, activist: 0.05 },
    lines: {
      'young-adult': { pro: 'Fresh faces bring fresh ideas.' },
      elder: { con: 'Experience matters. You don’t fire the pilot in the middle of the flight.' },
      taxpayer: { pro: 'Career politicians answer to donors, not to us.' },
    },
  },
  {
    id: 'popular-vote', label: 'Electing the president by popular vote', scopes: ['community', 'school'], hint: 'community',
    all: [['electoral college', 'popular vote', 'national popular']], support: 63, basis: 'poll', population: 'adults', source: PEW_POPVOTE, polar: 0.75,
    stakes: { 'young-adult': 0.25, student: 0.2, activist: 0.3, elder: -0.15, taxpayer: -0.1 },
    lines: {
      'young-adult': { pro: 'One person, one vote. Every vote should count the same.' },
      elder: { con: 'The Electoral College makes candidates care about places like ours.' },
      taxpayer: { con: 'The founders built it this way for a reason.' },
      activist: { pro: 'Presidents should have to win the most votes. Period.' },
    },
  },
  {
    id: 'voter-id', label: 'Requiring photo ID to vote', scopes: ['community', 'school'], hint: 'community',
    all: [['voter id', 'photo id', 'id to vote', 'identification to vote', 'show id', 'show an id', 'show identification', 'proof of citizenship', 'prove citizenship', 'prove their citizenship', 'prove they are citizens', 'documentary proof'], ['vote', 'voting', 'voter', 'ballot', 'polls', 'election', 'register']],
    support: 81, basis: 'poll', population: 'adults',
    source: PEW_VOTING('81% of U.S. adults favor requiring government-issued photo ID to vote (January 2024)'), polar: 0.5,
    variants: [
      { when: ['citizenship', 'citizens'], support: 83, label: 'Requiring proof of citizenship to register to vote', basis: 'poll', source: GALLUP_VERIFY },
    ],
    stakes: { elder: 0.2, taxpayer: 0.2, 'young-adult': -0.15, student: -0.1, activist: -0.35, worker: -0.05 },
    lines: {
      elder: { pro: 'I show ID to pick up a prescription. Voting matters more.' },
      'young-adult': { con: 'Not everyone has a license, especially young and low-income voters.' },
      activist: { con: 'Rules like this keep eligible people from voting.', win: 'Free IDs and help getting one.' },
      taxpayer: { pro: 'It’s basic election security.' },
    },
  },
  {
    id: 'election-holiday', label: 'Making Election Day a national holiday', scopes: ['community', 'school', 'business'], hint: 'community',
    all: [['election day'], ['holiday', 'day off', 'off work', 'no school']], support: 72, basis: 'poll', population: 'adults',
    source: PEW_VOTING('72% of U.S. adults favor making Election Day a national holiday (January 2024)'), polar: 0.4,
    stakes: { worker: 0.3, employee: 0.35, parent: 0.1, 'young-adult': 0.2, owner: -0.3, investor: -0.25, taxpayer: -0.1 },
    lines: {
      worker: { pro: 'I could vote without losing a shift.' },
      owner: { con: 'Another paid holiday is a real cost for a small business.' },
      parent: { pro: 'I could actually take my kids to see how voting works.' },
    },
  },
  {
    id: 'auto-registration', label: 'Automatic voter registration', scopes: ['community', 'school'], hint: 'community',
    all: [['automatic voter registration', 'automatically register', 'auto-register', 'automatic registration', 'register everyone']], support: 57, basis: 'poll', population: 'adults',
    source: PEW_VOTING('57% of U.S. adults favor automatically registering all eligible citizens to vote (January 2024)'), polar: 0.65,
    stakes: { student: 0.3, 'young-adult': 0.25, activist: 0.35, elder: -0.1, taxpayer: -0.2 },
    lines: {
      student: { pro: 'I’d be registered the day I turn 18. One less hurdle.' },
      taxpayer: { con: 'Voter rolls need to be accurate, and automatic systems make mistakes.' },
      activist: { pro: 'Voting should be opt-out, not opt-in.' },
    },
  },
  {
    id: 'early-voting', label: 'Two weeks of early in-person voting', scopes: ['community'], hint: 'community',
    all: [['early voting', 'early in-person', 'vote early', 'early vote']], support: 76, basis: 'poll', population: 'adults',
    source: PEW_VOTING('76% of U.S. adults favor requiring at least two weeks of early in-person voting (January 2024)'), polar: 0.4,
    stakes: { worker: 0.25, parent: 0.2, elder: 0.1, commuter: 0.2, taxpayer: -0.1 },
    lines: {
      worker: { pro: 'Two weeks to vote means I don’t have to choose between my job and my ballot.' },
      parent: { pro: 'Much easier to fit in around school pickup.' },
    },
  },
  {
    id: 'vote-by-mail', label: 'Letting anyone vote by mail', scopes: ['community'], hint: 'community',
    all: [['vote by mail', 'mail-in', 'mail ballot', 'absentee', 'voting by mail']], support: 57, basis: 'poll', population: 'adults',
    source: PEW_VOTING('57% of U.S. adults favor allowing any voter to vote by mail if they want to (January 2024)'), polar: 0.75,
    stakes: { elder: 0.15, worker: 0.2, commuter: 0.2, taxpayer: -0.2, activist: 0.2 },
    lines: {
      elder: { pro: 'I can’t stand in line for an hour anymore.' },
      taxpayer: { con: 'Mail ballots are harder to keep secure.' },
      commuter: { pro: 'I’m out of town half the year for work.' },
    },
  },
  {
    id: 'felon-voting', label: 'Voting rights after a felony sentence', scopes: ['community'], hint: 'community',
    all: [['felon', 'felony', 'convicted', 'formerly incarcerated', 'served their sentence', 'served their time'], ['vote', 'voting', 'ballot']], support: 69, basis: 'poll', population: 'adults',
    source: PEW_VOTING('69% of U.S. adults favor allowing people convicted of felonies to vote after serving their sentences (January 2024)'), polar: 0.6,
    stakes: { activist: 0.4, 'young-adult': 0.15, elder: -0.2, taxpayer: -0.15, parent: -0.05 },
    lines: {
      activist: { pro: 'If you’ve served your time, you’re a full citizen again.' },
      elder: { con: 'Some choices should have lasting consequences.' },
    },
  },
  {
    id: 'voting-age', label: 'Lowering the voting age to 16', scopes: ['community', 'school'], hint: 'community',
    all: [['voting age', 'vote at 16', '16-year-olds to vote', '16 year olds to vote', '16-year-olds vote', 'let 16', 'allow 16', 'teens to vote', 'teenagers to vote', 'vote at sixteen']],
    support: 25, basis: 'estimate', population: 'adults', polar: 0.6,
    note: 'Ripple estimate. National polls of adults have found roughly one in six to one in three in favor, depending on the wording; support is much higher among teens.',
    stakes: { student: 0.6, teen: 0.6, 'young-adult': 0.2, activist: 0.3, teacher: 0.1, counselor: 0.05, parent: -0.1, elder: -0.35, taxpayer: -0.15 },
    lines: {
      student: { pro: ['We work, we pay taxes, and we’ll live with these laws the longest. Let us vote.', 'Half my friends already know more about local politics than adults do.'] },
      parent: { con: 'Sixteen-year-olds have enough on their plates.', pro: 'If they’re learning civics anyway, let them practice it.' },
      elder: { con: 'At sixteen I couldn’t decide what to eat for lunch.' },
      teacher: { pro: 'Voting in high school would make civics class real.' },
      activist: { pro: 'People who vote young keep voting for life.' },
    },
  },
  {
    id: 'marijuana', label: 'Legalizing marijuana', scopes: ['community'], hint: 'community',
    all: [['marijuana', 'cannabis', '=weed', 'recreational pot', 'legalize pot']], none: ['ban', 'banning', 'prohibit', 'crack down', 'criminaliz'],
    support: 57, basis: 'poll', population: 'adults', source: PEW_MARIJUANA, polar: 0.6,
    variants: [
      { when: ['recreational', 'adult use', 'adult-use', 'fully legal'], support: 57, label: 'Legalizing recreational marijuana', basis: 'poll', source: PEW_MARIJUANA },
      { when: ['medical', 'medicinal', 'for patients'], support: 88, label: 'Legalizing medical marijuana', basis: 'poll', source: { ...PEW_MARIJUANA, finding: '88% say marijuana should be legal at least for medical use (57% for medical and recreational, 32% medical only)' } },
    ],
    stakes: { 'young-adult': 0.35, activist: 0.2, owner: 0.15, taxpayer: 0.1, elder: -0.3, parent: -0.25, health: -0.1, student: 0.05 },
    lines: {
      'young-adult': { pro: 'Legal and regulated is safer than buying it from who knows who.' },
      elder: { con: 'I don’t want my neighborhood smelling like a concert.' },
      parent: { con: 'I worry it gets easier for teenagers to get their hands on it.' },
      owner: { pro: 'That’s a whole new industry with real jobs.' },
      health: { con: 'I see what heavy use does to developing brains.', pro: 'For some of my patients, it helps with pain when nothing else does.' },
      taxpayer: { pro: 'Tax it like alcohol and fund something useful.' },
    },
  },
  {
    id: 'drug-prices', label: 'Letting Medicare negotiate drug prices', scopes: ['community'], hint: 'community',
    all: [['drug price', 'prescription', 'medicare', 'insulin', 'medication'], ['negotiat', 'lower', '=cap', 'cheaper', 'price']], support: 85, basis: 'poll', population: 'adults', source: KFF_DRUGS, polar: 0.2,
    stakes: { elder: 0.5, health: 0.3, taxpayer: 0.2, worker: 0.15, parent: 0.1, owner: -0.05 },
    lines: {
      elder: { pro: 'My medicine shouldn’t cost more than my groceries.' },
      health: { pro: 'I see patients skipping doses because they can’t afford them.' },
      taxpayer: { pro: 'Medicare is the biggest buyer around. It should negotiate like one.', con: 'Price controls could slow down the next breakthrough drug.' },
    },
  },
  {
    id: 'guns', label: 'New gun laws', scopes: ['community'], hint: 'community',
    all: [['background check', 'assault weapon', 'assault-style', '=gun', '=guns', 'firearm', 'red flag', 'concealed carry', 'rifle', 'handgun']],
    support: 50, basis: 'estimate', population: 'adults', polar: 0.9,
    note: 'Ripple estimate for a general gun proposal. Views depend heavily on the specific policy.',
    variants: [
      { when: ['background check'], support: 81, label: 'Background checks on private and gun-show sales', basis: 'poll', source: PEW_GUNS('81% of U.S. adults favor making private gun sales and sales at gun shows subject to background checks') },
      { when: ['assault weapon', 'assault-style'], support: 63, label: 'Banning assault-style weapons', basis: 'poll', source: PEW_GUNS('63% of U.S. adults favor banning assault-style weapons') },
    ],
    stakes: { parent: 0.2, health: 0.3, activist: 0.3, student: 0.2, elder: -0.15, taxpayer: -0.2, owner: -0.05 },
    lines: {
      parent: { pro: 'I want every buyer checked. No loopholes.' },
      health: { pro: 'I’ve treated gunshot wounds. This is the minimum.' },
      elder: { con: 'Law-abiding owners shouldn’t have to jump through more hoops.' },
      taxpayer: { con: 'People who break the law won’t follow this one either.' },
      student: { pro: 'We do lockdown drills every year. Something has to change.' },
    },
  },
  {
    id: 'ai-rules', label: 'Stronger rules for artificial intelligence', scopes: ['community'], hint: 'community',
    all: [['=ai', 'artificial intelligence', 'deepfake', 'chatbot'], ['regulat', '=rules', '=law', '=laws', 'safety standard', 'oversight', 'label', 'disclose', 'licens', 'guardrail']],
    support: 65, basis: 'estimate', population: 'adults', polar: 0.35,
    note: 'Ripple estimate. Recent surveys (Pew, 2026; Penn’s Annenberg Public Policy Center, 2026) find most Americans doubt AI is regulated enough.',
    stakes: { parent: 0.25, worker: 0.2, elder: 0.2, health: 0.1, 'young-adult': -0.1, owner: -0.1, student: -0.05 },
    lines: {
      parent: { pro: 'I want to know my kid isn’t being fooled by a deepfake.' },
      worker: { pro: 'If AI is going to change my job, I want some rules in place first.' },
      'young-adult': { con: 'Rules written by people who don’t understand the tech could backfire.' },
    },
  },
];
