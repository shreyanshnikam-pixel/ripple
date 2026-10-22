import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyStatus, govinfoUrl, parseBillStatus } from './billStatus';
import { BILLS } from './bills';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (n: string) => parseBillStatus(fs.readFileSync(path.join(dir, `BILLSTATUS-119${n}.xml`), 'utf8'));

test('a bill that passed the House only', () => {
  const s = read('hr7008');
  assert.equal(s.stage, 'passed-one');
  assert.equal(s.latest.date, '2026-09-30');
  assert.match(s.latest.text, /Cloture/);
  assert.equal(s.passed.house, '2026-07-22');
  assert.equal(s.passed.senate, null);
});

test('a bill that became law', () => {
  const s = read('s146');
  assert.equal(s.stage, 'law');
  assert.equal(s.law, '119-12');
});

test('a bill that was only introduced', () => {
  const s = read('sjres218');
  assert.equal(s.stage, 'introduced');
  assert.equal(s.latest.date, '2026-09-29');
});

test('govinfo URLs follow the bill number', () => {
  assert.equal(govinfoUrl('H.R. 7008', 119), 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr7008.xml');
  assert.equal(govinfoUrl('S.J.Res. 218', 119), 'https://www.govinfo.gov/bulkdata/BILLSTATUS/119/sjres/BILLSTATUS-119sjres218.xml');
});

test('newer official actions replace the hand-checked status; older ones leave it alone', () => {
  const b = { ...BILLS.find((x) => x.number === 'H.R. 7008')!, stage: 'passed-one' as const, checked: '2026-10-21', status: 'Hand-checked.' };
  const same = applyStatus(b, { ...read('hr7008') });
  assert.equal(same.status, b.status, 'nothing newer than the hand check, so the written status stays');
  const newer = applyStatus(b, { ...read('hr7008'), stage: 'law', law: '119-99', latest: { date: '2026-11-15', text: 'Became Public Law No: 119-99.' } });
  assert.equal(newer.stage, 'law');
  assert.match(newer.status, /Public Law 119-99/);
  assert.equal(newer.checked, '2026-11-15');
});

test('a stage never moves backwards because of a parsing gap', () => {
  const b = { ...BILLS.find((x) => x.number === 'H.R. 7008')!, stage: 'passed-one' as const, checked: '2026-10-21', status: 'Hand-checked.' };
  const odd = applyStatus(b, { ...read('hr7008'), stage: 'introduced', latest: { date: '2026-12-01', text: 'Some procedural step.' } });
  assert.equal(odd.stage, 'passed-one');
});

test('vehicle bills keep their hand-checked stage unless they become law', () => {
  const b = { ...BILLS.find((x) => x.number === 'S. 1383')!, checked: '2026-10-21' };
  assert.equal(applyStatus(b, { ...read('hr7008'), stage: 'passed-both', latest: { date: '2026-11-02', text: 'Message on Senate action sent to the House.' } }).stage, 'passed-one');
});
