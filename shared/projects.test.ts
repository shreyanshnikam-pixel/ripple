import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanName, cleanNickname, makeJoinCode, rollup, type ProjectItem } from './projects';

test('project names are trimmed and limited', () => {
  assert.equal(cleanName('  Student council, fall 2026  '), 'Student council, fall 2026');
  assert.equal(cleanName('x'.repeat(200)).length, 80);
  assert.throws(() => cleanName('  '));
});

test('nicknames are short first names or handles, never contact details', () => {
  assert.equal(cleanNickname(' Maya R. '), 'Maya R.');
  assert.throws(() => cleanNickname('maya@school.org'), /email/i);
  assert.throws(() => cleanNickname('555-123-4567'), /phone/i);
  assert.throws(() => cleanNickname('a'));
  assert.throws(() => cleanNickname('x'.repeat(40)));
});

test('join codes are 6 easy-to-read characters', () => {
  const codes = new Set(Array.from({ length: 200 }, () => makeJoinCode()));
  for (const c of codes) assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  assert.ok(codes.size > 190);
});

const sim = (author: string | null, net: number): ProjectItem => ({
  id: Math.random().toString(36).slice(2),
  kind: 'simulation',
  decision: 'Ban phones during class',
  scope: 'school',
  author,
  created: 1,
  snapshot: { verdict: 'Divided', support: 40, oppose: 40, net },
});

test('a class roll-up counts work by student and compares surveys with predictions', () => {
  const items: ProjectItem[] = [sim('Maya', 5), sim('Leo', -10), sim('Maya', 20), { ...sim('Leo', 0), kind: 'survey', surveyId: 's1' }];
  const r = rollup(items, { s1: { n: 40, support: 70, predicted: 60 } });
  assert.equal(r.simulations, 3);
  assert.equal(r.surveys, 1);
  assert.equal(r.answers, 40);
  assert.deepEqual(r.byAuthor, [
    { author: 'Leo', items: 2 },
    { author: 'Maya', items: 2 },
  ]);
  assert.equal(r.averageGap, 10);
});

test('an empty project rolls up to zeros', () => {
  const r = rollup([], {});
  assert.equal(r.simulations, 0);
  assert.equal(r.averageGap, null);
});
