/**
 * Realism benchmarks. Where a real poll exists, Ripple's simulated day-one
 * support among the polled population must land close to it. Where none
 * exists, results must at least move in the direction common sense demands.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, simulate } from './engine';
import type { DecisionInput, SimulationResult } from './types';

const run = (decision: string, extra: Partial<DecisionInput> = {}) => simulate({ decision, ...extra });
const near = (r: SimulationResult, expected: number, tol: number) => {
  assert.ok(r.reality, `expected a reality check for "${r.decision}"`);
  const got = r.reality!.simulated;
  assert.ok(Math.abs(got - expected) <= tol, `"${r.decision}": simulated ${got}% vs poll ${expected}% (±${tol})`);
};
const group = (r: SimulationResult, id: string) => {
  const g = r.groups.find((x) => x.personaId === id);
  assert.ok(g, `no group ${id}`);
  return g!;
};

test('banning all devices across a community is overwhelmingly opposed', () => {
  const r = run('ban all devices', { scope: 'community' });
  assert.ok(r.summary.support <= 12, `support was ${r.summary.support}%`);
  assert.equal(r.summary.verdict, 'Strong opposition');
});

test('banning all devices at school is unpopular, and students oppose it most', () => {
  const r = run('Ban all devices at school');
  assert.equal(r.scope, 'school');
  assert.ok(r.summary.support <= 30, `support was ${r.summary.support}%`);
  assert.ok(group(r, 'maya').net < group(r, 'alvarez').net);
});

test('in-class phone bans match Pew (68% of adults, 2024)', () => near(run('Ban phones during class'), 68, 7));
test('all-day phone bans match Pew (36% of adults, 2024)', () => near(run('Ban phones for the entire school day'), 36, 7));

test('wording matters: class-only > all day > all devices', () => {
  const a = run('Ban phones during class').summary.support;
  const b = run('Ban phones for the entire school day').summary.support;
  const c = run('Ban all devices at school').summary.support;
  assert.ok(a > b && b > c, `${a} / ${b} / ${c}`);
});

test('a $15 minimum wage matches Pew (62%, 2021)', () => near(run('Raise the minimum wage to $15 an hour'), 62, 8));
test('a TikTok ban matches Pew (34%, 2025)', () => near(run('Ban TikTok'), 34, 8));
test('phasing out gas cars by 2035 matches Pew (40%, 2023)', () => near(run('Phase out gas-powered cars by 2035'), 40, 8));
test('parental consent for teen social media matches Pew (81% of adults, 2023)', () =>
  near(run('Require parental consent for teens to use social media'), 81, 7));
test('free school lunch for all students matches YouGov (60%, 2023)', () => near(run('Make school lunch free for all students'), 60, 8));

test('all-or-nothing wording lowers support', () => {
  const plain = run('Ban phones at school').summary.support;
  const extreme = run('Ban all phones at school forever').summary.support;
  assert.ok(plain - extreme >= 8, `${plain} vs ${extreme}`);
});

test('lifting a ban is read as the opposite of a ban', () => {
  assert.ok(group(run('Ban phones at school'), 'maya').net < 0);
  assert.ok(group(run('Lift the ban on phones at school'), 'maya').net > 0);
});

test('dropping out of high school gets little support from the people in your life', () => {
  const r = run('Drop out of high school');
  assert.equal(r.scope, 'personal');
  assert.ok(r.summary.support <= 25, `support was ${r.summary.support}%`);
});

test('quitting a job to start a business splits family and friends', () => {
  const r = run("I'm thinking about quitting my job to start a bakery");
  assert.ok(group(r, 'mom').net < 0);
  assert.ok(group(r, 'alex').net > 0);
});

test('an all-or-nothing ban suggests a narrower version that wins more support', () => {
  const r = run('Ban all devices at school');
  const alt = r.recommendations.find((x) => x.replace);
  assert.ok(alt, 'expected a narrower alternative');
  const after = run(alt!.replace!);
  assert.ok(after.summary.support >= r.summary.support + 15, `${r.summary.support} → ${after.summary.support}`);
});

test('who is in the room changes the result', () => {
  const d = 'Raise property taxes to fund new school buildings';
  const typical = run(d).summary.support;
  const retirement = run(d, { mix: { harold: 3, rosa: 2.5, priya: 0.4, maria: 0.6 } }).summary.support;
  assert.ok(typical - retirement >= 6, `${typical} vs ${retirement}`);
});

test('a parent raises the emergency-contact worry about school phone bans', () => {
  const r = run('Ban phones for the entire school day');
  const parent = r.personas.find((p) => p.id === 'carter')!;
  assert.match(parent.quote, /reach/i);
});

test('voices give different reasons, not one shared line', () => {
  const r = run('Ban phones during class');
  const reasons = new Set(r.personas.map((p) => p.changeMind));
  assert.ok(reasons.size >= 6, `only ${reasons.size} distinct reasons`);
});

test('when the setting is unclear, Ripple says what it assumed', () => {
  const a = analyze('Paint the bridge green');
  assert.ok(a.tips.some((t) => /setting|whole community/i.test(t)), a.tips.join(' | '));
});

test('device bans with no setting are assumed to be about school, and Ripple says so', () => {
  const a = analyze('ban all devices');
  assert.equal(a.scope, 'school');
  assert.ok(a.tips.some((t) => /assumed/i.test(t)), a.tips.join(' | '));
  assert.ok(run('ban all devices').summary.support <= 20);
});

test('cancelling summer break is nearly universally opposed', () => {
  const r = run('Cancel summer break');
  assert.equal(r.scope, 'school');
  assert.ok(r.summary.support <= 15, `support was ${r.summary.support}%`);
});

test('cancelling prom is unpopular', () => {
  const r = run('Cancel prom');
  assert.ok(r.summary.support <= 25, `support was ${r.summary.support}%`);
});

test('a trivial decision leaves most people undecided', () => {
  const r = run('Paint the hallways blue');
  assert.ok(r.summary.neutral >= 45, `undecided was ${r.summary.neutral}%`);
});

test('closing a library is read as closing a place people use', () => {
  const r = run('Close the old library');
  assert.match(r.reality!.anchor.label, /place/i);
  assert.ok(r.summary.support <= 25);
});

test('replacing cashiers with kiosks is a business decision', () => {
  assert.equal(analyze('Replace our cashiers with self-checkout kiosks').scope, 'business');
});

// ───────── Congress & politics (added with the civic sources) ─────────
/** Like near(), but also requires that the starting point is the named published poll. */
const polled = (r: SimulationResult, expected: number, tol: number, org: RegExp) => {
  assert.equal(r.reality?.anchor.basis, 'poll', `"${r.decision}" should start from a poll, got ${r.reality?.anchor.basis} (${r.reality?.anchor.label})`);
  assert.match(r.reality!.anchor.source!.org, org);
  near(r, expected, tol);
};

