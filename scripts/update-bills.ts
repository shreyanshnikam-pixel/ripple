/**
 * Refreshes every bill's progress from Congress.gov's official bill-status records
 * (published by GovInfo; no API key needed) and writes shared/bill-status.json.
 *
 *   npx tsx scripts/update-bills.ts
 *
 * The weekly GitHub Action (.github/workflows/update-bills.yml) runs this and commits any changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { govinfoUrl, parseBillStatus, type ParsedStatus } from '../shared/billStatus';
import { HAND_CHECKED_BILLS } from '../shared/bills';

const OUT = path.resolve('shared/bill-status.json');
const previous = JSON.parse(fs.readFileSync(OUT, 'utf8')) as { updated: string | null; bills: Record<string, ParsedStatus> };
const bills: Record<string, ParsedStatus> = { ...previous.bills };
let changed = 0;
let failed = 0;

for (const b of HAND_CHECKED_BILLS) {
  const url = govinfoUrl(b.number, b.congress);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Ripple civic app (bill status updater)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const s = parseBillStatus(await res.text());
    const before = bills[b.id];
    if (!before || before.latest.date !== s.latest.date || before.stage !== s.stage) {
      changed++;
      console.log(`${b.number}: ${s.stage}, latest ${s.latest.date}: ${s.latest.text.slice(0, 90)}`);
    }
    bills[b.id] = s;
  } catch (err) {
    failed++;
    console.warn(`${b.number}: could not update (${(err as Error).message}); keeping what we had.`);
  }
  await new Promise((r) => setTimeout(r, 300)); // be polite to GovInfo
}

fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), bills }, null, 2) + '\n');
console.log(`Checked ${HAND_CHECKED_BILLS.length} bills: ${changed} changed, ${failed} failed.`);
if (failed === HAND_CHECKED_BILLS.length) process.exit(1);
