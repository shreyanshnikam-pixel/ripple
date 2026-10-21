import type { Role, Scope, Value, ValueMap } from './types';

/**
 * A persona is an archetype the crowd is built from. Each one weighs the
 * twelve values differently (-1 = actively dislikes, 1 = cares deeply) and
 * speaks in its own voice. Quotes are assembled from an opener (by stance)
 * and a concern line (by the value that moved them most).
 */
export interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  /** Plural label used in crosstabs, e.g. "Retirees". */
  group: string;
  hue: number;
  /** Relative share of the simulated crowd. */
  share: number;
  /** Who this person is, for self-interest and topic-specific lines. */
  roles: Role[];
  values: ValueMap;
  /** 0 – 1. How much this person dislikes change for its own sake. */
  changeAversion: number;
  openers: {
    strongSupport: string;
    support: string;
    neutral: string;
    oppose: string;
    strongOppose: string;
  };
  lines: Partial<Record<Value, { pro: string; con: string }>>;
}

export const VALUE_LABELS: Record<Value, string> = {
  cost: 'Cost & affordability',
  safety: 'Safety',
  equity: 'Fairness & access',
  environment: 'Environment',
  tradition: 'Tradition & identity',
  innovation: 'Innovation',
  freedom: 'Personal freedom',
  community: 'Community ties',
  growth: 'Opportunity & growth',
  wellbeing: 'Health & well-being',
  stability: 'Stability',
  time: 'Time & convenience',
};

export const GENERIC_LINES: Record<Value, { pro: string; con: string }> = {
  cost: { pro: "It's easier on people's wallets.", con: 'Somebody has to pay for this, and I suspect it will be us.' },
  safety: { pro: 'It makes people safer.', con: "I'm not convinced it's safe." },
  equity: { pro: "It's fairer to people who usually get left out.", con: "It isn't fair to everyone it affects." },
  environment: { pro: "It's better for the environment.", con: 'The environmental cost is being ignored.' },
  tradition: { pro: 'It respects what people value about how things are.', con: 'It throws away things people care about.' },
  innovation: { pro: "It's a fresh, modern approach.", con: 'It feels behind the times.' },
  freedom: { pro: 'It gives people more choice.', con: 'It takes choices away from people.' },
  community: { pro: 'It brings people together.', con: 'It could divide people.' },
  growth: { pro: 'It opens up new opportunities.', con: 'It closes doors for people.' },
  wellbeing: { pro: "It's good for people's health and happiness.", con: 'It adds stress people do not need.' },
  stability: { pro: "It's steady and predictable.", con: "It's a lot of disruption at once." },
  time: { pro: 'It saves people time.', con: "It costs people time they don't have." },
};

/** What would win over someone who opposes on this value (three phrasings, picked per person). */
export const WIN_OVER: Record<Value, string[]> = {
  cost: ['A clear cost breakdown and a cap on what they pay.', 'Proof the money comes from somewhere other than their pocket.', 'A discount or exemption for people on tight budgets.'],
  safety: ['A concrete safety plan, reviewed by someone independent.', 'Hearing from safety experts, not just officials.', 'A way to report problems that actually gets answered.'],
  equity: ['Proof that the people with the least will not carry the burden.', 'Support for the families who would struggle most.', 'Seeing that every neighborhood gets the same benefit.'],
  environment: ['A real plan to offset the environmental impact.', 'Numbers on emissions and waste, before and after.', 'Greener materials, even if it costs a bit more.'],
  tradition: ['Keeping a familiar piece of how things work today.', 'Being asked what should stay the same.', 'Honoring what this place has always been about.'],
  innovation: ['Seeing a well-run version of it working somewhere else first.', 'A modern option alongside the old one.', 'Clear evidence the new way is actually better.'],
  freedom: ['An opt-out, or at least a say in how it applies to them.', 'Exceptions for people with a real need.', 'Fewer rules and more choices in how it works.'],
  community: ['Being asked for input before anything is final.', 'A public meeting where their concerns get answered.', 'Seeing neighbors involved in shaping it.'],
  growth: ['Evidence it creates opportunity instead of closing it off.', 'A clear plan for jobs and new chances.', 'Proof it will not slow down people trying to get ahead.'],
  wellbeing: ['Input from health experts on the stress and health effects.', 'A plan to check in on how people are actually doing.', 'Evidence it will not add stress to already busy lives.'],
  stability: ['A slower rollout, starting with a small pilot.', 'Months of notice before anything changes.', 'A promise to review it after a trial period.'],
  time: ['A schedule that does not upend their daily routine.', 'A transition period to adjust their routine.', 'Help with the extra time it would cost them.'],
};

/** What would lose someone who currently supports on this value. */
export const LOSE: Record<Value, string[]> = {
  cost: ['Costs climbing past the original estimate.', 'Hidden fees showing up later.', 'The bill landing on the people it was meant to help.'],
  safety: ['Any sign that safety is being cut to save money.', 'A single serious incident after it starts.', 'Safety promises that never materialize.'],
  equity: ['Benefits that only reach people who are already well off.', 'Some neighborhoods getting left out.', 'Rules that fall harder on some families than others.'],
  environment: ['A green label without real environmental impact.', 'More waste instead of less.', 'Promises about the environment that get quietly dropped.'],
  tradition: ['Losing what people love about how things are.', 'Changes that go further than promised.', 'Traditions getting cut without a conversation.'],
  innovation: ['A clunky rollout that makes the new way worse than the old one.', 'Tech that breaks when people need it most.', 'Being stuck with an outdated version.'],
  freedom: ['New strings attached after the fact.', 'Rules tightening once it is in place.', 'Losing choices they were promised to keep.'],
  community: ['Being shut out of decisions once it launches.', 'Leaders who stop listening after the vote.', 'Neighbors getting pitted against each other.'],
  growth: ['Promised opportunities that never show up.', 'Jobs or chances going to someone else.', 'Slow results with no plan B.'],
  wellbeing: ['The change adding stress instead of reducing it.', 'Signs that people are worse off, not better.', 'Health benefits that never show up.'],
  stability: ['Constant changes once it is underway.', 'A messy rollout with no clear plan.', 'Rules that keep shifting.'],
  time: ['Hidden delays and extra hoops.', 'Longer waits than promised.', 'A schedule that keeps changing.'],
};