test('a popular vote for president matches Pew (63%, 2024)', () => polled(run('Elect the president by national popular vote instead of the Electoral College'), 63, 8, /Pew/));
test('photo ID to vote matches Pew (81%, 2024)', () => polled(run('Require a government-issued photo ID to vote'), 81, 7, /Pew/));
test('proof of citizenship to register matches Gallup (83%, 2024)', () => polled(run('Require proof of citizenship to register to vote'), 83, 8, /Gallup/));
test('a TikTok divest-or-ban law is read as a TikTok ban, not a business decision', () => {
  const r = run('Ban TikTok in the U.S. unless ByteDance sells it');
  assert.equal(r.reality?.anchor.id, 'tiktok-ban');
  assert.equal(r.scope, 'community');
});
test('showing ID somewhere other than the polls is not a voting rule', () => {
  assert.notEqual(run('Require students to show ID to enter the school').reality?.anchor.id, 'voter-id');
  assert.notEqual(run('Require customers to show ID to buy spray paint').reality?.anchor.id, 'voter-id');
});
test('Election Day as a national holiday matches Pew (72%, 2024)', () => polled(run('Make Election Day a national holiday'), 72, 8, /Pew/));
test('banning stock trading by members of Congress matches UMD (86%, 2023)', () => polled(run('Ban members of Congress from trading individual stocks'), 86, 7, /Maryland/));
test('Supreme Court term limits match AP-NORC (67%, 2022)', () => polled(run('Set term limits for Supreme Court justices'), 67, 8, /AP-NORC/));
test('legal recreational marijuana matches Pew (57%, 2024)', () => polled(run('Legalize marijuana for recreational use'), 57, 8, /Pew/));
test('Medicare drug price negotiation matches KFF (85%, 2024)', () => polled(run('Let Medicare negotiate prescription drug prices'), 85, 7, /KFF/));
test('background checks on private gun sales match Pew (81%, 2021)', () => polled(run('Require background checks for private gun sales and gun shows'), 81, 8, /Pew/));
test('raising taxes on large corporations matches Pew (63%, 2025)', () => polled(run('Raise taxes on large corporations'), 63, 8, /Pew/));

test('lowering the voting age to 16 is unpopular with adults but popular with teens', () => {
  const r = run('Lower the voting age to 16');
  assert.equal(r.reality?.anchor.id, 'voting-age');
  assert.ok(r.reality!.simulated <= 35, `adults ${r.reality!.simulated}%`);
  assert.ok(group(r, 'priya').net > 0, 'teens should lean for it');
});

test('every published poll anchor links to a source', async () => {
  const { ANCHORS } = await import('./anchors');
  for (const a of ANCHORS) {
    if (a.basis === 'poll') assert.ok(a.source?.url.startsWith('https://'), `${a.id} has no source`);
    for (const v of a.variants ?? []) if (v.basis === 'poll') assert.ok(v.source?.url.startsWith('https://'), `${a.id}/${v.label} has no source`);
  }
});

test('every published benchmark starts from its poll and lands within 9 points', async () => {
  const { BENCHMARKS } = await import('./benchmarks');
  for (const b of BENCHMARKS) {
    const r = run(b.decision, b.scope ? { scope: b.scope } : {});
    assert.equal(r.reality?.anchor.basis, 'poll', `${b.decision}: started from ${r.reality?.anchor.label} (${r.reality?.anchor.basis})`);
    assert.equal(r.reality!.anchor.support, b.poll, `${b.decision}: anchor ${r.reality!.anchor.support} vs poll ${b.poll}`);
    assert.ok(Math.abs(r.reality!.simulated - b.poll) <= 9, `${b.decision}: simulated ${r.reality!.simulated} vs ${b.poll}`);
  }
});

test('offering help to families who need it counts as financial support', () => {
  const plain = run('Require school uniforms', { scope: 'school' });
  const helped = run('Require school uniforms, with free uniforms for families who need them', { scope: 'school' });
  assert.ok(helped.analysis.signals.some((s) => s.id === 'support'), 'no financial support signal');
  assert.ok(helped.summary.net >= plain.summary.net + 3, `helped ${helped.summary.net} vs plain ${plain.summary.net}`);
});
