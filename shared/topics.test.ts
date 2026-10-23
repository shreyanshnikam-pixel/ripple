/**
 * Housing, school safety, climate and local taxes: the topics districts ask about most.
 * Each published poll must be the starting point for its decision, and the simulation
 * must land near it. Decisions without a poll must not borrow one by accident.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './engine';
import type { DecisionInput, SimulationResult } from './types';

const run = (decision: string, extra: Partial<DecisionInput> = {}) => simulate({ decision, ...extra });
const polled = (r: SimulationResult, expected: number, tol: number, org: RegExp) => {
  assert.equal(r.reality?.anchor.basis, 'poll', `"${r.decision}" should start from a poll, got ${r.reality?.anchor.basis} (${r.reality?.anchor.label})`);
  assert.match(r.reality!.anchor.source!.org, org, `"${r.decision}" started from ${r.reality!.anchor.source!.org}`);
  assert.equal(r.reality!.anchor.support, expected, `"${r.decision}" anchor ${r.reality!.anchor.support}% vs poll ${expected}%`);
  const got = r.reality!.simulated;
  assert.ok(Math.abs(got - expected) <= tol, `"${r.decision}": simulated ${got}% vs poll ${expected}% (±${tol})`);
};
const anchorOf = (decision: string, extra: Partial<DecisionInput> = {}) => run(decision, extra).reality?.anchor;

// ───────── housing ─────────
test('a new apartment building nearby matches YouGov (65%, 2022)', () => polled(run('Build a new apartment building downtown'), 65, 8, /YouGov/));
test('allowing duplexes and townhomes matches AEI/Ipsos (48%, 2026)', () => polled(run('Allow duplexes and townhomes in single-family neighborhoods'), 48, 8, /AEI/));
test('high-density zoning matches YouGov (30%, 2022)', () => polled(run('Rezone our neighborhood for high-density apartment towers'), 30, 8, /YouGov/));
test('low-income housing nearby matches YouGov (65%, 2022)', () => polled(run('Build low-income housing in our town'), 65, 8, /YouGov/));
test('a homeless shelter nearby matches YouGov (64%, 2022)', () => polled(run('Open a homeless shelter near downtown'), 64, 8, /YouGov/));
test('capping rent increases matches YouGov (69%, 2022)', () => polled(run('Cap yearly rent increases at 5%'), 69, 8, /YouGov/));
test('rent control that freezes rents matches YouGov (61%, 2022)', () => polled(run('Pass rent control that stops landlords from raising rent'), 61, 8, /YouGov/));
test('more spending on public housing matches YouGov (60%, 2022)', () => polled(run('Increase spending on public housing'), 60, 8, /YouGov/));
test('density is less popular than a single apartment building', () => {
  assert.ok(anchorOf('Rezone for high-density housing')!.support < anchorOf('Build a new apartment building')!.support);
});
test('young renters are for rent caps, and business owners are cooler on them', () => {
  const r = run('Cap yearly rent increases at 5%');
  const net = (id: string) => r.groups.find((g) => g.personaId === id)!.net;
  assert.ok(net('kevin') > 0, `young professionals ${net('kevin')}`);
  assert.ok(net('kevin') > net('darnell'), `young ${net('kevin')} vs owner ${net('darnell')}`);
});

// ───────── school safety ─────────
test('armed police in schools match PDK (80%, 2022)', () => polled(run('Put armed police officers in every school'), 80, 8, /PDK/));
test('metal detectors at school entrances match PDK (78%, 2022)', () => polled(run('Install metal detectors at all school entrances'), 78, 8, /PDK/));
test('letting teachers carry guns matches Pew (50%, 2023)', () => polled(run('Allow teachers to carry guns at school'), 50, 8, /Pew/));
test('teachers carrying guns is more divisive than police officers', () => {
  const guns = run('Allow teachers to carry guns at school');
  const police = run('Put armed police officers in every school');
  assert.ok(guns.summary.support < police.summary.support);
});
test('a school board asking about security officers still uses the poll', () => {
  assert.equal(anchorOf('Hire a school resource officer for each school', { scope: 'community' })?.basis, 'poll');
});

// ───────── climate & energy ─────────
test('prioritizing wind and solar matches Pew (57%, 2026)', () => polled(run('Prioritize wind and solar power over fossil fuels'), 57, 8, /Pew/));
test('taxing corporations on carbon emissions matches Pew (70%, 2023)', () => polled(run('Tax corporations on their carbon emissions'), 70, 8, /Pew/));
test('a carbon tax is not read as a tax on the rich', () => {
  assert.equal(anchorOf('Put a tax on carbon emissions from big companies')?.id, 'carbon-tax');
});
test('a solar farm nearby matches NORC (68%, 2026), and says who paid for the poll', () => {
  const r = run('Build a solar farm outside town');
  polled(r, 68, 8, /NORC/);
  assert.match(r.reality!.anchor.note ?? '', /GoodPower/);
});
test('a wind farm nearby matches YouGov (63%, 2022)', () => polled(run('Build a wind farm near our town'), 63, 8, /YouGov/));
test('banning gas stoves matches YouGov (40%, 2023)', () => polled(run('Ban gas stoves'), 40, 8, /YouGov/));
test('all-electric new buildings match Pew (46%, 2023)', () => polled(run('Require new buildings to be all-electric with no gas hookups'), 46, 8, /Pew/));
test('gas stoves are not read as gas cars', () => {
  assert.notEqual(anchorOf('Ban new gas stoves')?.id, 'gas-cars');
});

// ───────── local taxes ─────────
test('raising property taxes for teacher pay matches PDK (67%, 2023)', () => polled(run('Raise local property taxes to increase teacher salaries'), 67, 8, /PDK/));
test('a school building bond stays a labeled estimate (no national poll)', () => {
  const a = anchorOf('Pass a $40 million school bond to fix old buildings', { scope: 'community' });
  assert.equal(a?.id, 'local-tax');
  assert.equal(a?.basis, 'estimate');
});

// ───────── bills on these topics ─────────
test('the housing law and the school-officer bill start from the right polls', async () => {
  const { BILLS } = await import('./bills');
  const law = BILLS.find((b) => b.number === 'H.R. 6644')!;
  assert.equal(law.stage, 'law');
  assert.equal(run(law.decision, { scope: law.scope }).reality?.anchor.id, 'housing');
  const guards = BILLS.find((b) => b.number === 'S. 1189')!;
  polled(run(guards.decision, { scope: guards.scope }), 80, 8, /PDK/);
});
