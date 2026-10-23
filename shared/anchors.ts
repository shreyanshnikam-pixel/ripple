/**
 * Anchors: well-known kinds of decisions with a realistic starting point.
 *
 * When a decision matches an anchor, Ripple calibrates the simulated crowd so
 * that day-one support in the anchor's population matches the anchor, then
 * adjusts for wording (all-or-nothing language, pilots, opt-outs…). Anchors with
 * basis "poll" come from published surveys and link to them. Anchors with basis
 * "estimate" are Ripple's own estimates and say so in the app.
 *
 * Keyword syntax is the same as lexicon.ts: "word" = prefix, "=word" = exact
 * token, anything with a space or symbol = phrase. "@restrict" matches a ban or
 * new rule (or the lifting of one, which flips the anchor).
 */
import type { PollSource, Role, Scope } from './types';
import { CIVIC_ANCHORS, PEW_TAXES } from './anchors-civic';
import { TOPIC_ANCHORS } from './anchors-topics';

/** One or more phrasings per role; different people in the same role get different ones. */
export type Line = { pro?: string | string[]; con?: string | string[]; win?: string | string[]; lose?: string | string[] };

export interface AnchorVariant {
  when: string[];
  support: number;
  label: string;
  basis: 'poll' | 'estimate';
  source?: PollSource;
  note?: string;
  population?: 'adults' | 'parents' | 'everyone';
  /** Wording effects the poll already measured (signal ids such as 'support'), so they aren't added again. */
  includes?: string[];
}

export interface Anchor {
  id: string;
  label: string;
  scopes: Scope[];
  all: (string[] | '@restrict')[];
  none?: string[];
  /** Nudges automatic setting detection toward this scope when matched. */
  hint?: Scope;
  /** A gentle default: used only when nothing else in the text points to a setting. */
  weakHint?: Scope;
  support: number;
  basis: 'poll' | 'estimate';
  population?: 'adults' | 'parents' | 'everyone';
  source?: PollSource;
  note?: string;
  variants?: AnchorVariant[];
  /** Self-interest by role, from -1 (hurts me) to 1 (helps me). */
  stakes: Partial<Record<Role, number>>;
  lines?: Partial<Record<Role, Line>>;
  alternatives?: { title: string; detail: string; decision: string }[];
  polar?: number;
  /** "All"/"every" is part of what this decision means, so it is not penalized again. */
  inherentlyBroad?: boolean;
  /** Wording effects the poll already measured (signal ids such as 'support'), so they aren't added again. */
  includes?: string[];
}

// ── sources (verified) ─────────────────────────────────────────
const PEW_PHONES: PollSource = {
  org: 'Pew Research Center',
  year: 2024,
  url: 'https://www.pewresearch.org/short-reads/2024/10/14/most-americans-back-cellphone-bans-during-class-but-fewer-support-all-day-restrictions/',
  finding: 'U.S. adults on banning middle and high school students from using cellphones',
};
const PEW_TIKTOK: PollSource = {
  org: 'Pew Research Center',
  year: 2025,
  url: 'https://www.pewresearch.org/short-reads/2025/03/25/fewer-americans-now-support-tiktok-ban-see-the-platform-as-a-national-security-threat-than-in-spring-2023/',
  finding: '34% of U.S. adults support a TikTok ban, 32% oppose, 33% are unsure',
};
const PEW_WAGE: PollSource = {
  org: 'Pew Research Center',
  year: 2021,
  url: 'https://www.pewresearch.org/short-reads/2021/04/22/most-americans-support-a-15-federal-minimum-wage/',
  finding: '62% of U.S. adults favor raising the federal minimum wage to $15 an hour',
};
const PEW_CARS: PollSource = {
  org: 'Pew Research Center',
  year: 2023,
  url: 'https://www.pewresearch.org/short-reads/2023/07/13/how-americans-view-electric-vehicles/',
  finding: '40% of U.S. adults favor phasing out new gas-powered cars by 2035; 59% oppose',
};
const PEW_SOCIAL: PollSource = {
  org: 'Pew Research Center',
  year: 2023,
  url: 'https://www.pewresearch.org/short-reads/2023/10/31/81-of-us-adults-versus-46-of-teens-favor-parental-consent-for-minors-to-use-social-media/',
  finding: 'U.S. adults on rules for minors using social media (teens were far less supportive)',
};
const YOUGOV_MEALS: PollSource = {
  org: 'YouGov (via Chalkbeat)',
  year: 2023,
  url: 'https://www.chalkbeat.org/2023/9/7/23863415/polls-support-universal-free-school-meals-breakfast-lunch-students',
  finding: '60% of U.S. adults favor free school lunch for all students',
};
const EDCHOICE_4DAY: PollSource = {
  org: 'EdChoice',
  year: 2023,
  url: 'https://www.edchoice.org/survey-finds-parents-supportive-of-a-four-day-school-week/',
  finding: 'About 60% of parents would support their child’s school moving to a four-day week (43% of non-parents)',
};
const MOTT_START: PollSource = {
  org: 'C.S. Mott Children’s Hospital National Poll',
  year: 2015,
  url: 'https://www.michiganmedicine.org/health-lab/despite-health-and-learning-benefits-half-parents-against-later-school-start-times',
  finding: '51% of parents whose teens start before 8:30 a.m. support a later start',
};
const IPSOS_4DAY: PollSource = {
  org: 'Ipsos',
  year: 2021,
  url: 'https://www.ipsos.com/en-us/news-polls/american-support-4-day-work-week',
  finding: 'About two-thirds of Americans support a four-day work week',
};
const APNORC_DST: PollSource = {
  org: 'AP-NORC',
  year: 2019,
  url: 'https://apnorc.org/projects/daylight-saving-time-vs-standard-time/',
  finding: 'About 7 in 10 Americans prefer to stop switching clocks back and forth',
};

// ── keyword groups ─────────────────────────────────────────────
const PHONES = ['phone', 'cellphone', 'cell phone', 'smartphone', '=cells'];
const DEVICES = ['device', 'electronic', '=laptop', '=laptops', 'chromebook', '=tablet', '=tablets', 'ipad', '=computer', '=computers', '=screens', 'technology', '=tech', 'smartwatch', 'gadget', 'video game', 'headphone', 'earbud'];
const CLASS_ONLY = ['during class', 'in class', 'class time', 'during lessons', 'instructional time', 'during instruction', 'class only', 'in the classroom', 'classrooms'];
const ALL_DAY = ['school day', 'all day', 'entire day', 'whole day', 'bell to bell', 'bell-to-bell', '=lunch', 'between classes', 'at all times', 'all school'];
const MINORS = ['teen', '=kids', '=minors', 'children', 'under 16', 'under 18', 'under 13', 'under 14', '=youth', 'young people', 'students', 'under-16', 'under-18'];
const SOCIAL = ['social media', 'instagram', 'tiktok', 'snapchat', 'facebook', 'social apps'];
const AI = ['=ai', 'artificial intelligence', 'chatgpt', 'chatbot', 'gemini', 'copilot', 'generative'];
const CUT = ['=cut', '=cuts', '=cutting', 'eliminat', '=end', '=drop', 'defund', 'get rid of', '=close', '=cancel', 'shut down', 'scrap'];

