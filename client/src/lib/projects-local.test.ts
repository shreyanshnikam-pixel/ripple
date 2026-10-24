/**
 * Projects and classes without a server (GitHub Pages and the preview): they must work
 * like the server version, on one device.
 */
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const L = await import('./projects-local');
beforeEach(() => mem.clear());

test('an owner can create a project, add a simulation and read it back', () => {
  const { id, key, joinCode } = L.createLocalProject('Student council, fall 2026', 'project');
  assert.ok(L.isLocalProject(id));
  assert.equal(joinCode, null);
  const item = L.addLocalSimulation(id, key, { decision: 'Start school at 8:30 a.m. instead of 7:30', scope: 'school' });
  assert.equal(item.kind, 'simulation');
  assert.equal(item.author, null);
  const v = L.getLocalProject(id, key);
  assert.equal(v.role, 'owner');
  assert.equal(v.project.name, 'Student council, fall 2026');
  assert.equal(v.items.length, 1);
  assert.equal(v.rollup.simulations, 1);
  assert.ok(v.items[0].snapshot.support >= 0 && v.items[0].snapshot.support <= 100);
});

test('students join a class with its code and a nickname, and their work rolls up for the teacher', () => {
  const c = L.createLocalProject('Civics, period 3', 'class');
  assert.match(c.joinCode!, /^[A-Z0-9]{6}$/);
  const maya = L.joinLocalClass(c.joinCode!.toLowerCase(), 'Maya R.');
  assert.equal(maya.id, c.id);
  L.addLocalSimulation(c.id, maya.token, { decision: 'Ban phones during class', scope: 'school' });
  const teacher = L.getLocalProject(c.id, c.key);
  assert.equal(teacher.project.joinCode, c.joinCode);
  assert.deepEqual(teacher.members, ['Maya R.']);
  assert.equal(teacher.items[0].author, 'Maya R.');
  assert.deepEqual(teacher.rollup.byAuthor, [{ author: 'Maya R.', items: 1 }]);
  const student = L.getLocalProject(c.id, maya.token);
  assert.equal(student.role, 'member');
  assert.equal(student.me, 'Maya R.');
  assert.equal(student.project.joinCode, undefined, 'students do not see the join code');
  assert.equal(student.members, undefined, 'students do not see the class list');
});

test('wrong codes, duplicate nicknames, contact details and missing keys are refused', () => {
  const c = L.createLocalProject('Civics', 'class');
  assert.throws(() => L.joinLocalClass('ZZZZZZ', 'Sam'), /No class on this device/);
  L.joinLocalClass(c.joinCode!, 'Sam');
  assert.throws(() => L.joinLocalClass(c.joinCode!, 'Sam'), /already uses that nickname/);
  assert.throws(() => L.joinLocalClass(c.joinCode!, 'sam@example.com'), /email/);
  assert.throws(() => L.getLocalProject(c.id, 'not-a-key'), /missing its private key/);
  assert.throws(() => L.getLocalProject('l-nothere', c.key), /another device/);
});

test('only the teacher or the student who added an item can remove it', () => {
  const c = L.createLocalProject('Civics', 'class');
  const a = L.joinLocalClass(c.joinCode!, 'Ana');
  const b = L.joinLocalClass(c.joinCode!, 'Ben');
  const item = L.addLocalSimulation(c.id, a.token, { decision: 'Make school lunch free for all students', scope: 'school' });
  assert.throws(() => L.removeLocalItem(c.id, b.token, item.id), /Only the teacher/);
  assert.deepEqual(L.removeLocalItem(c.id, a.token, item.id), { ok: true });
  assert.equal(L.getLocalProject(c.id, c.key).items.length, 0);
});

test('on-device surveys can be added, and their answers count in the roll-up', () => {
  const p = L.createLocalProject('Council', 'project');
  mem.set(
    'ripple:surveys',
    JSON.stringify({
      'l-survey1': {
        def: { decision: 'Ban phones during class', scope: 'school', district: null, predicted: { support: 60, neutral: 10, oppose: 30, byGroup: {} } },
        key: 'k',
        responses: Array.from({ length: 10 }, (_, i) => ({ stance: i < 7 ? 'support' : 'oppose', group: null, reason: null, at: i })),
      },
    }),
  );
  L.addLocalSurvey(p.id, p.key, 'l-survey1');
  const v = L.getLocalProject(p.id, p.key);
  assert.equal(v.rollup.surveys, 1);
  assert.equal(v.rollup.answers, 10);
  assert.equal(v.rollup.averageGap, 10, 'real 70% vs predicted 60%');
  assert.throws(() => L.addLocalSurvey(p.id, p.key, 'l-missing'), /isn’t on this device/);
});
