import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, simulate } from './engine';
import { LOCAL_CATEGORIES, LOCAL_DECISIONS, localByCategory } from './local';

test('there is a short local set covering parks, schools, taxes, housing, streets and energy', () => {
  assert.ok(LOCAL_DECISIONS.length >= 12 && LOCAL_DECISIONS.length <= 20, `${LOCAL_DECISIONS.length} decisions`);
  for (const c of LOCAL_CATEGORIES) assert.ok(localByCategory(c.id).length >= 2, `${c.id} has fewer than 2 decisions`);
});

test('local decision ids are unique', () => {
  assert.equal(new Set(LOCAL_DECISIONS.map((d) => d.id)).size, LOCAL_DECISIONS.length);
});

test('the park, bond vote and school start time are all in the set', () => {
  for (const topic of ['parking-to-park', 'local-tax', 'later-start']) assert.ok(LOCAL_DECISIONS.some((d) => d.topic === topic), `no ${topic}`);
});

test('each local decision is read as the topic it is about', () => {
  for (const d of LOCAL_DECISIONS) {
    const a = analyze(d.decision, d.scope);
    assert.equal(a.anchor?.id, d.topic, `"${d.decision}" matched ${a.anchor?.id ?? 'nothing'}`);
  }
});

test('most local decisions start from a published poll, and the rest say they are estimates', () => {
  const polls = LOCAL_DECISIONS.filter((d) => analyze(d.decision, d.scope).anchor?.basis === 'poll');
  assert.ok(polls.length >= 8, `only ${polls.length} start from a poll`);
  for (const d of LOCAL_DECISIONS) {
    const r = simulate({ decision: d.decision, scope: d.scope }, { withRecommendations: false });
    assert.ok(r.reality, `${d.id} has no reality check`);
    if (r.reality!.anchor.basis === 'poll') assert.ok(r.reality!.anchor.source?.url.startsWith('https://'), `${d.id} poll has no source`);
    else assert.equal(r.reality!.anchor.basis, 'estimate', `${d.id} fell back to the generic model`);
  }
});

test('local decisions are things a town or school board decides', () => {
  for (const d of LOCAL_DECISIONS) {
    assert.ok(['community', 'school'].includes(d.scope), `${d.id} scope ${d.scope}`);
    assert.ok(d.who.length > 0 && d.title.length > 0 && d.title.length <= 40, `${d.id} needs a short title`);
  }
});
