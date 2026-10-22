import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calibrationTable, trackRecord, type CalibrationRecord } from './calibration';
import { simulate } from './engine';

const rec = (anchor: string, predicted: number, actual: number, n: number): CalibrationRecord => ({ anchor, predicted, actual, n });

test('no calibration until a topic has at least 3 surveys with 30+ answers', () => {
  assert.deepEqual(calibrationTable([rec('later-start', 40, 60, 100), rec('later-start', 40, 60, 100)]), {});
  assert.deepEqual(calibrationTable([rec('later-start', 40, 60, 100), rec('later-start', 40, 60, 100), rec('later-start', 40, 60, 12)]), {});
});

test('calibration is shrunk toward zero and capped at 5 points', () => {
  const t = calibrationTable([rec('later-start', 40, 60, 100), rec('later-start', 40, 60, 100), rec('later-start', 40, 60, 100)]);
  assert.equal(t['later-start'].points, 5, 'a 20-point gap is capped');
  assert.equal(t['later-start'].surveys, 3);
  const small = calibrationTable([rec('uniforms', 40, 44, 40), rec('uniforms', 40, 44, 40), rec('uniforms', 40, 44, 40)]);
  assert.ok(small.uniforms.points < 4, 'a 4-point gap from 120 answers is shrunk');
});

test('topics are calibrated separately', () => {
  const t = calibrationTable([
    ...[1, 2, 3].map(() => rec('a', 50, 55, 300)),
    ...[1, 2, 3].map(() => rec('b', 50, 45, 300)),
  ]);
  assert.ok(t.a.points > 0 && t.b.points < 0);
});

test('the track record reports mean error and how often reality fell within the margin', () => {
  const r = trackRecord([rec('a', 50, 52, 400), rec('b', 50, 70, 400), rec('c', 50, 30, 10)]);
  assert.equal(r.surveys, 2, 'small surveys are left out');
  assert.equal(r.meanAbsError, 11);
  assert.equal(r.withinMargin, 0.5);
});

test('the engine applies calibration as a labeled adjustment', () => {
  const plain = simulate({ decision: 'Start high school at 8:30 a.m. instead of 7:30', scope: 'community' });
  const cal = simulate({ decision: 'Start high school at 8:30 a.m. instead of 7:30', scope: 'community', calibration: { 'later-start': { points: 4, surveys: 3, answers: 300 } } });
  assert.ok(cal.reality!.adjustments.some((a) => /Calibrated with 3 real surveys/.test(a.label) && a.points === 4));
  assert.ok(cal.reality!.target > plain.reality!.target);
});

test('calibration for other topics does nothing', () => {
  const plain = simulate({ decision: 'Ban phones during class', scope: 'school' });
  const cal = simulate({ decision: 'Ban phones during class', scope: 'school', calibration: { 'later-start': { points: 4, surveys: 3, answers: 300 } } });
  assert.equal(cal.summary.support, plain.summary.support);
});