/** Personal-scope versions, phrased for the people in your life. */
export const WIN_OVER_PERSONAL: Partial<Record<Value, string>> = {
  stability: 'Seeing you test it first, with a backup plan in place.',
  cost: 'A real budget, plus savings to fall back on.',
  community: 'Knowing you will stay close and keep them in the loop.',
  safety: 'Knowing you will be safe, with people nearby to call.',
  tradition: 'Seeing that family traditions still matter to you.',
  time: 'Knowing you will still make time for the people who matter.',
};


const community: Persona[] = [
  {
    id: 'maria', name: 'Maria Gonzalez', age: 41, role: 'Working parent of two', group: 'Working parents', hue: 28, share: 0.16, roles: ['parent','worker','commuter'],
    values: { cost: 0.7, safety: 0.8, time: 0.6, wellbeing: 0.6, equity: 0.3, stability: 0.3 },
    changeAversion: 0.35,
    openers: {
      strongSupport: 'Yes, please. {Phrase} would make a real difference for my family.',
      support: 'I can get behind {phrase}.',
      neutral: 'I want to like {phrase}. I just need to know how it plays out at home.',
      oppose: "I'm worried about {phrase}.",
      strongOppose: 'As a mom, {phrase} is a hard no for me.',
    },
    lines: {
      cost: { pro: 'Anything that keeps money in our pockets matters when groceries already eat the budget.', con: "Every new cost lands on families like mine first, and we're already stretched." },
      safety: { pro: "If it keeps my kids safer walking home, that's the whole argument for me.", con: 'I need to know my kids will be just as safe as they are now.' },
      time: { pro: "Saving even twenty minutes a day is huge when I'm juggling two jobs and pickups.", con: 'My schedule is held together with tape. One change and the whole week falls apart.' },
      wellbeing: { pro: "Healthier kids and calmer mornings. That's worth something.", con: 'I worry about what this does to my kids’ stress and sleep.' },
    },
  },
  {
    id: 'harold', name: 'Harold Bennett', age: 72, role: 'Retired veteran, 40 years in town', group: 'Retirees', hue: 205, share: 0.14, roles: ['elder','taxpayer'],
    values: { tradition: 0.8, stability: 0.8, cost: 0.6, safety: 0.7, community: 0.5, innovation: -0.3 },
    changeAversion: 0.7,
    openers: {
      strongSupport: "I've seen a lot of plans come and go. {Phrase} is one of the good ones.",
      support: "I'll admit it: {phrase} makes sense.",
      neutral: "I'll reserve judgment on {phrase} until I see the details.",
      oppose: "I don't see why we need {phrase}.",
      strongOppose: '{Phrase} is a mistake, and I will say so at every meeting.',
    },
    lines: {
      tradition: { pro: 'It keeps the character of this place intact, and that matters to those of us who built it.', con: "This town has worked fine for decades. We keep fixing things that aren't broken." },
      stability: { pro: "Steady and predictable. That's how you earn people's trust.", con: "Too much change, too fast. Folks my age can't keep up with every new thing." },
      cost: { pro: 'Finally, somebody thinking about people on a fixed income.', con: "I'm on a fixed income. Who exactly do you think pays for this?" },
      safety: { pro: 'If it makes the streets safer at night, you have my vote.', con: "My concern is safety, and I haven't heard a word about it." },
    },
  },
  {
    id: 'priya', name: 'Priya Raman', age: 17, role: 'High school junior', group: 'Students & teens', hue: 285, share: 0.12, roles: ['student','teen'],
    values: { innovation: 0.7, environment: 0.7, equity: 0.6, freedom: 0.8, wellbeing: 0.6, tradition: -0.4, stability: -0.2 },
    changeAversion: 0.1,
    openers: {
      strongSupport: 'Finally! {Phrase} is exactly what my generation has been asking for.',
      support: 'Honestly, {phrase} sounds pretty good to me.',
      neutral: "I'm kind of on the fence about {phrase}.",
      oppose: '{Phrase} feels like it was decided without asking us.',
      strongOppose: '{Phrase} hurts the people who will live with it the longest.',
    },
    lines: {
      freedom: { pro: "It treats us like we can make our own choices, which is all we want.", con: "It's another rule made for us, without us." },
      environment: { pro: "We're the ones inheriting the planet, so anything greener is a win.", con: "It feels like the climate impact wasn't even considered." },
      innovation: { pro: "It's about time things caught up with how people actually live now.", con: 'It feels outdated before it even starts.' },
      equity: { pro: "This helps kids whose families can't just pay their way around problems.", con: 'The kids with the least are going to get hit the hardest.' },
      wellbeing: { pro: 'Mental health is real, and this actually helps.', con: "We're already burned out. This adds more stress." },
    },
  },
  {
    id: 'darnell', name: 'Darnell Brooks', age: 38, role: 'Owns a café on Main Street', group: 'Small business owners', hue: 48, share: 0.1, roles: ['owner','worker'],
    values: { cost: 0.8, growth: 0.9, stability: 0.4, freedom: 0.5, community: 0.4 },
    changeAversion: 0.4,
    openers: {
      strongSupport: "Good for business, good for the block. I'm all in on {phrase}.",
      support: 'From where I stand behind the counter, {phrase} could work.',
      neutral: "I'm running the numbers on {phrase} before I pick a side.",
      oppose: '{Phrase} worries me as a business owner.',
      strongOppose: "{Phrase} could put shops like mine under. I'll fight it.",
    },
    lines: {
      growth: { pro: 'More foot traffic, more customers, more jobs for local kids.', con: 'Anything that keeps customers away from Main Street is a threat to my livelihood.' },
      cost: { pro: 'Lower costs mean I can keep my prices fair and my staff paid.', con: "My margins are thin. One more cost and I'm raising prices or cutting hours." },
      freedom: { pro: 'It gets out of the way and lets people run their businesses.', con: "More rules means more paperwork, and paperwork doesn't make coffee." },
      community: { pro: 'Main Street works when the neighborhood shows up, and this brings people out.', con: 'This splits the neighborhood, and my regulars feel it.' },
    },
  },
  {
    id: 'lena', name: 'Dr. Lena Okafor', age: 50, role: 'ER nurse at County General', group: 'Healthcare workers', hue: 185, share: 0.09, roles: ['health','worker','parent'],
    values: { wellbeing: 0.9, safety: 0.8, equity: 0.6, environment: 0.3 },
    changeAversion: 0.3,
    openers: {
      strongSupport: 'I see the cost of the status quo every shift. {Phrase} is overdue.',
      support: 'From a public-health standpoint, {phrase} is a step in the right direction.',
      neutral: "I'd want to see the health data on {phrase} first.",
      oppose: 'I have real concerns about {phrase}.',
      strongOppose: "I'll be the one treating the fallout of {phrase}. Please reconsider.",
    },
    lines: {
      wellbeing: { pro: 'The research is clear that changes like this keep people healthier.', con: "I'm worried about the health effects, especially for kids and older patients." },
      safety: { pro: 'Fewer injuries means fewer families in my waiting room.', con: 'I can already picture the extra injuries coming through my ER.' },
      equity: { pro: 'The patients who need help most will finally be able to get it.', con: 'People who already struggle to access care will fall even further behind.' },
    },
  },
  {
    id: 'sam', name: 'Sam Whitaker', age: 29, role: 'Environmental organizer', group: 'Activists & advocates', hue: 95, share: 0.08, roles: ['activist','young-adult'],
    values: { environment: 1, equity: 0.7, community: 0.6, growth: -0.2, cost: 0.2 },
    changeAversion: 0.15,
    openers: {
      strongSupport: "This is the kind of bold move we've been organizing for. Yes to {phrase}!",
      support: "I'm glad to see {phrase} on the table.",
      neutral: "{Phrase} could be good. It depends on who's at the table.",
      oppose: 'We can do better than {phrase}.',
      strongOppose: "We'll be at every meeting opposing {phrase}.",
    },
    lines: {
      environment: { pro: 'Cleaner air and a smaller footprint. This is what climate action looks like locally.', con: "This takes us backwards on climate, and we don't have time to go backwards." },
      equity: { pro: 'It puts the neighborhoods that usually get ignored first in line.', con: 'Once again, the neighborhoods with the least say pay the highest price.' },
      community: { pro: "People organized for this. It's proof that showing up works.", con: 'Nobody asked the community. Decisions like this need real public input.' },
    },
  },
  {
    id: 'kevin', name: 'Kevin Liu', age: 34, role: 'Software engineer, daily commuter', group: 'Young professionals', hue: 235, share: 0.13, roles: ['young-adult','worker','commuter'],
    values: { innovation: 0.8, time: 0.9, freedom: 0.5, cost: 0.3, growth: 0.4 },
    changeAversion: 0.2,
    openers: {
      strongSupport: "Love it. {Phrase} is the smartest idea I've heard from this city in years.",
      support: '{Phrase}? Makes sense to me.',
      neutral: '{Phrase} is fine in theory. Execution is everything.',
      oppose: "I'm skeptical about {phrase}.",
      strongOppose: '{Phrase} is the kind of thing that makes people like me want to move away.',
    },
    lines: {
      time: { pro: "If it gives me back time in my day, I'm sold.", con: 'This adds friction to my day, and I already spend too long in traffic.' },
      innovation: { pro: 'Finally, modern tools for old problems.', con: "It's a 1990s solution to a 2026 problem." },
      freedom: { pro: "More options, fewer hoops. That's how it should be.", con: 'It limits options people rely on.' },
      growth: { pro: 'This is how a city attracts young talent and keeps it.', con: 'It makes it harder for young people to build a future here.' },
    },
  },
  {
    id: 'rosa', name: 'Rosa Delgado', age: 58, role: 'Taxpayer advocate who reads every budget', group: 'Fiscal watchdogs', hue: 330, share: 0.1, roles: ['taxpayer'],
    values: { cost: 1, stability: 0.5, freedom: 0.4, tradition: 0.2 },
    changeAversion: 0.55,
    openers: {
      strongSupport: "I don't say this often, but {phrase} is fiscally responsible.",
      support: 'The numbers on {phrase} could work, if they hold up.',
      neutral: "Show me the budget for {phrase} and I'll tell you what I think.",
      oppose: "I've read a lot of proposals like {phrase}. They always cost more than promised.",
      strongOppose: '{Phrase} is a blank check, and taxpayers are the ones signing it.',
    },
    lines: {
      cost: { pro: 'It saves taxpayer money in the long run. Not many plans can say that.', con: "Where's the cost breakdown? Projects like this always run over budget." },
      stability: { pro: "It's measured and predictable, which is what a budget needs.", con: "We're committing money for years based on a guess." },
      freedom: { pro: "Less government in people's way. Good.", con: "It's government overreach, plain and simple." },
    },
  },
];

