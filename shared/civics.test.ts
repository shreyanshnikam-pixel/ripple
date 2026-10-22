import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simulate } from './engine';
import { letterFor, whoDecides } from './civics';

const simon = { name: 'Lateefah Simon', last: 'Simon', party: 'Democrat', url: 'https://simon.house.gov', phone: '202-225-2661' };

test('a letter to a representative names them and the district, and quotes the decision', () => {
  const r = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });
  const text = letterFor(r, { label: 'CA-12', rep: simon });
  assert.match(text, /^Dear Representative Simon,/);
  assert.match(text, /CA-12/);
  assert.match(text, /“Ban members of Congress from trading individual stocks\.?”/);
});

test('the letter cites the real poll and its link, never the simulated numbers', () => {
  const r = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });
  const text = letterFor(r, { label: 'CA-12', rep: simon });
  assert.match(text, /86% of those surveyed supported banning stock trading by members of Congress/);
  assert.match(text, /University of Maryland/);
  assert.match(text, /https:\/\/drum\.lib\.umd\.edu\//);
  assert.doesNotMatch(text, /simulat/i);
  assert.doesNotMatch(text, new RegExp(`\\b${r.summary.support}% for\\b`));
});

test('the letter takes no side: the writer fills in their own view', () => {
  const r = simulate({ decision: 'Make Election Day a national holiday', scope: 'community' });
  const text = letterFor(r, { label: 'CA-12', rep: simon });
  assert.match(text, /\[support \/ oppose\]/);
  assert.match(text, /\[Your name\]/);
});

test('without a known representative, the greeting is a placeholder', () => {
  const r = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });
  assert.match(letterFor(r, null), /^Dear Representative \[name\],/);
});

test('estimates are not cited as polls', () => {
  const r = simulate({ decision: 'Turn the downtown parking lot into a park', scope: 'community' });
  const text = letterFor(r, null);
  assert.doesNotMatch(text, /of those surveyed/);
});

test('federal questions go to Congress; local ones go to the city or county', () => {
  const federal = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });
  const local = simulate({ decision: 'Turn the downtown parking lot into a park', scope: 'community' });
  assert.equal(whoDecides(federal).level, 'federal');
  assert.equal(whoDecides(local).level, 'local');
  assert.match(letterFor(local, null), /^Dear Council Members,/);
});

test('personal and business decisions get a conversation starter, not a formal letter', () => {
  const r = simulate({ decision: 'Take a gap year before college', scope: 'personal' });
  const text = letterFor(r, null);
  assert.match(text, /^Hi \[name\],/);
  assert.match(text, /honest take/);
  assert.match(text, /“Take a gap year before college\.”/);
  assert.doesNotMatch(text, /Sincerely/);
});

test('letters about federal questions name the related bill, so offices can file them', () => {
  const r = simulate({ decision: 'Ban members of Congress from trading individual stocks', scope: 'community' });
  assert.match(letterFor(r, null), /H\.R\. 7008, the Stop Insider Trading Act/);
  const local = simulate({ decision: 'Turn the downtown parking lot into a park', scope: 'community' });
  assert.doesNotMatch(letterFor(local, null), /Related legislation/);
});

import { decisionBodies } from './civics';

test('the minimum wage is set by Congress, states and some cities', () => {
  const r = simulate({ decision: 'Raise the minimum wage to $15 an hour', scope: 'community' });
  assert.deepEqual(decisionBodies(r).map((b) => b.level), ['federal', 'state', 'local']);
});

test('voting rules involve Congress and state legislatures', () => {
  const r = simulate({ decision: 'Require a government-issued photo ID to vote', scope: 'community' });
  assert.deepEqual(decisionBodies(r).map((b) => b.level), ['federal', 'state']);
});

test('a park is a local decision only', () => {
  const r = simulate({ decision: 'Turn the downtown parking lot into a park', scope: 'community' });
  assert.deepEqual(decisionBodies(r).map((b) => b.level), ['local']);
});

test('school phone rules: the school first, then the state', () => {
  const r = simulate({ decision: 'Ban phones during class', scope: 'school' });
  assert.deepEqual(decisionBodies(r).map((b) => b.level), ['school', 'state']);
});

test('state bodies link to that state on Open States when the state is known', () => {
  const r = simulate({ decision: 'Require a government-issued photo ID to vote', scope: 'community' });
  const state = decisionBodies(r, 'MI').find((b) => b.level === 'state')!;
  assert.ok(state.links.some((l) => l.url === 'https://openstates.org/mi/'));
  assert.ok(state.links.some((l) => l.url === 'https://openstates.org/find_your_legislator/'));
});

test('letters can be addressed to a state legislator instead of Congress', () => {
  const r = simulate({ decision: 'Require a government-issued photo ID to vote', scope: 'community' });
  const text = letterFor(r, null, 'state');
  assert.match(text, /^Dear \[State Senator or Representative name\],/);
  assert.doesNotMatch(text, /Related legislation: H\.R\./);
});
