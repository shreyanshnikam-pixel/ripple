/**
 * Housing, school safety, and climate and energy: the issues districts raise most.
 * Same format as anchors.ts. Every "poll" source below was checked against the
 * publisher's toplines or report; "estimate" entries say so in the app.
 */
import type { Anchor } from './anchors';
import type { PollSource } from './types';

// ── sources (verified) ─────────────────────────────────────────
const YOUGOV_LOCAL = (finding: string): PollSource => ({
  org: 'YouGov',
  year: 2022,
  url: 'https://yougov.com/en-us/articles/43147-development-and-zoning-yougov-poll-june-2022',
  finding,
});
const YOUGOV_HOUSING = (finding: string): PollSource => ({
  org: 'YouGov',
  year: 2022,
  url: 'https://yougov.com/en-us/articles/43242-housing-policy-yougov-poll-july-19-22-2022',
  finding,
});
const AEI_ZONING: PollSource = {
  org: 'AEI Housing Center / Ipsos',
  year: 2026,
  url: 'https://www.aei.org/research-products/report/part-1-findings-from-the-aei-housing-center-may-2026-zoning-and-land-use-flexibility-survey/',
  finding: '48% of U.S. adults support zoning that allows duplexes and townhomes in single-family neighborhoods; 35% oppose, 15% are not sure',
};
const PDK_SAFETY = (finding: string): PollSource => ({
  org: 'PDK Poll',
  year: 2022,
  url: 'https://pdkpoll.org/2022-pdk-poll-results/',
  finding,
});
const PEW_ARMED_TEACHERS: PollSource = {
  org: 'Pew Research Center',
  year: 2023,
  url: 'https://www.pewresearch.org/politics/2023/06/28/gun-violence-widely-viewed-as-a-major-and-growing-national-problem/',
  finding: 'Half of U.S. adults favor allowing teachers and other school officials to carry guns in K–12 schools, up from 43% in 2021 (June 2023)',
};
const PEW_ENERGY: PollSource = {
  org: 'Pew Research Center',
  year: 2026,
  url: 'https://www.pewresearch.org/science/2026/04/03/americans-shifting-views-on-energy-issues/',
  finding: '57% of U.S. adults say developing wind and solar should be the bigger priority, over oil, coal and natural gas (survey of 3,524 adults, March 2026)',
};
const PEW_CLIMATE = (finding: string): PollSource => ({
  org: 'Pew Research Center',
  year: 2023,
  url: 'https://www.pewresearch.org/science/2023/06/28/majorities-of-americans-prioritize-renewable-energy-back-steps-to-address-climate-change/',
  finding,
});
const NORC_SOLAR: PollSource = {
  org: 'NORC AmeriSpeak (for GoodPower)',
  year: 2026,
  url: 'https://goodpower.org/wp-content/uploads/2026/04/PUBLIC_GoodPower_NORC-Solar_Poll-Research_Memo.pdf',
  finding: '68% support solar energy projects being developed in their local community; 16% oppose, 14% are not sure (1,376 U.S. residents, March 2026)',
};
const YOUGOV_STOVES: PollSource = {
  org: 'YouGov',
  year: 2023,
  url: 'https://yougov.com/en-us/daily-results/20230111-063d4-3',
  finding: '40% of U.S. adults support banning gas stoves, 40% oppose and 20% are not sure (January 2023)',
};

const SCHOOL_WORDS = ['school', 'campus', 'classroom', 'students', 'k-12'];
const SECURITY_WORDS = ['metal detector', 'police officer', 'resource officer', 'armed guard', 'armed officer', '=police', '=sro', '=sros', 'security guard', 'security officer', 'clear backpack', 'bag check'];
const POLICE_WORDS = ['police', 'officer', '=sro', '=sros', 'armed guard', 'armed security'];

const SECURITY_STAKES = { parent: 0.35, admin: 0.3, teacher: 0.1, elder: 0.2, student: -0.1, counselor: -0.1, taxpayer: -0.1, activist: -0.3 };
const SECURITY_LINES: Anchor['lines'] = {
  parent: { pro: 'I just want to know my kid is coming home at 3 o’clock.' },
  student: { con: 'It already feels like a checkpoint. Will it make us safer, or just more nervous?', win: 'A say in how it works, and counselors as well as guards.' },
  counselor: { con: 'Security helps. So do counselors, and we’re short on those too.' },
  admin: { pro: 'Families are asking us what we’re doing about safety. This is an answer.' },
  activist: { con: 'Police in schools mean more students punished for small things.' },
};
const securityVariants = (): Anchor['variants'] => [
  { when: ['metal detector'], support: 78, label: 'Metal detectors at school entrances', basis: 'poll', source: PDK_SAFETY('78% of U.S. adults support metal detectors at all school entrances') },
  { when: POLICE_WORDS, support: 80, label: 'Armed police officers at school', basis: 'poll', source: PDK_SAFETY('80% of U.S. adults support armed police officers on duty during school hours') },
];