const school: Persona[] = [
  {
    id: 'jordan', name: 'Jordan Ellis', age: 17, role: 'Student council president', group: 'Student leaders', hue: 285, share: 0.12, roles: ['student','teen'],
    values: { community: 0.7, equity: 0.6, wellbeing: 0.6, freedom: 0.6, innovation: 0.4 },
    changeAversion: 0.2,
    openers: {
      strongSupport: 'Students have been asking for {phrase} for ages. This is a win.',
      support: 'I think most students would support {phrase}.',
      neutral: "Students are split on {phrase}. I'm hearing both sides.",
      oppose: "A lot of the students I've talked to aren't happy about {phrase}.",
      strongOppose: 'If {phrase} goes through, expect a petition by Friday.',
    },
    lines: {
      community: { pro: 'It brings the school together instead of splitting us into groups.', con: 'It splits the student body, and school spirit takes the hit.' },
      freedom: { pro: 'It gives students more say over our own days.', con: "Students feel like we're losing our voice on this." },
      equity: { pro: 'It helps the students who usually get left out.', con: 'Not every student can adapt to this equally.' },
      wellbeing: { pro: "People are stressed, and this actually helps.", con: 'Students are already stretched thin. This adds pressure.' },
    },
  },
  {
    id: 'maya', name: 'Maya Chen', age: 14, role: 'Freshman, still finding her way', group: 'Underclassmen', hue: 205, share: 0.2, roles: ['student','teen'],
    values: { wellbeing: 0.8, time: 0.5, community: 0.6, stability: 0.4, freedom: 0.5 },
    changeAversion: 0.3,
    openers: {
      strongSupport: 'Wait, really? {Phrase} would make school so much better!',
      support: 'I think {phrase} would be nice, honestly.',
      neutral: "I don't really know how {phrase} would affect me yet.",
      oppose: '{Phrase} kind of makes me nervous.',
      strongOppose: '{Phrase} would make freshman year even harder.',
    },
    lines: {
      wellbeing: { pro: "I'd actually get enough sleep and not feel anxious all the time.", con: 'School is already stressful. This would make it worse.' },
      time: { pro: 'More time for homework, clubs, and just being a kid.', con: "I'd have even less time after school for anything." },
      community: { pro: "It'd be easier to make friends and feel like I belong.", con: 'It would make it harder to find my people.' },
    },
  },
  {
    id: 'alvarez', name: 'Mr. Tom Alvarez', age: 52, role: 'History teacher, 24 years', group: 'Teachers', hue: 28, share: 0.12, roles: ['teacher'],
    values: { stability: 0.6, wellbeing: 0.6, equity: 0.6, tradition: 0.4, time: 0.5, innovation: 0.1 },
    changeAversion: 0.45,
    openers: {
      strongSupport: 'In 24 years of teaching, few changes have excited me as much as {phrase}.',
      support: 'I can see {phrase} helping my students.',
      neutral: "I'd want to see how {phrase} affects learning before I weigh in.",
      oppose: 'I have serious reservations about {phrase}.',
      strongOppose: "Teachers weren't consulted on {phrase}, and it shows.",
    },
    lines: {
      stability: { pro: 'It gives my classroom structure without throwing out what works.', con: "Every time policy flips mid-year, it's the students who lose learning time." },
      equity: { pro: "It levels the playing field for kids who don't get help at home.", con: 'My students with the fewest resources will struggle most.' },
      time: { pro: 'More instructional time, and maybe some planning time too.', con: "It eats into teaching and planning time we already don't have." },
      wellbeing: { pro: 'Rested, healthy kids learn better. It is that simple.', con: "I'm worried about burnout, for students and for teachers." },
    },
  },
  {
    id: 'carter', name: 'Denise Carter', age: 45, role: 'PTA parent of three', group: 'Parents', hue: 48, share: 0.16, roles: ['parent'],
    values: { safety: 0.8, cost: 0.6, time: 0.6, wellbeing: 0.6, stability: 0.4 },
    changeAversion: 0.4,
    openers: {
      strongSupport: 'As a parent, {phrase} is an easy yes.',
      support: '{Phrase} sounds good for our kids.',
      neutral: 'Parents need more information about {phrase}.',
      oppose: 'Parents are going to have a lot of questions about {phrase}.',
      strongOppose: 'The PTA will push back hard on {phrase}.',
    },
    lines: {
      safety: { pro: 'Anything that keeps our kids safer is worth doing.', con: 'I need to know exactly how this keeps my kids safe.' },
      time: { pro: 'It makes drop-off and pickup actually work for families.', con: "Working parents can't rearrange their entire lives around this." },
      cost: { pro: 'It saves families money, and that matters.', con: 'Families will end up paying for this one way or another.' },
      wellbeing: { pro: 'My kids would be happier and healthier. Sold.', con: 'My kids are already overwhelmed.' },
    },
  },
  {
    id: 'price', name: 'Dr. Angela Price', age: 49, role: 'High school principal', group: 'Administrators', hue: 185, share: 0.06, roles: ['admin'],
    values: { stability: 0.5, safety: 0.7, cost: 0.6, equity: 0.5, growth: 0.4 },
    changeAversion: 0.5,
    openers: {
      strongSupport: '{Phrase} fits our school improvement plan perfectly.',
      support: 'From the front office, {phrase} looks doable.',
      neutral: '{Phrase} has merit, but implementation would be complex.',
      oppose: 'Logistically, {phrase} raises a lot of problems.',
      strongOppose: "I can't support {phrase} with the budget and staff we have.",
    },
    lines: {
      cost: { pro: 'It fits our budget, which almost nothing does these days.', con: 'Our budget is already stretched. Something else would have to be cut.' },
      safety: { pro: "It strengthens campus safety, and that's my first responsibility.", con: "It creates supervision gaps I'd have to answer for." },
      stability: { pro: "It's manageable to roll out with the staff we have.", con: "Rolling this out would take staff and time we don't have." },
    },
  },
  {
    id: 'dawson', name: 'Coach Ray Dawson', age: 40, role: 'Varsity coach & PE teacher', group: 'Coaches & athletes', hue: 95, share: 0.12, roles: ['coach','teacher'],
    values: { time: 0.8, community: 0.7, tradition: 0.5, wellbeing: 0.6 },
    changeAversion: 0.45,
    openers: {
      strongSupport: 'Speaking as a coach, {phrase} is exactly what these kids need.',
      support: '{Phrase} could work for my teams.',
      neutral: "I'm thinking about how {phrase} hits practice schedules.",
      oppose: '{Phrase} is going to be rough on athletics.',
      strongOppose: '{Phrase} would gut our after-school programs.',
    },
    lines: {
      time: { pro: 'It frees up time for practice, rest, and recovery.', con: 'Practices, games, and bus schedules all depend on timing. This throws it off.' },
      community: { pro: 'Big school moments like this bring the whole town out.', con: 'Athletics is the heart of this school community, and this weakens it.' },
      tradition: { pro: 'It keeps the traditions our alumni still talk about.', con: "We'd be throwing away traditions that go back generations." },
      wellbeing: { pro: 'Healthy, active kids. That is my whole job.', con: 'Less activity is the last thing these kids need.' },
    },
  },
  {
    id: 'ortega', name: 'Luis Ortega', age: 16, role: 'Works 20 hours a week after school', group: 'Working students', hue: 235, share: 0.12, roles: ['student','teen','worker'],
    values: { cost: 0.8, time: 0.9, equity: 0.7, freedom: 0.5 },
    changeAversion: 0.3,
    openers: {
      strongSupport: 'This would actually change my life. {Phrase}, please.',
      support: '{Phrase} would help students like me.',
      neutral: 'It depends on how {phrase} works with my job.',
      oppose: "{Phrase} doesn't work for people with jobs.",
      strongOppose: '{Phrase} doesn’t work for students who have to work. Did anyone think about us?',
    },
    lines: {
      time: { pro: 'I could keep my job and still keep my grades up.', con: 'My shift starts right after school. This would mess that up.' },
      cost: { pro: 'My family counts on my paycheck, so anything that saves money helps.', con: 'Extra costs hit families like mine first.' },
      equity: { pro: "Finally, something that works for students who aren't rich.", con: 'Students who have to work get left behind again.' },
    },
  },
  {
    id: 'park', name: 'Ms. Hana Park', age: 36, role: 'School counselor', group: 'Counselors & support staff', hue: 330, share: 0.1, roles: ['counselor','health'],
    values: { wellbeing: 1, equity: 0.7, safety: 0.5, community: 0.4 },
    changeAversion: 0.25,
    openers: {
      strongSupport: 'For student mental health, {phrase} is one of the best things we could do.',
      support: 'I think {phrase} would help a lot of the students I work with.',
      neutral: '{Phrase} could go either way for student well-being.',
      oppose: "I'm concerned about how {phrase} affects student stress.",
      strongOppose: "I'd be seeing the fallout of {phrase} in my office every day.",
    },
    lines: {
      wellbeing: { pro: 'Students who are rested and supported learn better and struggle less.', con: 'I already have a waitlist. This would add to the anxiety I see.' },
      equity: { pro: 'It helps the students who carry the most outside of school.', con: 'Vulnerable students will feel this the most.' },
      safety: { pro: 'Students feel safer, and safe students can focus.', con: 'Some students will feel less safe, and that worries me.' },
    },
  },
];

