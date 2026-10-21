import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BILL_STAGES, BILLS, billsForTopic, congressUrl } from './bills';
import { analyze } from './engine';

test('there are real bills to show', () => {
  assert.ok(BILLS.length >= 10, `only ${BILLS.length} bills`);
});

test('bill ids are unique', () => {
  assert.equal(new Set(BILLS.map((b) => b.id)).size, BILLS.length);
});

test('each bill links to its own page on Congress.gov', () => {
  for (const b of BILLS) assert.equal(b.url, congressUrl(b.number, b.congress), `${b.number} (${b.congress}th) has url ${b.url}`);
});

test('congressUrl understands every kind of bill number', () => {
  assert.equal(congressUrl('H.R. 139', 119), 'https://www.congress.gov/bill/119th-congress/house-bill/139');
  assert.equal(congressUrl('S. 29', 119), 'https://www.congress.gov/bill/119th-congress/senate-bill/29');
  assert.equal(congressUrl('H.J.Res. 12', 119), 'https://www.congress.gov/bill/119th-congress/house-joint-resolution/12');
  assert.equal(congressUrl('S.J.Res. 1', 119), 'https://www.congress.gov/bill/119th-congress/senate-joint-resolution/1');
  assert.equal(congressUrl('H.R. 5376', 117), 'https://www.congress.gov/bill/117th-congress/house-bill/5376');
  assert.equal(congressUrl('H.R. 815', 118), 'https://www.congress.gov/bill/118th-congress/house-bill/815');
});

test('each bill is simulated as the policy it is about', () => {
  for (const b of BILLS) {
    const a = analyze(b.decision, b.scope);
    assert.equal(a.anchor?.id, b.topic, `${b.number}: "${b.decision}" matched ${a.anchor?.id ?? 'nothing'}`);
  }
});

test('stages and dates are well-formed', () => {
  for (const b of BILLS) {
    assert.ok(BILL_STAGES.some((s) => s.id === b.stage), `${b.number} stage ${b.stage}`);
    assert.match(b.introduced, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(b.introduced <= b.checked, `${b.number} introduced after it was checked`);
    if (b.stage === 'law') assert.match(b.status, /Public Law/, `${b.number} is law but its status doesn't name the Public Law`);
    assert.ok(b.sources.length >= 1, `${b.number} has no sources`);
  }
});

test('bills can be found by topic', () => {
  const t = BILLS[0].topic;
  assert.ok(billsForTopic(t).every((b) => b.topic === t));
  assert.deepEqual(billsForTopic('no-such-topic'), []);
});
