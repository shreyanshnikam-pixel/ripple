import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, extractPhrase, simulate } from './engine';
import { EXAMPLES } from './examples';

test('same decision always produces the same report', () => {
  const a = simulate({ decision: 'Ban phones during the school day' });
  const b = simulate({ decision: 'Ban phones during the school day' });
  assert.deepEqual(a.summary, b.summary);
  assert.deepEqual(a.crowd.slice(0, 20), b.crowd.slice(0, 20));
});

test('shares always add up to 100 and the crowd has the requested size', () => {
  for (const e of EXAMPLES) {
    const r = simulate({ decision: e.text, crowdSize: 600 });
    assert.equal(r.crowd.length, 600);
    assert.equal(r.summary.support + r.summary.neutral + r.summary.oppose, 100);
    for (const t of r.timeline) assert.equal(t.support + t.neutral + t.oppose, 100);
    for (const g of r.groups) assert.equal(g.support + g.neutral + g.oppose, 100);
  }
});

test('scope detection picks the right room', () => {
  assert.equal(analyze('Ban phones during the school day').scope, 'school');
  assert.equal(analyze("I'm thinking about quitting my job to start a bakery").scope, 'personal');
  assert.equal(analyze('Raise the local sales tax by 1% to fund a new library').scope, 'community');
  assert.equal(analyze('Raise our café prices by 15% to pay staff a living wage').scope, 'business');
});

test('phrases read naturally from other people’s point of view', () => {
  assert.equal(extractPhrase('Should our town ban leaf blowers?', 'community').phrase, 'banning leaf blowers');
  assert.equal(extractPhrase("I'm thinking about quitting my job", 'personal').phrase, 'quitting your job');
  assert.equal(extractPhrase('Lincoln High should start school later', 'school').phrase, 'starting school later');
});

test('applying a recommended fix does not lower support', () => {
  const base = simulate({ decision: 'Raise the local sales tax by 1% to fund a new library' });
  const fix = base.recommendations[0];
  assert.ok(fix, 'expected at least one recommendation');
  const after = simulate({ decision: base.decision + fix.modifier, scope: base.scope });
  assert.ok(after.summary.net >= base.summary.net, `${after.summary.net} < ${base.summary.net}`);
});

test('mitigations are detected', () => {
  const a = analyze('Close the old library, starting with a small pilot and an opt-out option');
  const ids = a.signals.filter((s) => s.kind === 'mitigation').map((s) => s.id);
  assert.ok(ids.includes('pilot'));
  assert.ok(ids.includes('optional'));
});

test('empty decisions are rejected', () => {
  assert.throws(() => simulate({ decision: '   ' }));
});