export const TOPIC_ANCHORS: Anchor[] = [
  // ───────────── housing ─────────────
  {
    id: 'rent-control', label: 'Limiting rent increases', scopes: ['community'], hint: 'community',
    all: [['rent control', 'rent increase', 'rent cap', 'cap rent', 'cap yearly rent', 'cap annual rent', 'rent stabiliz', 'rent freeze', 'freeze rent', 'raising rent', 'raise rent', 'raising the rent', 'rent hike', 'limit rent']],
    support: 61, basis: 'poll', population: 'adults', polar: 0.6,
    source: YOUGOV_HOUSING('61% of U.S. adults support rent controls that prohibit landlords from raising rents; 26% oppose'),
    variants: [
      {
        when: ['=cap', '=caps', 'capping', '=limit', '=limits', 'limiting', 'no more than', '=percent', 'size of'], support: 69, label: 'Limits on how much rent can rise', basis: 'poll', includes: ['support'],
        source: YOUGOV_HOUSING('69% of U.S. adults support limits on the size of rent increases landlords can charge; 21% oppose'),
      },
    ],
    stakes: { 'young-adult': 0.5, worker: 0.35, student: 0.2, elder: 0.1, activist: 0.4, owner: -0.35, investor: -0.6, taxpayer: -0.05 },
    lines: {
      'young-adult': { pro: 'My rent went up 14% last year. My paycheck didn’t.' },
      owner: { con: 'My taxes, insurance and repairs all go up. If rent can’t, something gives.', win: 'Room to raise rent for real costs, like repairs and property taxes.' },
      investor: { con: 'Cap rents and people stop building rentals. Then the shortage gets worse.' },
      worker: { pro: 'I just want to know I can afford to stay here next year.' },
    },
  },
  {
    id: 'public-housing', label: 'More public housing', scopes: ['community'], hint: 'community',
    all: [['public housing', 'social housing', 'housing authority']],
    support: 60, basis: 'poll', population: 'adults', polar: 0.6,
    source: YOUGOV_HOUSING('60% of U.S. adults support increasing spending on public housing; 25% oppose'),
    stakes: { 'young-adult': 0.35, worker: 0.3, activist: 0.45, health: 0.2, elder: 0.05, taxpayer: -0.45, owner: -0.1, neighbor: -0.2 },
    lines: {
      worker: { pro: 'Teachers and nurses can’t afford to live in the towns they serve.' },
      taxpayer: { con: 'Show me it will be run well before we spend more on it.' },
    },
  },
  {
    id: 'shelter', label: 'Opening a homeless shelter', scopes: ['community'],
    all: [['homeless', 'unhoused', '=shelter']], support: 64, basis: 'poll', population: 'adults', polar: 0.85,
    source: YOUGOV_LOCAL('64% of U.S. adults would support building a new homeless shelter in their local area (85% support more shelters nationally)'),
    stakes: { owner: -0.4, parent: -0.25, elder: -0.3, health: 0.4, activist: 0.5, 'young-adult': 0.2, student: 0.2, taxpayer: -0.25 },
    lines: {
      owner: { con: 'I want to help. Just not in front of my door.', win: 'Security, outreach staff, and a say in the location.' },
      health: { pro: 'I treat people who sleep outside every winter. A shelter saves lives.' },
      parent: { con: 'I need to know it’s safe for my kids to walk by.' },
      activist: { pro: 'Everyone deserves a safe place to sleep, and winter is coming.' },
    },
  },
  {
    id: 'housing', label: 'Building new housing', scopes: ['community'],
    all: [['apartment', '=housing', '=condo', '=condos', 'rezon', 'zoning', 'duplex', 'townhome', 'townhouse', 'high-rise', 'new homes', 'accessory dwelling', '=adu', '=adus']],
    none: ['homeless', 'shelter', 'public housing', 'rent control'],
    support: 55, basis: 'estimate', population: 'everyone', polar: 0.7,
    note: 'Ripple estimate. Polls find most people back new homes in general but are warier of large or dense projects near them.',
    variants: [
      {
        when: ['high-density', 'high density', '=density', 'high-rise', '=tower', '=towers', 'skyscraper', 'upzon'], support: 30, label: 'Zoning for high-density development', basis: 'poll',
        source: YOUGOV_HOUSING('30% of U.S. adults support changing zoning to allow more high-density development; 48% oppose, 23% are not sure'),
      },
      { when: ['duplex', 'triplex', 'fourplex', 'townhome', 'townhouse', 'missing middle', 'single-family', 'accessory dwelling', '=adu', '=adus'], support: 48, label: 'Allowing duplexes and townhomes', basis: 'poll', source: AEI_ZONING },
      { when: ['low-income', 'low income', 'affordable'], support: 65, label: 'New low-income housing nearby', basis: 'poll', includes: ['support'], source: YOUGOV_LOCAL('65% of U.S. adults would support building new low-income housing in their local area') },
      { when: ['apartment', '=condo', '=condos'], support: 65, label: 'A new apartment building nearby', basis: 'poll', source: YOUGOV_LOCAL('65% of U.S. adults would support building a new apartment building in their local area (76% support more nationally)') },
    ],
    stakes: { elder: -0.35, 'young-adult': 0.45, worker: 0.3, student: 0.25, owner: 0.15, taxpayer: -0.15, activist: 0.1, commuter: -0.1, neighbor: -0.4 },
    lines: {
      'young-adult': { pro: 'I grew up here and I can’t afford to live here. That has to change.' },
      elder: { con: 'More traffic, more noise, and the town I knew disappears.', win: 'Height limits, parking, and a real say in the design.' },
      worker: { pro: 'If there were homes near my job, I wouldn’t drive an hour each way.' },
    },
  },
  // ───────────── school safety ─────────────
  {
    id: 'armed-teachers', label: 'Letting teachers carry guns', scopes: ['school', 'community'],
    all: [['teacher', 'staff', 'educator', 'school employee', 'school official', 'principal'], ['=gun', '=guns', 'firearm', '=armed', '=arm', 'carry', 'concealed']],
    none: ['police', 'officer', 'guard'],
    support: 50, basis: 'poll', population: 'adults', source: PEW_ARMED_TEACHERS, polar: 0.95,
    note: 'Polls split on this. PDK (2022) found 45% support and 55% opposition.',
    stakes: { teacher: -0.3, student: -0.25, counselor: -0.35, parent: 0.05, admin: -0.05, elder: 0.15, activist: -0.5, health: -0.2 },
    lines: {
      teacher: { con: 'I signed up to teach. I’m not a security guard.', win: 'Trained officers, so teachers don’t have to choose.' },
      parent: { pro: 'If something happens, help is minutes away. A trained teacher is right there.', con: 'More guns near my kid is not what I want.' },
      student: { con: 'I don’t want to wonder which teacher has a gun in the room.' },
      counselor: { con: 'Kids in crisis need someone to talk to, not more weapons in the building.' },
    },
  },
  {
    id: 'school-security', label: 'More security at school', scopes: ['school'],
    all: [SECURITY_WORDS], support: 55, basis: 'estimate', population: 'adults', polar: 0.6, inherentlyBroad: true,
    note: 'Ripple estimate for security steps without a national poll, like clear backpacks or unarmed guards.',
    variants: securityVariants(), stakes: SECURITY_STAKES, lines: SECURITY_LINES,
  },
  {
    // A school board or town deciding about school security: the same topic and polls, so it shares the id.
    id: 'school-security', label: 'More security at school', scopes: ['community'],
    all: [SECURITY_WORDS, SCHOOL_WORDS], support: 55, basis: 'estimate', population: 'adults', polar: 0.6, inherentlyBroad: true,
    note: 'Ripple estimate for security steps without a national poll, like clear backpacks or unarmed guards.',
    variants: securityVariants(), stakes: SECURITY_STAKES, lines: SECURITY_LINES,
  },
  // ───────────── climate & energy ─────────────
  {
    id: 'carbon-tax', label: 'Taxing carbon emissions', scopes: ['community', 'business'], hint: 'community',
    all: [['carbon', 'emission', 'greenhouse'], ['=tax', '=taxes', '=taxing', '=fee', '=fees', 'price on', 'pricing']],
    support: 70, basis: 'poll', population: 'adults', polar: 0.7,
    source: PEW_CLIMATE('70% of U.S. adults favor taxing corporations based on their carbon emissions (10,329 adults, June 2023)'),
    stakes: { activist: 0.6, health: 0.3, 'young-adult': 0.25, student: 0.25, owner: -0.35, investor: -0.4, commuter: -0.2, taxpayer: -0.15, worker: -0.05 },
    lines: {
      activist: { pro: 'Make polluters pay for the damage. That’s the fairest way.' },
      owner: { con: 'Companies pass costs on. My energy bill is going to go up.', win: 'Rebates for small businesses and households.' },
      commuter: { con: 'If gas prices go up, I pay it every single day.' },
    },
  },
  {
    id: 'renewables', label: 'Prioritizing wind and solar', scopes: ['community'],
    all: [['solar', '=wind', 'renewable', 'clean energy'], ['priorit', 'fossil', 'transition', 'shift to', 'switch to', 'move to', 'focus on']],
    support: 57, basis: 'poll', population: 'adults', source: PEW_ENERGY, polar: 0.75,
    stakes: { activist: 0.55, 'young-adult': 0.3, student: 0.3, health: 0.25, worker: -0.1, elder: -0.15, owner: -0.05, taxpayer: -0.1 },
    lines: {
      student: { pro: 'We’re the ones who’ll live with the climate you leave us.' },
      worker: { con: 'My job is in natural gas. What happens to people like me?', win: 'Job training and a real plan for energy workers.' },
      elder: { con: 'I just want the lights on and the bill affordable.' },
    },
  },
  {
    id: 'wind-farm', label: 'A wind farm nearby', scopes: ['community'],
    all: [['wind farm', 'wind turbine', 'windmill', 'wind project', 'wind power', 'wind energy']],
    support: 63, basis: 'poll', population: 'adults', polar: 0.6,
    source: YOUGOV_LOCAL('63% of U.S. adults would support building a new wind farm in their local area (72% support more nationally)'),
    stakes: { activist: 0.5, 'young-adult': 0.25, student: 0.25, elder: -0.25, neighbor: -0.35, owner: 0.05, taxpayer: 0.05 },
    lines: {
      elder: { con: 'I bought this place for the view. Now it’s turbines.', win: 'Turbines set back from homes, and a share of the lease money for the town.' },
      activist: { pro: 'Clean power, made right here. That’s energy independence.' },
    },
  },
  {
    id: 'solar-farm', label: 'A solar farm nearby', scopes: ['community'],
    all: [['solar'], ['=farm', '=farms', 'array', 'field', 'plant', 'project', 'facility', 'installation']],
    support: 68, basis: 'poll', population: 'adults', source: NORC_SOLAR, polar: 0.5,
    note: 'Paid for by GoodPower, a group that supports solar. The same poll found 61% for wind projects nearby, close to YouGov’s 63% (2022).',
    stakes: { activist: 0.5, 'young-adult': 0.25, student: 0.25, taxpayer: 0.1, elder: -0.15, neighbor: -0.25, owner: 0.05 },
    lines: {
      activist: { pro: 'Cheap, clean power and lease money for local landowners.' },
      elder: { con: 'That field has been farmland for a hundred years.', win: 'Keep the best farmland, and plant around the panels.' },
    },
  },
  {
    id: 'gas-stoves', label: 'Banning gas stoves', scopes: ['community'],
    all: [['gas stove', 'gas range', 'gas cooktop', 'gas appliance', 'gas hookup', 'gas line', 'all-electric', 'all electric']],
    support: 40, basis: 'poll', population: 'adults', source: YOUGOV_STOVES, polar: 0.8,
    variants: [
      {
        when: ['new building', 'new construction', 'new home', 'all-electric', 'all electric', 'gas hookup', 'gas line'], support: 46, label: 'All-electric new buildings', basis: 'poll',
        source: PEW_CLIMATE('46% of U.S. adults favor requiring most new buildings to run only on electricity, with no gas lines; 51% oppose'),
      },
    ],
    stakes: { activist: 0.5, health: 0.3, 'young-adult': 0.15, elder: -0.35, owner: -0.35, taxpayer: -0.2, parent: -0.05 },
    lines: {
      owner: { con: 'My restaurant runs on gas burners. You can’t sear on a hot plate.', win: 'Leave existing kitchens alone and help pay for upgrades.' },
      health: { pro: 'Gas stoves are linked to childhood asthma. Cleaner indoor air matters.' },
      elder: { con: 'I’ve cooked on gas for 50 years. Don’t tell me what to cook on.' },
    },
  },
];
