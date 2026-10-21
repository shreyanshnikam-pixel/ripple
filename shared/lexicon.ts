import type { Scope, Value, ValueMap } from './types';

/**
 * Keyword rules the heuristic engine uses to read a decision.
 *
 * Keyword syntax:
 *  - "word"   matches any token that starts with it ("subsid" → "subsidize")
 *  - "=word"  matches the exact token only ("=ai" won't match "aid")
 *  - "two words" (contains a space or hyphen) matches as a phrase anywhere
 */
export interface TopicRule {
  id: string;
  label: string;
  keywords: string[];
  impacts: ValueMap;
  /** 0 – 1. How disruptive decisions on this topic tend to be. */
  change?: number;
  /** 0 – 1. How likely this topic is to divide people. */
  polar?: number;
  scopeHint?: Scope;
}

export interface MitigationRule {
  id: string;
  label: string;
  keywords: string[];
  /** Multiply negative impacts on these values (0.5 = halve the downside). */
  soften: ValueMap;
  /** Added after softening. */
  boost?: ValueMap;
  changeFactor?: number;
  polarFactor?: number;
}

export const TOPICS: TopicRule[] = [
  {
    id: 'cost-up', label: 'New costs',
    keywords: ['tax', '=taxes', '=fee', '=fees', 'tuition', '=toll', '=tolls', '=fare', '=fares', 'price increase', 'raise prices', 'raise the price', 'surcharge', '=charge', '=charging', 'expensive', '=cost', '=costs', '=costly', 'pay for', '=loan', '=loans', '=debt', 'mortgage', '=bond', 'levy', 'millions', '=$'],
    impacts: { cost: -0.65 }, change: 0.2, polar: 0.35,
  },
  {
    id: 'cost-down', label: 'Savings',
    keywords: ['=free', 'discount', 'cheaper', 'lower cost', 'lower prices', 'lower taxes', 'cut taxes', 'tax cut', 'tax break', 'rebate', 'save money', 'refund', 'affordab', 'no cost', 'reduce costs'],
    impacts: { cost: 0.7, equity: 0.3 }, change: 0.1,
  },
  {
    id: 'environment', label: 'Environment',
    keywords: ['solar', 'renewable', 'climate', 'emission', 'carbon', 'pollut', 'recycl', 'compost', '=green', '=trees', '=tree', 'electric', '=ev', '=evs', 'bike lane', '=bikes', 'bicycl', 'plastic', '=straws', 'sustainab', 'wildlife', 'conservation', 'clean energy', '=wind', 'environment', 'offset', 'leaf blower', 'gas-powered', 'reusable', 'zero waste', 'water quality', '=park', '=parks', 'green space', 'nature', 'compostable'],
    impacts: { environment: 0.8, innovation: 0.2, cost: -0.15 }, polar: 0.35,
  },
  {
    id: 'environment-harm', label: 'Environmental harm',
    keywords: ['pipeline', 'fracking', '=drill', '=drilling', '=coal', 'landfill', 'highway expansion', 'cut down', 'clear-cut', '=oil', 'gas station', 'factory', 'warehouse', 'data center', 'strip mall'],
    impacts: { environment: -0.7, growth: 0.5 }, change: 0.4, polar: 0.6,
  },
  {
    id: 'safety', label: 'Public safety',
    keywords: ['police', '=cops', 'safety', '=safe', '=safer', 'security', 'camera', 'surveillance', '=crime', 'guard', 'crosswalk', 'speed limit', 'speed bump', 'streetlight', '=lighting', 'metal detector', 'lockdown', 'firefight', 'violence', 'bully'],
    impacts: { safety: 0.7, freedom: -0.2, cost: -0.15 }, polar: 0.3,
  },
  {
    id: 'restrict', label: 'New rules & restrictions',
    keywords: ['=ban', '=bans', '=banning', '=banned', 'prohibit', 'restrict', 'forbid', 'mandatory', '=mandate', '=require', '=required', '=requiring', 'requirement', 'enforce', 'curfew', '=limit', '=limits', '=limiting', 'crack down', 'crackdown', 'outlaw', 'zero tolerance', 'dress code', '=uniform', '=uniforms', '=fine', '=fines', 'penalt'],
    impacts: { freedom: -0.8, safety: 0.15, tradition: 0.1 }, change: 0.45, polar: 0.8,
  },
  {
    id: 'allow', label: 'New freedoms',
    keywords: ['=allow', '=allowing', 'legaliz', '=permit', '=permitting', 'loosen', 'lift the ban', 'repeal', 'off-campus lunch', 'open campus'],
    impacts: { freedom: 0.65, safety: -0.2, tradition: -0.2 }, change: 0.35, polar: 0.5,
  },
  {
    id: 'technology', label: 'Technology',
    keywords: ['=ai', 'artificial intelligence', '=app', '=apps', 'technology', 'digital', 'online', 'laptop', 'chromebook', 'tablet', 'robot', 'automat', 'software', '=tech', 'smartphone', '=vr', 'computer', 'coding', 'algorithm', 'chatgpt', 'chatbot', 'self-driving', 'virtual', 'e-learning', 'website'],
    impacts: { innovation: 0.8, tradition: -0.35, stability: -0.2, equity: -0.1 }, change: 0.35, polar: 0.3,
  },
  {
    id: 'phones', label: 'Phones & screens',
    keywords: ['phone', 'cellphone', 'cell phone', 'social media', 'tiktok', 'instagram', 'screen time', '=screens'],
    impacts: { wellbeing: 0.35, community: 0.2 }, polar: 0.5,
  },
  {
    id: 'devices', label: 'Devices & screens',
    keywords: ['device', 'electronic', '=laptop', '=laptops', 'chromebook', '=tablet', '=tablets', 'ipad', '=computers', 'smartwatch', 'gadget', '=screens', 'video game', 'headphone', 'earbud'],
    impacts: { wellbeing: 0.2, time: -0.35, safety: -0.15 }, change: 0.4, polar: 0.5,
  },
  {
    id: 'schedule', label: 'Schedules',
    keywords: ['start time', 'start later', 'later start', 'start school', 'school start', 'four-day', '4-day', 'four day', 'schedule', '=hours', '=shift', '=shifts', 'calendar', 'year-round', 'year round', 'daylight saving', '=later', '=earlier', '=morning', '=weekend', '=weekends', '=summer', 'recess', 'lunch period', 'a.m.', '=am', '=pm', 'block schedule', 'longer day', 'shorter day'],
    impacts: { time: 0.2, stability: -0.5, wellbeing: 0.3 }, change: 0.45, polar: 0.3,
  },
  {
    id: 'health', label: 'Health & well-being',
    keywords: ['health', 'clinic', 'mental', 'therapy', 'counsel', 'hospital', 'vaccin', 'wellness', '=sleep', 'nutrition', '=gym', 'fitness', 'exercise', '=meal', '=meals', '=lunch', '=lunches', 'healthier', '=fresh', '=sports', '=nap', '=naps', 'stress', 'burnout', 'well-being'],
    impacts: { wellbeing: 0.7, cost: -0.15 },
  },
  {
    id: 'housing', label: 'Housing & development',
    keywords: ['housing', 'apartment', '=rent', '=rents', 'zoning', 'rezon', 'developer', 'construction', '=condo', '=condos', 'homeless', '=shelter', 'tiny home', 'density', 'high-rise', 'duplex', 'subdivision'],
    impacts: { growth: 0.5, equity: 0.4, tradition: -0.5, community: -0.1, stability: -0.3 }, change: 0.5, polar: 0.65,
  },
  {
    id: 'transport', label: 'Transportation',
    keywords: ['=bus', '=buses', 'busing', 'transit', '=train', '=trains', 'subway', 'light rail', '=road', '=roads', 'parking', 'traffic', 'highway', '=cars', 'commut', 'scooter', 'pedestrian', 'sidewalk', 'bike lane', 'carpool', 'congestion'],
    impacts: { time: 0.35, environment: 0.15, cost: -0.2, stability: -0.2 }, change: 0.3, polar: 0.35,
  },
  {
    id: 'closure', label: 'Cuts & closures',
    keywords: ['=close', '=closing', '=closed', 'closure', 'shut down', '=shutting', '=cut', '=cuts', '=cutting', 'eliminat', '=remove', '=removing', 'demolish', 'tear down', '=cancel', '=canceling', '=cancelling', 'discontinu', '=merge', '=merging', 'consolidat', 'layoff', 'lay off', 'downsiz', 'defund', '=drop', '=dropping', 'phase out', 'get rid of'],
    impacts: { stability: -0.75, tradition: -0.6, cost: 0.35, community: -0.4 }, change: 0.8, polar: 0.6,
  },
  {
    id: 'swap', label: 'Replacing something familiar',
    keywords: ['=replace', '=replacing', '=switch', '=switching', '=swap', '=swapping', '=convert', '=converting', '=turn', '=turning', 'instead of'],
    impacts: { stability: -0.45, tradition: -0.35, innovation: 0.2 }, change: 0.55, polar: 0.4,
  },
  {
    id: 'expand', label: 'New programs',
    keywords: ['=add', '=adding', 'expand', '=new', '=open', '=opening', '=build', '=building', 'launch', '=create', '=creating', 'introduc', '=install', '=installing', '=hire', '=hiring', 'upgrade', 'renovat', '=invest', '=investing', 'opportunit', 'program', 'initiative'],
    impacts: { growth: 0.5, innovation: 0.25, cost: -0.2, stability: -0.15 }, change: 0.3,
  },
  {
    id: 'community', label: 'Community life',
    keywords: ['community', 'festival', '=event', '=events', 'library', 'libraries', 'volunteer', 'neighborhood', '=local', '=park', '=parks', 'playground', 'mural', '=art', '=arts', '=music', '=club', '=clubs', 'garden', 'farmers market', 'block party', 'tradition', 'celebrat', 'museum', '=pool', 'together', 'family dinner'],
    impacts: { community: 0.7, wellbeing: 0.2, cost: -0.1 },
  },
  {
    id: 'equity', label: 'Fairness & access',
    keywords: ['equity', 'equitable', 'access', 'inclusiv', 'low-income', 'low income', 'disab', 'diversity', 'fairness', 'underserved', 'scholarship', 'financial aid', 'free lunch', 'translation', 'bilingual', 'wheelchair', 'everyone', 'all students', 'sliding scale'],
    impacts: { equity: 0.8, cost: -0.15 }, polar: 0.25,
  },
  {
    id: 'career', label: 'Career & education path',
    keywords: ['=quit', '=quitting', '=job', '=jobs', 'career', 'startup', 'start a business', 'my own business', 'college', 'university', '=major', 'degree', 'gap year', 'internship', '=intern', 'dropout', 'drop out', 'trade school', 'apprentice', 'military', 'enlist', 'promotion', 'side hustle', 'freelanc', 'bakery', 'full-time', 'part-time'],
    impacts: { growth: 0.55, stability: -0.55, freedom: 0.45, cost: -0.2 }, change: 0.6, polar: 0.3, scopeHint: 'personal',
  },
  {
    id: 'relocation', label: 'Relocation',
    keywords: ['=move', '=moving', 'relocat', 'abroad', 'overseas', 'new city', 'another city', 'another state', 'across the country', '=transfer', '=transferring', 'study abroad', 'leave home', 'new school', 'out of state'],
    impacts: { stability: -0.6, growth: 0.45, community: -0.45, freedom: 0.3 }, change: 0.7, polar: 0.3, scopeHint: 'personal',
  },
  {
    id: 'money', label: 'Big purchase',
    keywords: ['=buy', '=buying', 'purchase', 'crypto', '=stocks', '=spend', '=spending', '=lease', '=car', '=house', 'savings', 'my money', 'credit card'],
    impacts: { cost: -0.45, growth: 0.2, stability: -0.15 }, change: 0.3, scopeHint: 'personal',
  },
  {
    id: 'relationship', label: 'Relationships & family',
    keywords: ['marry', 'married', 'wedding', 'engaged', 'propose', 'break up', 'breakup', '=date', '=dating', 'boyfriend', 'girlfriend', '=adopt', '=pet', '=pets', '=dog', '=dogs', '=cat', '=cats', 'puppy', 'kitten', 'roommate', 'move in', '=baby'],
    impacts: { wellbeing: 0.4, community: 0.4, stability: -0.3, cost: -0.25, freedom: -0.2 }, change: 0.5, polar: 0.25, scopeHint: 'personal',
  },
  {
    id: 'remote', label: 'Remote & flexible work',
    keywords: ['remote', 'work from home', '=wfh', 'hybrid', 'return to office', 'four-day work week', 'flexible hours', '=office'],
    impacts: { freedom: 0.55, time: 0.5, community: -0.3, wellbeing: 0.25, tradition: -0.3 }, change: 0.4, polar: 0.5, scopeHint: 'business',
  },
  {
    id: 'pay', label: 'Pay & wages',
    keywords: ['=wage', '=wages', 'minimum wage', 'salary', 'salaries', 'pay raise', 'bonus', '=benefits', 'pay increase', 'raise pay', 'teacher pay', 'living wage', 'overtime'],
    impacts: { equity: 0.5, wellbeing: 0.35, cost: -0.4, growth: 0.1 }, change: 0.3, polar: 0.45,
  },
  {
    id: 'business', label: 'Business',
    keywords: ['customer', 'employee', '=staff', '=brand', 'rebrand', 'product', '=menu', 'pricing', '=store', '=shop', 'franchise', 'company', 'revenue', 'profit', 'marketing', 'loyalty', 'subscription', '=prices', 'my business', 'our business', 'restaurant', 'café', '=cafe', 'our shop', 'packaging', 'cashier', 'self-checkout', 'checkout lane'],
    impacts: { growth: 0.2 }, scopeHint: 'business',
  },
  {
    id: 'school', label: 'School life',
    keywords: ['school', '=class', '=classes', 'homework', 'student', 'teacher', '=grade', '=grades', '=exam', '=exams', '=test', '=tests', 'testing', 'finals', 'principal', 'campus', 'cafeteria', '=gpa', 'semester', 'classroom', '=ap', '=prom', 'graduation', 'detention', 'locker', 'hallway', 'attendance', 'late start', 'freshm', 'sophomore', '=juniors', '=seniors', 'pep rally', 'homecoming'],
    impacts: {}, scopeHint: 'school',
  },
  {
    id: 'civic', label: 'Public policy',
    keywords: ['=city', '=town', 'council', 'county', '=state', 'mayor', 'residents', 'citizens', 'public', 'government', 'legislat', '=law', '=laws', 'ordinance', 'ballot', 'downtown', 'federal', 'congress', 'statewide', 'municipal', 'nationwide', 'sales tax', 'property tax', '=tax', '=taxes', 'library'],
    impacts: {}, scopeHint: 'community',
  },
];

