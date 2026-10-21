import { test } from 'node:test';
import assert from 'node:assert/strict';
import { districtMix, findDistricts, describeDistrict, type DistrictData, type ZipData } from './districts';
import { simulate } from './engine';
import districts from '../client/src/data/districts.json';
import zips from '../client/src/data/zips.json';

const data = districts as unknown as DistrictData;
const zipData = zips as unknown as ZipData;

test('every district gets a full, positive room mix', () => {
  for (const [code, d] of Object.entries(data.districts)) {
    const mix = districtMix(d, data.national);
    assert.equal(Object.keys(mix).length, 8, code);
    for (const v of Object.values(mix)) assert.ok(v > 0 && v <= 4, `${code}: ${v}`);
  }
});

test('a retirement-heavy district fills the room with retirees', () => {
  const mix = districtMix(data.districts['1219'], data.national); // FL-19
  assert.ok(mix.harold > 1.5, `retirees ×${mix.harold}`);
});

test('a dense city district has more young professionals and commuters', () => {
  const mix = districtMix(data.districts['3612'], data.national); // NY-12
  assert.ok(mix.kevin > 1.4, `young professionals ×${mix.kevin}`);
});

test('ZIP codes resolve to their district, with any split districts listed', () => {
  assert.deepEqual(findDistricts(zipData, '10001'), ['3612']);
  assert.equal(findDistricts(zipData, '90210')[0], '0632');
  assert.ok(findDistricts(zipData, '90210').length >= 2);
  assert.deepEqual(findDistricts(zipData, '20500'), []);
  assert.deepEqual(findDistricts(zipData, 'abcde'), []);
});

test('the same decision lands differently in different districts', () => {
  const d = 'Raise property taxes to fund new school buildings';
  const retirees = simulate({ decision: d, mix: districtMix(data.districts['1219'], data.national) }).summary.support;
  const young = simulate({ decision: d, mix: districtMix(data.districts['4835'], data.national) }).summary.support;
  assert.ok(young - retirees >= 4, `TX-35 ${young}% vs FL-19 ${retirees}%`);
});

test('district descriptions compare against the nation in plain words', () => {
  const lines = describeDistrict(data.districts['1219'], data.national);
  assert.ok(lines.some((l) => /65 and older/.test(l.label)));
  const older = lines.find((l) => /65 and older/.test(l.label))!;
  assert.ok(older.value > older.national);
});