const personal: Persona[] = [
  {
    id: 'mom', name: 'Mom', age: 47, role: 'Has known you longer than anyone', group: 'Parents', hue: 28, share: 0.16, roles: ['parent','family'],
    values: { safety: 0.8, stability: 0.8, wellbeing: 0.7, cost: 0.5, tradition: 0.3 },
    changeAversion: 0.6,
    openers: {
      strongSupport: "Sweetheart, I'm so proud of you. {Phrase} sounds wonderful.",
      support: 'If it makes you happy, I support {phrase}.',
      neutral: "I just want to make sure you've thought {phrase} through.",
      oppose: "Honey, I'm worried about {phrase}.",
      strongOppose: 'Please, please don’t rush into {phrase}.',
    },
    lines: {
      stability: { pro: "You'd have something solid to stand on, and that lets me sleep at night.", con: 'I just want you to have something stable to fall back on.' },
      safety: { pro: "You'd be safe, and that's all a parent wants.", con: "I'd lie awake worrying about whether you're okay." },
      wellbeing: { pro: 'You seem happier just talking about it.', con: "I don't want you burning yourself out." },
      cost: { pro: "It's financially smart, and I'm impressed.", con: 'Have you thought about how you’ll pay the bills?' },
    },
  },
  {
    id: 'alex', name: 'Alex', age: 18, role: 'Best friend since sixth grade', group: 'Close friends', hue: 285, share: 0.14, roles: ['friend','young-adult'],
    values: { freedom: 0.8, wellbeing: 0.7, community: 0.6, growth: 0.5, innovation: 0.4 },
    changeAversion: 0.1,
    openers: {
      strongSupport: 'YES. {Phrase} is so you. Do it.',
      support: 'Honestly? I think {phrase} could be great for you.',
      neutral: "I'm with you either way, but are you sure about {phrase}?",
      oppose: "I love you, but I'm not sure {phrase} is the move.",
      strongOppose: 'As your best friend, I have to say it: {phrase} is a bad idea.',
    },
    lines: {
      freedom: { pro: 'You only get one life. Go live it.', con: "It feels like you'd be boxing yourself in." },
      wellbeing: { pro: "You'd be so much happier. I can already tell.", con: "I've seen you stressed before, and this feels like that." },
      community: { pro: "I'll be there every step, and so will everyone who loves you.", con: "I'd miss you, and I think you'd miss all of us too." },
      growth: { pro: "This is how you grow. You'd come out of it a different person.", con: "I'm not sure this actually moves you forward." },
    },
  },
  {
    id: 'rivera', name: 'Ms. Rivera', age: 55, role: 'Mentor & former teacher', group: 'Mentors', hue: 205, share: 0.12, roles: ['mentor'],
    values: { growth: 1, stability: 0.4, innovation: 0.5, equity: 0.2 },
    changeAversion: 0.3,
    openers: {
      strongSupport: "I've watched you grow for years. {Phrase} is the leap I hoped you'd take.",
      support: '{Phrase} lines up with your strengths.',
      neutral: "{Phrase} could work. Let's look at your long-term goals.",
      oppose: "I'd encourage you to think twice about {phrase}.",
      strongOppose: "As your mentor, I can't recommend {phrase} right now.",
    },
    lines: {
      growth: { pro: 'It stretches you in exactly the direction your talents point.', con: 'I worry it pulls you off a path where you were really building momentum.' },
      stability: { pro: "It's a calculated risk, the kind that pays off.", con: 'Big leaps work best with a safety net. Do you have one?' },
      innovation: { pro: "You'd be learning things most people your age never get to.", con: "Shiny and new isn't always better than proven." },
    },
  },
  {
    id: 'joe', name: 'Grandpa Joe', age: 78, role: 'Grandfather, retired machinist', group: 'Grandparents', hue: 48, share: 0.1, roles: ['grandparent','family','elder'],
    values: { tradition: 0.9, stability: 0.7, community: 0.7, cost: 0.6, innovation: -0.4 },
    changeAversion: 0.7,
    openers: {
      strongSupport: "In my day we'd call that guts. {Phrase}? Go get 'em, kid.",
      support: '{Phrase}, huh? I think your grandmother would have liked that.',
      neutral: '{Phrase} is a new one on me. Tell me more.',
      oppose: "I don't know about {phrase}, kiddo.",
      strongOppose: "Kiddo, {phrase} doesn't sit right with me. Not one bit.",
    },
    lines: {
      tradition: { pro: "It's the way our family has always done things: hard work and roots.", con: "Our family has always done things a certain way, and this isn't it." },
      community: { pro: 'Family is everything, and this keeps you close to it.', con: "Family is everything. Don't drift too far from it." },
      cost: { pro: 'Money saved is money earned. Smart thinking.', con: "Don't spend what you don't have. That's what got half my friends in trouble." },
      stability: { pro: 'Slow and steady. That is how you build a life.', con: "You don't tear down the house to fix a leaky faucet." },
    },
  },
  {
    id: 'jamie', name: 'Jamie', age: 13, role: 'Younger sibling', group: 'Siblings', hue: 330, share: 0.1, roles: ['sibling','family','teen'],
    values: { community: 0.8, freedom: 0.6, wellbeing: 0.5, innovation: 0.5 },
    changeAversion: 0.3,
    openers: {
      strongSupport: "Wait, that's SO cool. {Phrase} is the best idea ever.",
      support: "{Phrase}? Okay, that's actually kind of awesome.",
      neutral: '{Phrase}… does that mean things change at home?',
      oppose: "I don't really like the idea of {phrase}.",
      strongOppose: "No! {Phrase} means you won't be around anymore.",
    },
    lines: {
      community: { pro: "We'd get to hang out more, and that's all I care about.", con: "Who's going to help me with homework if you're not here?" },
      freedom: { pro: "You'd be like a real adult doing your own thing. That's cool.", con: 'Mom and Dad will be even stricter with me after this.' },
      innovation: { pro: 'That sounds like something out of a movie.', con: 'That sounds kind of boring, honestly.' },
      wellbeing: { pro: "You'd stop being so grumpy all the time.", con: "You'd be stressed and grumpy all the time." },
    },
  },
  {
    id: 'priyanka', name: 'Priyanka', age: 31, role: 'Finance-savvy cousin', group: 'Money-minded advisors', hue: 185, share: 0.12, roles: ['money','family'],
    values: { cost: 1, stability: 0.7, growth: 0.5 },
    changeAversion: 0.4,
    openers: {
      strongSupport: 'I ran rough numbers on {phrase}, and it pencils out. Go for it.',
      support: 'Financially, {phrase} is defensible.',
      neutral: '{Phrase} could work if you build a budget first.',
      oppose: 'The math on {phrase} makes me nervous.',
      strongOppose: 'Financially, {phrase} is a red flag.',
    },
    lines: {
      cost: { pro: 'It sets you up for long-term savings, and savings compound.', con: 'Make sure you have six months of expenses saved first. Seriously.' },
      stability: { pro: 'It reduces risk, and low risk is underrated.', con: "The income risk here is real. What's plan B?" },
      growth: { pro: 'The upside is worth more than the short-term cost.', con: "The upside doesn't justify the downside yet." },
    },
  },
  {
    id: 'taylor', name: 'Taylor', age: 22, role: 'Partner', group: 'Partners', hue: 95, share: 0.12, roles: ['partner'],
    values: { community: 0.8, wellbeing: 0.7, stability: 0.5, time: 0.6 },
    changeAversion: 0.35,
    openers: {
      strongSupport: "I'm so in. {Phrase} could be amazing for us.",
      support: "I'll support you on {phrase}. We'll figure it out.",
      neutral: "Let's talk about how {phrase} affects us both.",
      oppose: "I'm not sure {phrase} works for us right now.",
      strongOppose: 'We need to talk. {Phrase} changes everything for us.',
    },
    lines: {
      community: { pro: 'It feels like building something together.', con: 'I just need to know where I fit in this plan.' },
      time: { pro: "We'd finally have more time together.", con: 'We already barely see each other.' },
      wellbeing: { pro: "You'd be less stressed, which means we'd both be happier.", con: "I'm worried about how stressed this would make you." },
      stability: { pro: 'It gives us something steady to build on.', con: 'It makes our plans feel shaky.' },
    },
  },
  {
    id: 'future', name: 'Future You', age: 0, role: 'You, ten years from now', group: 'Future you', hue: 235, share: 0.14, roles: ['future-self'],
    values: { growth: 0.9, wellbeing: 0.8, freedom: 0.6, stability: 0.3, cost: 0.3 },
    changeAversion: 0,
    openers: {
      strongSupport: "Ten years from now, {phrase} is one of the choices I'm proudest of.",
      support: 'Looking back, {phrase} was a good call.',
      neutral: 'From here, {phrase} matters less than how you handle it.',
      oppose: "From where I'm standing, {phrase} wasn't worth the stress.",
      strongOppose: "Trust me on this one. {Phrase} isn't the way.",
    },
    lines: {
      growth: { pro: 'The skills you pick up from this open every door later.', con: 'It cost us years we could have spent building something lasting.' },
      wellbeing: { pro: "You'll be grateful you chose the life that felt like yours.", con: 'I remember how drained that period made us.' },
      freedom: { pro: "You won't regret the risks. Only the ones you didn't take.", con: 'It locked us into something we outgrew fast.' },
      cost: { pro: 'Our bank account thanks you.', con: 'We spent years paying that off.' },
    },
  },
];

