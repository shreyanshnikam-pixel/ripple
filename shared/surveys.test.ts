import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simulate } from './engine';
import { compareWithPrediction, makeSurvey, readResponse, tally, type SurveyResponse } from './surveys';

const r = simulate({ decision: 'Ban phones during class', scope: 'school' });
const def = makeSurvey(r, 'abc123');

test('a survey remembers what Ripple predicted, so real answers can be compared', () => {
  assert.equal(def.decision, r.decision);
  assert.equal(def.predicted.support, r.summary.support);
  assert.equal(def.predicted.oppose, r.summary.oppose);
  assert.ok(def.groups.length >= 6);
  assert.ok(def.groups.every((g) => typeof def.predicted.byGroup[g] === 'number'));
});

const resp = (stance: SurveyResponse['stance'], group: string | null = null): SurveyResponse => ({ stance, group, reason: null, at: 0 });

test('tally counts answers and rounds shares', () => {
  const t = tally([resp('support'), resp('support'), resp('oppose'), resp('neutral')]);
  assert.equal(t.n, 4);
  assert.deepEqual(t.counts, { support: 2, neutral: 1, oppose: 1 });
  assert.equal(t.support, 50);
  assert.equal(t.oppose, 25);
  assert.equal(t.net, 25);
});

test('groups appear only with enough answers to say anything', () => {
  const many = [...Array(3)].map(() => resp('support', 'Teachers'));
  const t = tally([...many, resp('oppose', 'Students')]);
  assert.deepEqual(
    t.byGroup.map((g) => g.group),
    ['Teachers'],
  );
});

test('an empty survey has no shares', () => {
  const t = tally([]);
  assert.equal(t.n, 0);
  assert.equal(t.support, 0);
});

test('the comparison is honest about small samples', () => {
  const few = compareWithPrediction(def, tally([resp('support'), resp('oppose')]));
  assert.equal(few.enough, false);
  assert.match(few.note, /conversation starter/i);
  const answers = [...Array(40)].map((_, i) => resp(i < 30 ? 'support' : 'oppose'));
  const lots = compareWithPrediction(def, tally(answers));
  assert.equal(lots.enough, true);
  assert.equal(lots.gap, 75 - def.predicted.support);
  assert.ok(lots.margin > 0 && lots.margin < 20);
});

test('responses are validated', () => {
  assert.deepEqual(readResponse({ stance: 'support', group: def.groups[0], reason: '  Less distraction.  ' }, def.groups), {
    stance: 'support',
    group: def.groups[0],
    reason: 'Less distraction.',
  });
  assert.equal(readResponse({ stance: 'oppose', group: 'Something else' }, def.groups).group, null);
  assert.equal(readResponse({ stance: 'oppose', reason: 'x'.repeat(900) }, def.groups).reason?.length, 280);
  assert.throws(() => readResponse({ stance: 'maybe' }, def.groups));
  assert.throws(() => readResponse(null, def.groups));
});
