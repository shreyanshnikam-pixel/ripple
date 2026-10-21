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