const business: Persona[] = [
  {
    id: 'diane', name: 'Diane Foster', age: 63, role: 'Customer for 12 years', group: 'Loyal customers', hue: 48, share: 0.2, roles: ['customer','regular','elder'],
    values: { tradition: 0.7, stability: 0.7, cost: 0.6, community: 0.5 },
    changeAversion: 0.65,
    openers: {
      strongSupport: "I've been coming here for 12 years, and {phrase} makes me love it even more.",
      support: '{Phrase} seems like a nice change.',
      neutral: "As long as {phrase} doesn't change what I love about you.",
      oppose: "I'm not thrilled about {phrase}.",
      strongOppose: 'If {phrase} happens, I might finally take my business elsewhere.',
    },
    lines: {
      tradition: { pro: 'It keeps what made me fall in love with this place.', con: "You're changing the thing that made you special." },
      cost: { pro: "Better value for loyal customers. That's how you keep us.", con: 'Raising costs on loyal customers is how you lose them.' },
      stability: { pro: 'Consistency is why I keep coming back.', con: "I don't like surprises from places I trust." },
      community: { pro: 'It feels like a neighborhood place again.', con: 'It feels less like a neighborhood place.' },
    },
  },
  {
    id: 'jaylen', name: 'Jaylen Moore', age: 24, role: 'First-time customer', group: 'New customers', hue: 285, share: 0.18, roles: ['customer','young-adult'],
    values: { innovation: 0.7, cost: 0.7, time: 0.6, freedom: 0.4 },
    changeAversion: 0.1,
    openers: {
      strongSupport: '{Phrase} is exactly what would get me to try you out.',
      support: '{Phrase} makes me more likely to check you out.',
      neutral: "{Phrase} doesn't really change my mind either way.",
      oppose: '{Phrase} makes me less interested, honestly.',
      strongOppose: '{Phrase}? Hard pass. There are plenty of other options.',
    },
    lines: {
      innovation: { pro: 'It feels modern, like a brand that gets my generation.', con: 'It feels a little behind the times.' },
      cost: { pro: 'Good value is the fastest way to win me over.', con: 'There are cheaper options a tap away.' },
      time: { pro: "Fast and convenient? I'm in.", con: "If it takes more effort, I'm out." },
    },
  },
  {
    id: 'marcus', name: 'Marcus Reid', age: 27, role: 'Frontline employee, 3 years', group: 'Frontline staff', hue: 205, share: 0.14, roles: ['employee','worker'],
    values: { wellbeing: 0.7, stability: 0.8, cost: 0.5, time: 0.6, equity: 0.5 },
    changeAversion: 0.45,
    openers: {
      strongSupport: 'The team is going to be pumped about {phrase}.',
      support: '{Phrase} could make our jobs better.',
      neutral: "We're waiting to hear how {phrase} affects our shifts.",
      oppose: 'The break room is not happy about {phrase}.',
      strongOppose: "{Phrase} could cost people their jobs. I'm worried.",
    },
    lines: {
      stability: { pro: "It means more job security, and that's everything.", con: "People are worried about their jobs, and nobody's telling us anything." },
      wellbeing: { pro: 'Less burnout, better morale. Customers will feel it.', con: "We're already short-staffed and exhausted." },
      time: { pro: 'More predictable hours would change my life.', con: 'Our hours are going to get messed with. I can feel it.' },
      equity: { pro: 'It finally treats the people on the floor fairly.', con: "The people on the floor always take the hit first." },
    },
  },
  {
    id: 'elena', name: 'Elena Vasquez', age: 42, role: 'Operations manager', group: 'Managers', hue: 185, share: 0.1, roles: ['manager'],
    values: { growth: 0.7, stability: 0.6, cost: 0.6, time: 0.5 },
    changeAversion: 0.4,
    openers: {
      strongSupport: 'Operationally, {phrase} is a no-brainer.',
      support: 'I can make {phrase} work with the right plan.',
      neutral: '{Phrase} is possible. The rollout will decide everything.',
      oppose: 'I see a lot of operational risk in {phrase}.',
      strongOppose: '{Phrase} would break our operations.',
    },
    lines: {
      growth: { pro: 'It scales, which means we can finally grow without chaos.', con: 'It slows us down right when we need to grow.' },
      stability: { pro: 'Clear process, predictable results.', con: "We'd be rebuilding processes mid-season. That's how mistakes happen." },
      cost: { pro: 'It cuts waste and improves margins.', con: 'The implementation costs are being underestimated.' },
    },
  },
  {
    id: 'hale', name: 'Richard Hale', age: 55, role: 'Early investor', group: 'Investors & owners', hue: 235, share: 0.06, roles: ['investor','owner'],
    values: { growth: 1, cost: 0.7, innovation: 0.5, stability: 0.3 },
    changeAversion: 0.3,
    openers: {
      strongSupport: 'This is the kind of growth move I invested for. Full speed on {phrase}.',
      support: '{Phrase} has upside. I’m supportive.',
      neutral: 'I need to see the projections on {phrase}.',
      oppose: "I'm not convinced {phrase} creates value.",
      strongOppose: '{Phrase} destroys value. I will vote against it.',
    },
    lines: {
      growth: { pro: "It opens a new market. That's real upside.", con: 'It distracts from the core business that pays the bills.' },
      cost: { pro: 'Better unit economics. Love to see it.', con: 'The burn rate on this makes me nervous.' },
      innovation: { pro: 'Being first matters. This puts us ahead.', con: "We'd be paying to be the guinea pig." },
    },
  },
  {
    id: 'gloria', name: 'Gloria Nakamura', age: 60, role: 'Lives next door to the shop', group: 'Neighbors', hue: 95, share: 0.1, roles: ['neighbor','elder'],
    values: { community: 0.8, environment: 0.6, safety: 0.5, tradition: 0.5 },
    changeAversion: 0.5,
    openers: {
      strongSupport: '{Phrase} is great for the neighborhood.',
      support: 'From next door, {phrase} seems fine.',
      neutral: "I'm curious how {phrase} affects the block.",
      oppose: 'Neighbors are going to have concerns about {phrase}.',
      strongOppose: '{Phrase} will make this block worse to live on.',
    },
    lines: {
      community: { pro: "You're a good neighbor, and this proves it.", con: 'More traffic, more noise. We live here.' },
      environment: { pro: 'Less waste and less noise. Thank you.', con: 'Think about the trash, the traffic, and the noise.' },
      safety: { pro: 'A busier, well-lit street feels safer at night.', con: 'More strangers and late nights make the block feel less safe.' },
      tradition: { pro: 'It fits the character of the street.', con: "It doesn't fit the character of the street." },
    },
  },
  {
    id: 'zoe', name: 'Zoe Kim', age: 26, role: 'Local creator, 48k followers', group: 'Online audience', hue: 330, share: 0.12, roles: ['creator','young-adult','customer'],
    values: { innovation: 0.8, community: 0.5, freedom: 0.4, environment: 0.4, tradition: -0.2 },
    changeAversion: 0.1,
    openers: {
      strongSupport: '{Phrase} is going straight on my story.',
      support: '{Phrase}? My followers are going to like this.',
      neutral: 'My comments are split on {phrase}.',
      oppose: "My audience isn't loving {phrase}, and they're loud about it.",
      strongOppose: '{Phrase} is getting roasted in my comments right now.',
    },
    lines: {
      innovation: { pro: "Fresh, different, shareable. That's how you go viral the good way.", con: 'It feels corporate. People can tell.' },
      community: { pro: 'It feels like a brand that actually cares about its people.', con: 'It feels like you stopped listening to your community.' },
      environment: { pro: 'Sustainable choices get people talking, in a good way.', con: 'People will call out the waste instantly.' },
    },
  },
  {
    id: 'ben', name: 'Ben Ortiz', age: 48, role: 'Local farm supplier', group: 'Suppliers & partners', hue: 28, share: 0.1, roles: ['supplier','owner'],
    values: { stability: 0.8, growth: 0.6, community: 0.6, cost: 0.4 },
    changeAversion: 0.4,
    openers: {
      strongSupport: 'As your supplier, {phrase} is great news for local producers.',
      support: '{Phrase} works for us if orders stay steady.',
      neutral: "We'll adapt to {phrase}. We just need notice.",
      oppose: '{Phrase} puts our partnership under strain.',
      strongOppose: "{Phrase} could end a partnership we've built for years.",
    },
    lines: {
      stability: { pro: 'Steady orders let a small farm like mine plan ahead.', con: 'Sudden changes in orders hit small suppliers hard.' },
      community: { pro: 'Buying local keeps money in this community.', con: 'It moves business away from local partners.' },
      growth: { pro: 'If you grow, we grow with you.', con: "I don't see room for us in this new plan." },
    },
  },
];

export const PERSONAS: Record<Scope, Persona[]> = { community, school, personal, business };

export const SCOPE_META: Record<Scope, { label: string; crowdNoun: string; forum: string; moderator: string }> = {
  personal: { label: 'Personal', crowdNoun: 'people in your life', forum: 'The dinner table', moderator: 'You' },
  school: { label: 'School', crowdNoun: 'students, staff & families', forum: 'Student forum', moderator: 'Forum moderator' },
  community: { label: 'Community', crowdNoun: 'residents', forum: 'Town hall', moderator: 'Moderator' },
  business: { label: 'Business', crowdNoun: 'customers, staff & partners', forum: 'All-hands meeting', moderator: 'Moderator' },
};