export const MITIGATIONS: MitigationRule[] = [
  {
    id: 'pilot', label: 'Pilot first',
    keywords: ['pilot', '=trial', 'trial run', 'phase in', 'phased', 'gradual', 'step by step', 'one semester', 'start small', 'small pilot', 'small group', 'in advance', 'advance notice', 'test run'],
    soften: { stability: 0.4, tradition: 0.7, time: 0.7 }, changeFactor: 0.55, polarFactor: 0.8,
  },
  {
    id: 'optional', label: 'Optional',
    keywords: ['optional', 'voluntary', 'opt-out', 'opt out', 'opt-in', 'opt in', '=choice', '=choose', 'exemption', 'exception'],
    soften: { freedom: 0.3, stability: 0.8 }, polarFactor: 0.7,
  },
  {
    id: 'support', label: 'Financial support',
    keywords: ['subsid', 'financial aid', 'low-income', 'sliding scale', '=cap', '=capped', 'rebate', '=grant', '=grants', 'scholarship', 'free for', 'at no cost', 'cost breakdown', 'emergency fund', 'runway', 'saving up', 'clear explanation', 'loyalty reward'],
    soften: { cost: 0.5 }, boost: { equity: 0.2 },
  },
  {
    id: 'input', label: 'Community input',
    keywords: ['survey', 'listening session', 'town hall', 'feedback', '=input', 'consult', 'community meeting', 'student vote', '=vote', 'co-design', 'ask students', 'ask residents', 'ask parents', 'check-in', 'check-ins', 'talk to'],
    soften: { tradition: 0.8, community: 0.6 }, boost: { community: 0.12 }, changeFactor: 0.85,
  },
  {
    id: 'training', label: 'Training & support',
    keywords: ['training', 'workshop', 'tutorial', 'onboarding', '=support', 'help desk', 'mentor'],
    soften: { tradition: 0.6, stability: 0.8, innovation: 0.6 }, boost: { equity: 0.1 },
  },
  {
    id: 'safeguards', label: 'Safeguards',
    keywords: ['safeguard', 'oversight', 'independent review', 'privacy', 'audit', 'transparen', 'accountab', 'data protection', 'safety plan'],
    soften: { freedom: 0.6, safety: 0.6 }, boost: { safety: 0.1 },
  },
];

export const POSITIVE_WORDS = ['improve', 'better', 'help', 'support', 'healthier', 'safer', 'protect', 'boost', 'benefit', 'empower', 'celebrate', 'welcome'];
export const NEGATIVE_WORDS = ['force', 'forcing', 'punish', 'penalize', 'strict', 'only', 'mandatory', 'without'];

export const ALL_VALUES: Value[] = ['cost', 'safety', 'equity', 'environment', 'tradition', 'innovation', 'freedom', 'community', 'growth', 'wellbeing', 'stability', 'time'];