/** Ordered from most to least specific: the first match wins. */
export const ANCHORS: Anchor[] = [
  ...CIVIC_ANCHORS,
  ...TOPIC_ANCHORS,
  // ───────────── devices & phones ─────────────
  {
    id: 'devices-school', label: 'Banning all devices at school', scopes: ['school'], weakHint: 'school',
    all: ['@restrict', DEVICES], support: 20, basis: 'estimate', population: 'adults', inherentlyBroad: true, polar: 0.6,
    note: 'No poll asks about banning every device. Pew found 36% of adults back all-day phone bans (2024); taking away the laptops students learn on goes further.',
    stakes: { student: -0.6, teen: -0.5, teacher: -0.15, admin: -0.25, counselor: 0.1, parent: -0.05, coach: 0, worker: -0.3 },
    lines: {
      student: {
        con: ['I do half my homework on a Chromebook. How is that supposed to work?', 'Every assignment is online now. This would set us back years.', 'My accommodations are on my laptop. What happens to me?'],
        pro: 'Maybe a real screen break would actually help me focus.',
        win: ['Keeping school laptops for classwork.', 'A rule that only covers phones, not school devices.', 'Students helping write the rule.'],
      },
      teacher: { con: 'Half my lessons run on laptops. I’d have to rebuild my whole class.', pro: 'Paper and pencil never crashed in the middle of a test.', win: 'An exception for the laptops we teach with.' },
      admin: { con: 'We just spent the tech budget putting a laptop in every student’s hands.', pro: 'No devices means no more cheating scandals and no more fights on video.' },
      parent: { con: 'My kid needs a laptop for homework and a phone so I can reach them.', pro: 'Less screen time at school? I won’t argue, as long as I can still reach them.', win: 'A way to reach their kid in an emergency.' },
      counselor: { pro: 'A screen-free day could do wonders for student anxiety.', con: 'Some students rely on their devices for accommodations.' },
      worker: { con: 'No phone and no laptop means I can’t even check my work schedule.' },
      coach: { con: 'Our team schedules and rides all go through an app.' },
    },
    alternatives: [{ title: 'Narrow it to phones during class', detail: 'Keep the laptops students learn on and limit phones only during class. That version has majority support in national polling.', decision: 'Ban phones during class only' }],
  },
  {
    id: 'phones-school', label: 'Restricting phones at school', scopes: ['school'], weakHint: 'school',
    all: ['@restrict', PHONES], support: 42, basis: 'estimate', population: 'adults', polar: 0.5,
    note: 'Between Pew’s in-class (68%) and all-day (36%) findings, since the wording doesn’t say which.',
    source: PEW_PHONES,
    variants: [
      { when: CLASS_ONLY, support: 68, label: 'Banning phones during class', basis: 'poll', source: { ...PEW_PHONES, finding: '68% of U.S. adults support banning students’ cellphones during class' } },
      { when: ALL_DAY, support: 36, label: 'Banning phones for the whole school day', basis: 'poll', source: { ...PEW_PHONES, finding: '36% of U.S. adults support banning students’ cellphones for the entire school day; 53% oppose' } },
    ],
    stakes: { student: -0.5, teen: -0.35, teacher: 0.45, admin: 0.3, counselor: 0.35, parent: 0.1, coach: 0.15, worker: -0.3 },
    lines: {
      student: {
        con: ['My phone is how I keep track of everything, from my schedule to my ride home.', 'What if there’s a lockdown and I can’t text my mom?', 'They treat us like little kids. We can handle having a phone.'],
        pro: ['Honestly, it would be nice not to feel like I have to check my phone all day.', 'If everyone has to put theirs away, nobody feels left out.'],
        win: ['Phones allowed at lunch and between classes.', 'Students getting a say in how the rule works.', 'A way to text family in an emergency.'],
        lose: 'Getting their phone taken away for a whole week.',
      },
      teacher: {
        pro: ['I’d finally have their full attention. Right now I spend half my class policing screens.', 'The difference in focus would show up in test scores within a semester.'],
        con: 'I’m not excited about becoming the phone police.',
        lose: ['So many exceptions that it can’t be enforced.', 'Teachers being left to enforce it alone.'],
      },
      parent: { con: 'If there’s an emergency, I need to be able to reach my kid.', pro: 'Less scrolling, more learning. I’m for it, as long as I can still reach my kid in an emergency.', win: 'A guaranteed way to reach their kid in an emergency.', lose: 'Not being able to reach their kid during a lockdown.' },
      admin: { pro: 'Fewer phones means fewer fights filmed in the hallway and fewer distractions.', con: 'Enforcement falls on my staff, and that’s a lot of confiscated phones.' },
      counselor: { pro: 'So much of the drama I deal with starts in a group chat during class.', con: 'Some students use their phones to manage anxiety. We’d need a plan for them.' },
      worker: { con: 'My manager texts me shift changes during the day. I need my phone.', win: 'An exception for students who work.' },
      coach: { pro: 'Kids who aren’t glued to their screens are better teammates.', lose: 'Losing the team group chat for rides and schedules.' },
    },
    alternatives: [{ title: 'Limit it to class time', detail: 'Let students keep phones at lunch and between classes. In national polling, in-class bans draw far more support than all-day bans.', decision: 'Ban phones during class only' }],
  },
  {
    id: 'devices-community', label: 'Banning personal devices for everyone', scopes: ['community'],
    all: ['@restrict', [...PHONES, ...DEVICES]], support: 5, basis: 'estimate', population: 'adults', inherentlyBroad: true, polar: 0.3,
    note: 'Ripple estimate. Taking phones and computers away from adults has essentially no public support.',
    stakes: { 'young-adult': -0.4, worker: -0.35, owner: -0.45, commuter: -0.3, elder: 0.1, parent: -0.2, health: -0.1, student: -0.5, teen: -0.4, taxpayer: -0.1 },
    lines: {
      owner: { con: 'My register, my orders, my schedule: it all runs on a tablet. You’d shut me down.' },
      worker: { con: 'My job runs on a laptop. Am I supposed to quit?' },
      elder: { con: 'My phone is how I reach my doctor and my grandkids.', pro: 'People spend too much time staring at screens anyway.', win: 'Knowing they could still call family and their doctor.' },
      parent: { con: 'How am I supposed to reach my kids?', win: 'Knowing they can still reach their kids.' },
      health: { con: 'People call 911 from those phones.' },
      'young-adult': { con: 'That’s not a policy. That’s a fantasy.' },
      student: { con: 'Everything from my homework to my bus pass is on my phone.' },
      taxpayer: { con: 'Who is going to enforce this, and what will that cost us?' },
      commuter: { con: 'My train pass, my maps, my tickets. All on my phone.' },
    },
    alternatives: [{ title: 'Pick a place, not everything', detail: 'Phone-free zones, like quiet hours at the library or phone-free events, are far easier to accept than a total ban.', decision: 'Create phone-free zones at the library and community center' }],
  },
  {
    id: 'phones-work', label: 'Restricting phones at work', scopes: ['business'],
    all: ['@restrict', PHONES], support: 35, basis: 'estimate', population: 'everyone',
    stakes: { employee: -0.5, worker: -0.4, manager: 0.35, owner: 0.3, investor: 0.2, customer: 0.1, regular: 0.15, creator: -0.3 },
    lines: {
      employee: { con: 'My kid’s school calls me on my phone. I can’t just switch it off.', win: 'Phones allowed on breaks.' },
      manager: { pro: 'Fewer phones on the floor means faster service.' },
      regular: { pro: 'I’d love a cashier who actually looks up and says hello.' },
    },
  },
  // ───────────── social media ─────────────
  {
    id: 'social-minors', label: 'Limiting social media for minors', scopes: ['community', 'school'],
    all: [SOCIAL, MINORS], support: 65, basis: 'estimate', population: 'adults', source: PEW_SOCIAL,
    note: 'Pew found 69–81% of adults back specific limits (2023). A broader rule is estimated lower.',
    variants: [
      { when: ['parental consent', 'parent consent', 'permission from', 'parents to approve', 'parental permission', 'parental approval'], support: 81, label: 'Parental consent for minors on social media', basis: 'poll', source: { ...PEW_SOCIAL, finding: '81% of U.S. adults favor requiring parental consent for minors to open social media accounts' } },
      { when: ['age verification', 'verify age', 'verify their age', 'prove their age', 'age check'], support: 71, label: 'Age verification for social media', basis: 'poll', source: { ...PEW_SOCIAL, finding: '71% of U.S. adults favor requiring age verification to use social media' } },
      { when: ['time limit', 'limit time', 'hours a day', 'per day', 'daily limit'], support: 69, label: 'Time limits on minors’ social media use', basis: 'poll', source: { ...PEW_SOCIAL, finding: '69% of U.S. adults favor time limits on minors’ social media use' } },
      { when: ['=ban', '=banning', 'prohibit', 'under 16', 'under-16', 'outlaw'], support: 55, label: 'Banning social media for minors', basis: 'estimate', note: 'Ripple estimate, below the 69–81% Pew found for narrower limits (2023).' },
    ],
    stakes: { teen: -0.55, student: -0.5, parent: 0.35, teacher: 0.2, counselor: 0.3, elder: 0.25, 'young-adult': -0.1, creator: -0.4 },
    lines: {
      student: { con: 'Social media is how I keep up with my friends and my clubs.', pro: 'Honestly, I’d probably be happier with less of it.', win: 'Rules that teens helped write.' },
      parent: { pro: 'I want a say in what my kid sees online.', con: 'It’s my job to manage this, not the government’s.' },
      counselor: { pro: 'I see what late-night scrolling does to teens’ sleep and mood.' },
      teacher: { pro: 'Half the conflicts in my classroom start online.' },
      elder: { pro: 'Kids need to go outside and talk to each other.' },
      'young-adult': { con: 'Age checks mean handing your ID to every app. No thanks.' },
      creator: { con: 'Teens are a big part of my audience, and this cuts them off.' },
    },
  },
  {
    id: 'tiktok-ban', label: 'Banning TikTok', scopes: ['community', 'school'],
    all: ['@restrict', ['tiktok']], none: MINORS, support: 34, basis: 'poll', population: 'adults', source: PEW_TIKTOK, polar: 0.5,
    stakes: { teen: -0.5, student: -0.45, 'young-adult': -0.35, creator: -0.6, elder: 0.25, parent: 0.1, owner: -0.1, taxpayer: 0.05 },
    lines: {
      'young-adult': { con: 'It’s where I get half my news and all my recipes.' },
      student: { con: 'Every trend, every joke, every friend. It’s all there.' },
      elder: { pro: 'I’ve heard enough about who’s collecting that data.' },
      parent: { pro: 'I’d sleep better knowing my kid isn’t on it.' },
      owner: { con: 'That app sends me customers every weekend.' },
      creator: { con: 'That’s my income you’re talking about.' },
    },
  },
  // ───────────── economy & policy ─────────────
  {
    id: 'min-wage', label: 'Raising the minimum wage', scopes: ['community'],
    all: [['minimum wage', 'living wage']], support: 58, basis: 'estimate', population: 'adults',
    note: 'Without a specific amount, Ripple starts a little below Pew’s 62% for $15.',
    variants: [
      { when: ['$15', '15 an hour', '15 dollars'], support: 62, label: 'A $15 minimum wage', basis: 'poll', source: PEW_WAGE },
      { when: ['$17', '$18', '$20', '$22', '$25', '20 an hour', '25 an hour'], support: 48, label: 'A minimum wage above $15', basis: 'estimate', note: 'Ripple estimate: a bigger jump than the $15 level that drew 62% (Pew, 2021).' },
    ],
    stakes: { worker: 0.45, employee: 0.5, 'young-adult': 0.25, student: 0.2, owner: -0.5, investor: -0.4, taxpayer: -0.15, manager: -0.2, elder: -0.05, activist: 0.35, parent: 0.15 },
    lines: {
      worker: { pro: 'I could finally cover rent without a second job.' },
      owner: { con: 'I want to pay more. But if wages jump that fast, I’ll have to cut hours.', win: 'A gradual phase-in and help for small businesses.' },
      taxpayer: { con: 'Prices go up for everyone, including people on fixed incomes.' },
      'young-adult': { pro: 'Nobody can live on today’s minimum wage. Not around here.' },
      activist: { pro: 'Work should pay enough to live on. Period.' },
      elder: { con: 'My grocery bill will be the first thing to go up.' },
    },
  },
  {
    id: 'gas-cars', label: 'Phasing out gas-powered cars', scopes: ['community'],
    all: [['gas-powered car', 'gas car', 'gas-powered vehicle', 'gas vehicle', 'gasoline car', 'gasoline vehicle', 'combustion engine', 'new gas'], ['phase out', '=ban', '=banning', '=end', 'stop selling', 'by 2035', 'by 2030', 'outlaw']],
    support: 40, basis: 'poll', population: 'adults', source: PEW_CARS, polar: 0.7,
    stakes: { activist: 0.6, 'young-adult': 0.2, student: 0.2, commuter: -0.35, elder: -0.35, owner: -0.25, worker: -0.15, taxpayer: -0.2, health: 0.2, parent: -0.1 },
    lines: {
      commuter: { con: 'Electric cars cost more, and I drive 40 miles a day.' },
      activist: { pro: 'Transportation is a huge source of emissions. This is how we cut them.' },
      elder: { con: 'I can’t afford a new electric car on my income.' },
      owner: { con: 'My delivery van isn’t cheap to replace.' },
      health: { pro: 'Cleaner air means fewer asthma attacks in my ER.' },
    },
  },
  {
    id: 'daylight-saving', label: 'Ending clock changes', scopes: ['community'],
    all: [['daylight saving', 'changing the clock', 'change the clock', 'clock change', 'time change', 'standard time', 'switching clocks']],
    support: 70, basis: 'poll', population: 'adults', source: APNORC_DST,
    stakes: { parent: 0.1, commuter: 0.1, elder: 0.05 },
  },
  {
    id: 'tax-the-rich', label: 'Taxing high earners or big companies', scopes: ['community'],
    all: [['=tax', '=taxes', '=taxing'], ['=rich', 'millionaire', 'billionaire', 'wealthy', 'corporation', 'big companies', 'large businesses', 'top 1%', 'high earners', 'high-income', '$400', '400,000']],
    support: 60, basis: 'estimate', population: 'adults', polar: 0.7,
    variants: [
      { when: ['corporation', 'big companies', 'large businesses', 'big business'], support: 63, label: 'Raising taxes on large corporations', basis: 'poll', source: PEW_TAXES('63% of U.S. adults say tax rates on large businesses and corporations should be raised') },
      { when: ['$400', '400,000', 'high earners', 'high-income', 'wealthy', '=rich', 'millionaire', 'billionaire', 'top 1%'], support: 58, label: 'Raising taxes on high-income households', basis: 'poll', source: PEW_TAXES('58% of U.S. adults say tax rates on household income over $400,000 should be raised') },
    ],
    stakes: { owner: -0.3, investor: -0.5, taxpayer: -0.1, worker: 0.2, activist: 0.4, 'young-adult': 0.15 },
  },
  {
    id: 'local-tax', label: 'Raising a local tax', scopes: ['community'], hint: 'community',
    all: [['=tax', '=taxes', 'levy', '=bond', 'millage']], none: ['cut taxes', 'lower taxes', 'tax cut', 'tax break', 'tax relief', 'reduce taxes', 'tax credit'],
    support: 45, basis: 'estimate', population: 'everyone', polar: 0.6,
    note: 'Ripple estimate. Local tax measures often land near an even split, depending on what they fund.',
    variants: [
      {
        when: ['teacher', 'educator'], support: 67, label: 'A local tax to raise teacher pay', basis: 'poll',
        source: { org: 'PDK Poll', year: 2023, url: 'https://pdkpoll.org/2023-pdk-poll-results/', finding: '67% of U.S. adults would support raising local property taxes to increase teacher salaries; 31% oppose' },
      },
      { when: ['school', 'library', 'librar', '=park', '=parks', 'fire', 'police', 'roads', 'hospital'], support: 50, label: 'A local tax for public services', basis: 'estimate', note: 'Ripple estimate. Taxes tied to schools, libraries or safety tend to do better than general increases.' },
    ],
    stakes: { taxpayer: -0.6, elder: -0.35, owner: -0.3, parent: 0.05, student: 0.15, 'young-adult': 0.1, activist: 0.2, health: 0.1 },
    lines: {
      taxpayer: { con: 'Show me the line items before you ask for more of my money.', win: 'A sunset date and a public report on every dollar.' },
      elder: { con: 'On a fixed income, every tax increase is a cut to my groceries.', win: 'An exemption for seniors on fixed incomes.' },
      owner: { con: 'My customers will feel this at the register.' },
      parent: { pro: 'If it’s for our kids and our town, I’ll pay it.' },
      student: { pro: 'The library is where I study. It’s worth a few cents.' },
    },
  },
  {
    id: 'free-transit', label: 'Free public transit', scopes: ['community'],
    all: [['=bus', '=buses', 'transit', 'subway', '=train', '=trains', 'public transportation'], ['=free', 'fare-free', 'no fare', 'zero fare', 'no cost']],
    support: 55, basis: 'estimate', population: 'everyone',
    stakes: { commuter: 0.3, 'young-adult': 0.3, student: 0.4, worker: 0.3, elder: 0.25, taxpayer: -0.5, owner: 0.05, activist: 0.5, parent: 0.2 },
    lines: {
      student: { pro: 'I could actually get to my job and my classes without asking for rides.' },
      taxpayer: { con: 'Nothing is free. Someone pays for every one of those rides.' },
      activist: { pro: 'Fewer cars, cleaner air, and fairer access. That’s a triple win.' },
    },
  },
  {
    id: 'parking-to-park', label: 'Turning parking into a park', scopes: ['community'],
    all: [['parking'], ['=park', '=parks', 'green space', 'plaza', 'garden', 'playground']], support: 55, basis: 'estimate', population: 'everyone',
    stakes: { owner: -0.45, commuter: -0.3, activist: 0.5, parent: 0.3, 'young-adult': 0.25, elder: -0.1, health: 0.2, student: 0.3 },
    lines: {
      owner: { con: 'Half my customers drive in. Where are they supposed to park?', win: 'Replacement parking within a block of Main Street.' },
      parent: { pro: 'A safe place for my kids to play downtown? Yes.' },
      activist: { pro: 'Asphalt to trees. That’s a win for heat, for health and for people.' },
      elder: { con: 'I need to park close. My knees aren’t what they used to be.' },
    },
  },
  {
    id: 'leaf-blowers', label: 'Banning gas leaf blowers', scopes: ['community'],
    all: [['leaf blower', 'gas-powered lawn', 'gas lawn', 'lawn equipment', 'lawn mower']], support: 45, basis: 'estimate', population: 'everyone',
    stakes: { owner: -0.35, worker: -0.2, activist: 0.5, elder: 0.1, health: 0.2 },
    lines: {
      owner: { con: 'Landscapers like me would have to replace thousands of dollars of equipment.', win: 'A rebate to replace gas equipment.' },
      elder: { pro: 'I’d finally get some quiet on Saturday mornings.' },
    },
  },
  {
    id: 'plastic', label: 'Banning single-use plastics', scopes: ['community', 'business'],
    all: [['plastic bag', 'plastic straw', 'styrofoam', 'single-use', 'plastic utensil', 'plastic cup']], support: 50, basis: 'estimate', population: 'everyone',
    stakes: { activist: 0.5, owner: -0.3, customer: -0.15, 'young-adult': 0.15, student: 0.2, elder: -0.1, creator: 0.3 },
  },
  {
    id: 'speed-cameras', label: 'Adding traffic cameras', scopes: ['community', 'school'], hint: 'community',
    all: [['speed camera', 'red light camera', 'red-light camera', 'traffic camera', 'speed cameras']], support: 55, basis: 'estimate', population: 'everyone',
    stakes: { parent: 0.4, commuter: -0.35, 'young-adult': -0.2, elder: 0.2, health: 0.3, taxpayer: -0.1 },
    lines: {
      parent: { pro: 'Cars fly past my kids’ school every morning. Slow them down.' },
      commuter: { con: 'It’s a money grab dressed up as safety.' },
    },
  },
  {
    id: 'bike-lanes', label: 'Adding bike lanes', scopes: ['community'],
    all: [['bike lane', 'cycle track', 'protected lane', 'bikeway']], support: 50, basis: 'estimate', population: 'everyone',
    stakes: { commuter: -0.2, 'young-adult': 0.3, activist: 0.5, owner: -0.3, elder: -0.25, parent: 0.15, health: 0.25, student: 0.3 },
  },
  {
    id: 'teen-curfew', label: 'A curfew for teens', scopes: ['community'],
    all: [['curfew']], support: 45, basis: 'estimate', population: 'everyone', polar: 0.7,
    stakes: { teen: -0.6, student: -0.55, parent: 0.3, elder: 0.4, owner: -0.25, 'young-adult': -0.2 },
    lines: {
      student: { con: 'So now we’re suspects just for being outside?' },
      elder: { pro: 'Nothing good happens on the street after midnight.' },
      owner: { con: 'Teens are my late-night customers.' },
    },
  },
  // ───────────── school life ─────────────
  {
    id: 'four-day-school', label: 'A four-day school week', scopes: ['school', 'community'],
    all: [['four-day', '4-day', 'four day']], none: ['work week', 'workweek', 'work-week', 'employees', 'staff to work'],
    support: 60, basis: 'poll', population: 'parents', source: EDCHOICE_4DAY,
    stakes: { student: 0.55, teen: 0.5, teacher: 0.25, coach: 0.1, admin: -0.05, worker: 0.2, taxpayer: -0.1, elder: -0.2 },
    lines: {
      student: { pro: 'A three-day weekend every week? I’d actually recharge.' },
      parent: { con: 'Who’s watching my kids on Fridays while I’m at work?', pro: 'Longer days and a free Friday? Our family could make that work.', win: 'Affordable Friday childcare.' },
      teacher: { pro: 'An extra planning day would make me a better teacher.', con: 'Longer days are exhausting, for the kids and for me.' },
      admin: { con: 'Childcare, buses, and meals for kids who rely on school lunch all get complicated.' },
      worker: { pro: 'I could pick up a full shift on Fridays.' },
    },
  },
  {
    id: 'four-day-work', label: 'A four-day work week', scopes: ['business', 'community'],
    all: [['four-day work', '4-day work', 'four-day workweek', '4-day workweek', '32-hour', 'four day work']], support: 66, basis: 'poll', population: 'adults', source: IPSOS_4DAY,
    stakes: { employee: 0.5, worker: 0.45, 'young-adult': 0.3, manager: -0.15, investor: -0.35, owner: -0.3, customer: -0.1, regular: -0.15, supplier: -0.1 },
    lines: {
      employee: { pro: 'Same work, one more day to live my life. Yes.' },
      manager: { con: 'Coverage gets hard when everyone wants the same day off.' },
      investor: { con: 'Fewer hours for the same pay? Show me the productivity numbers.' },
      regular: { con: 'If you’re closed on Fridays, I’ll have to go somewhere else that day.' },
    },
  },
  {
    id: 'free-meals', label: 'Free school meals for all', scopes: ['school', 'community'],
    all: [['=lunch', '=lunches', '=meals', '=breakfast', '=breakfasts', '=food'], ['=free', 'no cost', 'universal', 'no charge']], support: 60, basis: 'poll', population: 'adults', source: YOUGOV_MEALS,
    stakes: { parent: 0.35, student: 0.35, counselor: 0.3, health: 0.25, teacher: 0.2, taxpayer: -0.45, elder: -0.1, owner: -0.1, activist: 0.35, admin: 0.05 },
    lines: {
      parent: { pro: 'That’s one less bill every month, and one less thing to worry about.' },
      student: { pro: 'Some of my friends skip lunch because they can’t pay. That’s not okay.' },
      taxpayer: { con: 'Free for everyone means paid for by everyone, including families who can afford lunch.' },
      counselor: { pro: 'Hungry kids can’t focus. It’s that simple.' },
      teacher: { pro: 'No more kids hiding that they can’t afford lunch.' },
    },
  },
  {
    id: 'later-start', label: 'A later school start time', scopes: ['school', 'community'],
    all: [['start later', 'later start', 'late start', 'start school later', 'start at 8:30', 'start at 9', '8:30', '8:45', '9:00', '9:15', '9:30', 'sleep in', 'start time later', 'start the school day later']],
    support: 51, basis: 'poll', population: 'parents', source: MOTT_START,
    stakes: { student: 0.55, teen: 0.5, counselor: 0.45, health: 0.4, teacher: 0.05, coach: -0.35, admin: -0.2, worker: -0.1 },
    lines: {
      student: { pro: 'I’d actually be awake for first period.' },
      parent: { con: 'I have to be at work by 8. Who’s getting my kids to school?', pro: 'My teenager is a zombie every morning. This would help.', win: 'A before-school drop-off program.' },
      coach: { con: 'Later dismissal means practices end in the dark.', win: 'A plan for practice times and lights.' },
      admin: { con: 'Our bus routes are built around the current bell schedule.' },
      counselor: { pro: 'Sleep-deprived teens are anxious teens. This helps.' },
      worker: { con: 'If school ends later, I lose hours at work.' },
    },
  },
  {
    id: 'earlier-start', label: 'An earlier school start time', scopes: ['school'],
    all: [['start earlier', 'earlier start', 'start school earlier', 'start at 7', '=7:00', '6:30', '6:45', '7:15']], support: 20, basis: 'estimate', population: 'everyone',
    stakes: { student: -0.55, teen: -0.5, coach: 0.2, parent: 0.05, counselor: -0.4, worker: 0.2 },
  },
  {
    id: 'uniforms', label: 'Requiring school uniforms', scopes: ['school'], hint: 'school',
    all: [['=uniform', '=uniforms', 'dress code']], support: 50, basis: 'estimate', population: 'adults',
    note: 'Ripple estimate. Older national polls found about half of adults in favor.',
    stakes: { student: -0.5, teen: -0.4, parent: 0.2, admin: 0.3, teacher: 0.1, worker: -0.15 },
    lines: {
      student: { con: 'What I wear is one of the few ways I get to express myself here.', pro: 'Honestly, it would save me a lot of stress picking outfits.' },
      parent: { pro: 'Fewer fights about clothes, and no more brand-name pressure.', con: 'Uniforms aren’t cheap, and kids outgrow them fast.', win: 'Free or low-cost uniforms for families who need them.' },
      admin: { pro: 'It’s easier to keep campus safe when we can spot who doesn’t belong.' },
    },
  },
  {
    id: 'ai-ban', label: 'Banning AI tools for schoolwork', scopes: ['school'],
    all: ['@restrict', AI], support: 50, basis: 'estimate', population: 'everyone',
    stakes: { student: -0.4, teacher: 0.4, admin: 0.2, parent: 0.1, counselor: 0 },
    lines: {
      student: { con: 'Everyone is going to use AI at work. We should learn to use it well.' },
      teacher: { pro: 'I need to know the work I’m grading is actually theirs.' },
    },
  },
  {
    id: 'ai-allow', label: 'Allowing AI tools for schoolwork', scopes: ['school'],
    all: [AI, ['=allow', '=let', '=permit', '=use', '=using', 'embrace', 'teach', 'integrat']], support: 40, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.45, teacher: -0.4, admin: -0.2, parent: -0.1, counselor: 0 },
    lines: {
      student: { pro: 'Everyone is going to use AI at work. We should learn to use it well.' },
      teacher: { con: 'I need to know the work I’m grading is actually theirs.' },
    },
  },
  {
    id: 'homework', label: 'Getting rid of homework', scopes: ['school'], hint: 'school',
    all: [['homework'], [...CUT, '=no', '=ban', '=less', 'reduce', 'limit']], support: 35, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.6, teacher: -0.4, parent: -0.05, admin: -0.2, counselor: 0.3, coach: 0.2, worker: 0.2 },
    lines: {
      student: { pro: 'I could actually sleep, work my shift, and still have a life.' },
      teacher: { con: 'Practice is how skills stick. One class period isn’t enough.' },
      parent: { pro: 'Our evenings are a battle over worksheets. I’d love them back.', con: 'Homework is how I know what my kid is learning.' },
    },
  },
  {
    id: 'cancel-event', label: 'Cancelling a beloved event', scopes: ['school', 'community'],
    all: [CUT, ['=prom', 'homecoming', 'graduation', 'field day', 'festival', '=parade', 'fireworks', 'pep rally', 'spirit week', 'school dance', 'talent show', 'senior trip', 'fourth of july', 'carnival']],
    support: 12, basis: 'estimate', population: 'everyone',
    note: 'Ripple estimate. Traditions people look forward to rarely lose without a fight.',
    stakes: { student: -0.6, teen: -0.55, parent: -0.3, teacher: -0.05, admin: 0.2, taxpayer: 0.2, elder: -0.25, owner: -0.2, coach: -0.2, 'young-adult': -0.2 },
    lines: {
      student: { con: ['It’s one of the few things we look forward to all year.', 'We only get one senior year. You can’t give that back.'] },
      parent: { con: 'I want my kid to have the memories I had.' },
      admin: { pro: 'Fewer liability headaches and one less thing to chaperone.' },
      owner: { con: 'That event is one of my busiest nights of the year.' },
    },
    alternatives: [{ title: 'Fix the problem, keep the event', detail: 'Change the date, the venue or the budget instead. People forgive changes to a tradition far more easily than losing it.', decision: 'Keep the event, with a smaller budget and a new venue' }],
  },
  {
    id: 'close-place', label: 'Closing a place people use', scopes: ['community', 'school'],
    all: [CUT, ['library', 'librar', '=pool', 'community center', 'senior center', 'post office', 'fire station', 'clinic', 'hospital', 'rec center', 'youth center', 'skate park']],
    support: 15, basis: 'estimate', population: 'everyone', polar: 0.5,
    note: 'Ripple estimate. Closing a well-used public place is one of the hardest local decisions to win.',
    stakes: { elder: -0.4, parent: -0.35, student: -0.4, teen: -0.35, health: -0.2, taxpayer: 0.4, activist: -0.3, owner: -0.1, 'young-adult': -0.15 },
    lines: {
      elder: { con: 'That’s where I go to see people. Some weeks it’s the only place I go.' },
      student: { con: 'It’s the only quiet place I have to study after school.' },
      parent: { con: 'Story time there is the highlight of my kids’ week.' },
      taxpayer: { pro: 'If hardly anyone uses it, we shouldn’t keep paying for it.' },
    },
    alternatives: [{ title: 'Share it instead of closing it', detail: 'Cut hours, share the building with another service, or ask volunteers to help. Partial changes keep most supporters on board.', decision: 'Keep the library open with shorter hours and shared space' }],
  },
  {
    id: 'shorter-school', label: 'A shorter school day', scopes: ['school'], hint: 'school',
    all: [['end at noon', 'shorter school day', 'shorter day', 'half day', 'half-day', 'end school early', 'end at 1', 'end at 12', 'out at noon']],
    support: 30, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.6, teen: 0.55, parent: -0.45, teacher: 0.1, admin: -0.3, coach: 0.2, worker: 0.3, counselor: 0.1 },
    lines: {
      student: { pro: 'I’d actually have time for a job, a sport and some sleep.' },
      parent: { con: 'I work until five. What happens to my kids all afternoon?' },
      admin: { con: 'We’d lose instruction time we can’t make up.' },
    },
  },
  {
    id: 'cut-programs', label: 'Cutting arts, sports or clubs', scopes: ['school', 'community'],
    all: [CUT, ['=arts', '=art', '=music', '=sports', 'athletics', '=band', '=clubs', '=club', 'theater', 'theatre', 'after-school', 'field trip', 'elective']],
    support: 15, basis: 'estimate', population: 'everyone',
    stakes: { student: -0.5, coach: -0.7, teacher: -0.35, parent: -0.4, counselor: -0.35, taxpayer: 0.45, admin: 0.05, elder: -0.2 },
    lines: {
      student: { con: 'That program is the reason some of us even show up.' },
      coach: { con: 'For a lot of these kids, the team is their family.' },
      parent: { con: 'That’s where my kid found their people.' },
      taxpayer: { pro: 'Tight budgets mean hard choices. Core services come first.' },
    },
  },
  {
    id: 'longer-school', label: 'More time in school', scopes: ['school'], hint: 'school',
    all: [['longer school day', 'extend the school day', 'longer day', 'year-round', 'year round', 'shorter summer', 'shorten summer', 'cancel summer', 'no summer', 'end summer break', 'eliminate summer', 'get rid of summer', 'saturday school', 'school on saturday', 'extra hour', 'longer school year']],
    support: 22, basis: 'estimate', population: 'everyone',
    variants: [{ when: ['cancel summer', 'no summer', 'end summer break', 'eliminate summer', 'get rid of summer'], support: 6, label: 'Cancelling summer break', basis: 'estimate', note: 'Ripple estimate. Year-round calendars that keep shorter breaks do far better than removing summer outright.' }],
    stakes: { student: -0.65, teen: -0.6, teacher: -0.4, coach: -0.2, counselor: -0.2, parent: 0.15, taxpayer: -0.2 },
    lines: {
      student: { con: 'We’re already exhausted. Longer days won’t make us learn more.' },
      teacher: { con: 'Who pays for the extra hours? Not me, apparently.' },
      parent: { pro: 'Honestly, it would help with childcare.' },
    },
  },
  {
    id: 'open-campus', label: 'Open-campus lunch', scopes: ['school'], hint: 'school',
    all: [['open campus', 'off-campus lunch', 'leave campus', 'leave for lunch', 'off campus']], support: 45, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.55, parent: -0.35, admin: -0.45, teacher: -0.1, owner: 0.4 },
    lines: {
      student: { pro: 'Forty minutes of freedom would make the whole day better.' },
      parent: { con: 'Teens driving around at lunch is how accidents happen.' },
      admin: { con: 'If something happens off campus, it’s still on us.' },
    },
  },
  {
    id: 'no-exams', label: 'Dropping exams', scopes: ['school'], hint: 'school',
    all: [['final exam', '=finals', 'standardized test', '=exams', '=exam', '=tests', '=sat', '=act'], [...CUT, '=replace', '=replacing', 'instead', '=no', 'optional']],
    support: 45, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.5, teacher: -0.15, parent: -0.1, admin: -0.25, counselor: 0.3 },
  },
  {
    id: 'mental-health-days', label: 'Mental health days', scopes: ['school'], hint: 'school',
    all: [['mental health day', 'wellness day', 'mental-health day']], support: 70, basis: 'estimate', population: 'everyone',
    stakes: { student: 0.5, counselor: 0.5, parent: 0.15, teacher: 0, admin: -0.1 },
  },
  // ───────────── business ─────────────
  {
    id: 'price-increase', label: 'Raising prices', scopes: ['business'],
    all: [['=price', '=prices', 'pricing', 'charge more', '=menu'], ['raise', 'increase', '=up', 'higher', '=hike', 'charge more']],
    support: 22, basis: 'estimate', population: 'everyone',
    variants: [{ when: ['=wage', '=wages', 'pay staff', 'pay our staff', 'living wage', 'pay raise', 'benefits', 'pay our team', 'workers'], support: 40, label: 'Raising prices to pay staff more', basis: 'estimate', note: 'Ripple estimate. Customers accept price increases more readily when they know where the money goes.' }],
    stakes: { customer: -0.5, regular: -0.45, employee: 0.25, manager: 0.1, investor: 0.3, supplier: 0.1, creator: -0.15 },
    lines: {
      regular: { con: 'I’ve been coming here for years. Now I pay more for the same thing?', win: 'A loyalty discount for regulars.' },
      customer: { con: 'There’s another place two blocks away.' },
      employee: { pro: 'If it means I can afford to stay in this job, I’m all for it.' },
      investor: { pro: 'Margins matter. This keeps the lights on.' },
      creator: { con: 'People will screenshot the new menu prices.' },
    },
  },
  {
    id: 'return-to-office', label: 'Requiring a return to the office', scopes: ['business'],
    all: [['return to office', 'return to the office', 'back to the office', 'in-office', 'office five days', 'in the office', '=rto']], support: 30, basis: 'estimate', population: 'everyone',
    stakes: { employee: -0.55, worker: -0.4, manager: 0.3, investor: 0.35, owner: 0.3, neighbor: 0.15, 'young-adult': -0.3 },
    lines: {
      employee: { con: 'I’m more productive at home, and I got two hours of my day back.', win: 'Two flexible days a week.' },
      manager: { pro: 'Teams that sit together solve problems faster.' },
    },
  },
  {
    id: 'remote-work', label: 'Allowing remote work', scopes: ['business'],
    all: [['remote', 'work from home', '=wfh', 'hybrid']], support: 62, basis: 'estimate', population: 'everyone',
    stakes: { employee: 0.5, worker: 0.4, manager: -0.15, investor: -0.2, neighbor: -0.15, regular: -0.05, 'young-adult': 0.25 },
    lines: {
      employee: { pro: 'No commute means more time with my family and more energy for work.' },
      manager: { con: 'It’s harder to train new people when nobody is in the room.' },
    },
  },
  {
    id: 'automation', label: 'Replacing workers with machines', scopes: ['business', 'community'], hint: 'business',
    all: [['self-checkout', 'kiosk', 'robot', 'automat', '=ai', 'chatbot', 'machines'], ['replace', 'replacing', 'instead of', '=cut', 'cashier', 'workers', 'employees', '=jobs', '=staff']],
    support: 25, basis: 'estimate', population: 'everyone', polar: 0.6,
    stakes: { employee: -0.7, worker: -0.6, regular: -0.35, customer: 0.1, investor: 0.45, manager: 0.15, neighbor: -0.2, owner: 0.3, elder: -0.3, creator: -0.1 },
    lines: {
      employee: { con: 'So after three years, I get replaced by a screen?', win: 'Retraining and a real job on the other side.' },
      regular: { con: 'I come here for the people. I don’t want to talk to a machine.' },
      investor: { pro: 'Labor is our biggest cost. This is how we stay competitive.' },
      customer: { pro: 'Honestly, the kiosk is faster.' },
    },
  },
  {
    id: 'eco-packaging', label: 'Switching to eco-friendly packaging', scopes: ['business'],
    all: [['compostable', 'recyclable', 'reusable', 'sustainable packaging', 'eco-friendly', 'plastic-free', 'zero waste']], support: 55, basis: 'estimate', population: 'everyone',
    stakes: { creator: 0.4, neighbor: 0.3, regular: -0.1, investor: -0.15, customer: 0.1, manager: -0.1 },
    lines: {
      creator: { pro: 'My followers love seeing small shops do the right thing.' },
      investor: { con: 'Compostable packaging costs more per order. Who absorbs that?' },
    },
  },
  // ───────────── personal ─────────────
  {
    id: 'dropout', label: 'Dropping out of school', scopes: ['personal'], hint: 'personal',
    all: [['drop out', 'dropout', 'dropping out', 'quit school', 'quit high school', 'leave high school', 'quit college', 'leave college', 'stop going to school']],
    support: 12, basis: 'estimate', population: 'everyone', polar: 0.3,
    stakes: { parent: -0.7, grandparent: -0.6, mentor: -0.55, money: -0.45, friend: -0.1, 'future-self': -0.3, sibling: -0.2, partner: -0.2 },
    lines: {
      parent: { con: 'Please finish school. I’ll help with whatever is making it so hard.', win: 'A different path to a diploma, like online school.' },
      mentor: { con: 'A diploma opens doors you can’t even see yet.' },
      money: { con: 'Without a diploma, a lot of jobs won’t even look at you.' },
      friend: { con: 'I don’t want you to give up on yourself.', pro: 'If school is really hurting you, there are other paths.' },
      'future-self': { con: 'I wish someone had helped us find another way to stay.' },
    },
    alternatives: [{ title: 'Find another path to a diploma', detail: 'Online school, a GED program or a different school keeps doors open while changing what is not working.', decision: 'Switch to an online high school program to finish my diploma' }],
  },
  {
    id: 'quit-to-start', label: 'Quitting a job to start a business', scopes: ['personal'], hint: 'personal',
    all: [['=quit', '=quitting', 'leave my job', 'leaving my job'], ['start a', 'my own', 'own business', 'startup', 'bakery', 'business', 'company', 'side hustle', 'full-time on']],
    support: 45, basis: 'estimate', population: 'everyone',
    stakes: { parent: -0.4, grandparent: -0.4, money: -0.45, partner: -0.25, friend: 0.45, mentor: 0.2, 'future-self': 0.45, sibling: 0.3 },
    lines: {
      parent: { con: 'Your job has health insurance. Does the bakery?', win: 'Seeing a real business plan and some savings.' },
      friend: { pro: 'You’ve talked about this for years. Stop waiting.' },
      money: { con: 'Have six months of savings before you hand in that notice.' },
      'future-self': { pro: 'I don’t remember the risk. I remember being proud we tried.' },
      grandparent: { con: 'A steady paycheck is nothing to sneeze at, kiddo.' },
      partner: { con: 'I believe in you. I’m just scared about rent.' },
      mentor: { pro: 'You have the skills. Make sure you have the plan.' },
    },
  },
  {
    id: 'gap-year', label: 'Taking a gap year', scopes: ['personal'], hint: 'personal',
    all: [['gap year']], support: 45, basis: 'estimate', population: 'everyone',
    stakes: { parent: -0.35, grandparent: -0.35, money: -0.1, friend: 0.4, mentor: 0.1, 'future-self': 0.35, sibling: 0.2 },
    lines: {
      parent: { con: 'I’m afraid you won’t go back once you take a year off.', win: 'A plan for the year and a deferred admission.' },
      friend: { pro: 'A year to figure out what you actually want? That’s smart.' },
      mentor: { con: 'Have a plan for the year, or it will slip away.' },
      'future-self': { pro: 'That year is when I figured out who I was.' },
    },
  },
  {
    id: 'move-away', label: 'Moving away', scopes: ['personal'], hint: 'personal',
    all: [['=move', '=moving', 'relocat', 'across the country', 'out of state', 'another state', 'abroad', 'overseas', 'new city']], support: 45, basis: 'estimate', population: 'everyone',
    stakes: { parent: -0.4, grandparent: -0.5, partner: -0.3, sibling: -0.4, friend: -0.1, mentor: 0.3, 'future-self': 0.4 },
    lines: {
      parent: { con: 'I’ll miss you so much. Who will I call when the sink breaks?' },
      sibling: { con: 'You can’t just leave me here with Mom and Dad.' },
      mentor: { pro: 'New places stretch you in ways home never will.' },
    },
  },
  {
    id: 'pet', label: 'Getting a pet', scopes: ['personal'], hint: 'personal',
    all: [['=adopt', '=get', '=getting', '=buy', 'rescue'], ['=dog', '=puppy', '=cat', '=kitten', '=pet', '=dogs', '=cats']], support: 60, basis: 'estimate', population: 'everyone',
    stakes: { sibling: 0.6, friend: 0.3, parent: -0.1, money: -0.2, partner: 0.2, 'future-self': 0.2 },
  },
  {
    id: 'enlist', label: 'Joining the military', scopes: ['personal'], hint: 'personal',
    all: [['enlist', 'join the military', 'join the army', 'join the navy', 'join the marines', 'join the air force', 'join the coast guard']], support: 45, basis: 'estimate', population: 'everyone',
    stakes: { parent: -0.4, grandparent: 0.3, friend: -0.1, money: 0.2, 'future-self': 0.2, sibling: -0.2 },
  },
  {
    id: 'quit-social', label: 'Quitting social media', scopes: ['personal'], hint: 'personal',
    all: [['delete', '=quit', 'get off', 'take a break from', 'detox', 'stop using'], ['social media', 'instagram', 'tiktok', 'snapchat', 'my phone', 'social apps']], support: 70, basis: 'estimate', population: 'everyone',
    stakes: { parent: 0.4, grandparent: 0.4, friend: -0.15, 'future-self': 0.4, sibling: -0.2, partner: 0.1, mentor: 0.2 },
  },
  {
    id: 'big-purchase', label: 'A big purchase', scopes: ['personal'],
    all: [['=buy', '=buying', 'purchase', '=lease'], ['=car', '=house', '=truck', 'motorcycle', '=condo', '=home']], support: 40, basis: 'estimate', population: 'everyone',
    stakes: { money: -0.35, parent: -0.15, friend: 0.3, sibling: 0.2 },
  },
];
