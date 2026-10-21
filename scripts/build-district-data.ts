/**
 * Builds the "Your district" data from public sources (no API key needed):
 *
 *   data/raw/acsdt1y2024-*.dat   U.S. Census Bureau, 2024 American Community Survey 1-year,
 *                                table-based summary files (119th Congress districts).
 *                                https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/
 *   data/raw/tab20_cd11920_zcta520_natl.txt
 *                                Census 2020 ZCTA (ZIP code area) ↔ 119th Congress district relationship file.
 *                                https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/
 *   data/raw/legislators-current.json
 *                                unitedstates/congress-legislators (public domain).
 *                                https://unitedstates.github.io/congress-legislators/legislators-current.json
 *
 * Run:  npx tsx scripts/build-district-data.ts
 * Out:  client/src/data/districts.json, client/src/data/zips.json
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.resolve('data/raw');
const OUT = path.resolve('client/src/data');
fs.mkdirSync(OUT, { recursive: true });

const STATES: Record<string, [string, string]> = {
  '01': ['AL', 'Alabama'], '02': ['AK', 'Alaska'], '04': ['AZ', 'Arizona'], '05': ['AR', 'Arkansas'], '06': ['CA', 'California'],
  '08': ['CO', 'Colorado'], '09': ['CT', 'Connecticut'], '10': ['DE', 'Delaware'], '11': ['DC', 'District of Columbia'],
  '12': ['FL', 'Florida'], '13': ['GA', 'Georgia'], '15': ['HI', 'Hawaii'], '16': ['ID', 'Idaho'], '17': ['IL', 'Illinois'],
  '18': ['IN', 'Indiana'], '19': ['IA', 'Iowa'], '20': ['KS', 'Kansas'], '21': ['KY', 'Kentucky'], '22': ['LA', 'Louisiana'],
  '23': ['ME', 'Maine'], '24': ['MD', 'Maryland'], '25': ['MA', 'Massachusetts'], '26': ['MI', 'Michigan'], '27': ['MN', 'Minnesota'],
  '28': ['MS', 'Mississippi'], '29': ['MO', 'Missouri'], '30': ['MT', 'Montana'], '31': ['NE', 'Nebraska'], '32': ['NV', 'Nevada'],
  '33': ['NH', 'New Hampshire'], '34': ['NJ', 'New Jersey'], '35': ['NM', 'New Mexico'], '36': ['NY', 'New York'],
  '37': ['NC', 'North Carolina'], '38': ['ND', 'North Dakota'], '39': ['OH', 'Ohio'], '40': ['OK', 'Oklahoma'], '41': ['OR', 'Oregon'],
  '42': ['PA', 'Pennsylvania'], '44': ['RI', 'Rhode Island'], '45': ['SC', 'South Carolina'], '46': ['SD', 'South Dakota'],
  '47': ['TN', 'Tennessee'], '48': ['TX', 'Texas'], '49': ['UT', 'Utah'], '50': ['VT', 'Vermont'], '51': ['VA', 'Virginia'],
  '53': ['WA', 'Washington'], '54': ['WV', 'West Virginia'], '55': ['WI', 'Wisconsin'], '56': ['WY', 'Wyoming'], '72': ['PR', 'Puerto Rico'],
};

/** Reads one table-based summary file into { GEO_ID → { column → number } } for the rows we need. */
function readTable(name: string, keep: (geo: string) => boolean) {
  const text = fs.readFileSync(path.join(RAW, `acsdt1y2024-${name}.dat`), 'utf8');
  const [header, ...lines] = text.split(/\r?\n/);
  const cols = header.split('|');
  const out = new Map<string, Record<string, number>>();
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split('|');
    if (!keep(cells[0])) continue;
    const row: Record<string, number> = {};
    cols.forEach((c, i) => {
      if (i > 0 && c.includes('_E')) row[c] = Number(cells[i]);
    });
    out.set(cells[0], row);
  }
  return out;
}

const isWanted = (geo: string) => geo === '0100000US' || geo.startsWith('5001900US');
const b01001 = readTable('b01001', isWanted);
const b14001 = readTable('b14001', isWanted);
const b19013 = readTable('b19013', isWanted);
const b25003 = readTable('b25003', isWanted);
const b08301 = readTable('b08301', isWanted);
const c24050 = readTable('c24050', isWanted);
const b24080 = readTable('b24080', isWanted);
const b15003 = readTable('b15003', isWanted);

const sum = (row: Record<string, number>, table: string, nums: number[]) => nums.reduce((t, n) => t + (row[`${table}_E${String(n).padStart(3, '0')}`] ?? 0), 0);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

type Facts = ReturnType<typeof factsOf>;

/** Shares for one geography. A table missing a row falls back to the national figure (and is listed in `estimated`). */
function factsOf(geo: string, fallback?: Record<string, number>) {
  const estimated: string[] = [];
  const pick = (key: string, table: Map<string, Record<string, number>>, f: (row: Record<string, number>) => number) => {
    const row = table.get(geo);
    if (row) return f(row);
    estimated.push(key);
    return fallback?.[key] ?? 0;
  };
  const age = b01001.get(geo)!;
  const pop = sum(age, 'B01001', [1]);
  const under18 = sum(age, 'B01001', [...range(3, 6), ...range(27, 30)]) / pop;
  const age18to24 = sum(age, 'B01001', [...range(7, 10), ...range(31, 34)]) / pop;
  const age25to34 = sum(age, 'B01001', [11, 12, 35, 36]) / pop;
  const age65 = sum(age, 'B01001', [...range(20, 25), ...range(44, 49)]) / pop;
  const college = pick('college', b14001, (r) => sum(r, 'B14001', [8, 9]) / pop);
  const renter = pick('renter', b25003, (r) => sum(r, 'B25003', [3]) / sum(r, 'B25003', [1]));
  const transit = pick('transit', b08301, (r) => sum(r, 'B08301', [10]) / sum(r, 'B08301', [1]));
  const remote = pick('remote', b08301, (r) => sum(r, 'B08301', [21]) / sum(r, 'B08301', [1]));
  const eduHealth = pick('eduHealth', c24050, (r) => sum(r, 'C24050', [11]) / sum(r, 'C24050', [1]));
  const selfEmployed = pick('selfEmployed', b24080, (r) => sum(r, 'B24080', [5, 10, 15, 20]) / sum(r, 'B24080', [1]));
  const bachelor = pick('bachelor', b15003, (r) => sum(r, 'B15003', [22, 23, 24, 25]) / sum(r, 'B15003', [1]));
  const income = pick('income', b19013, (r) => sum(r, 'B19013', [1]));
  return {
    pop,
    income,
    under18: r3(under18),
    age18to24: r3(age18to24),
    age25to34: r3(age25to34),
    age65: r3(age65),
    college: r3(college),
    renter: r3(renter),
    transit: r3(transit),
    remote: r3(remote),
    eduHealth: r3(eduHealth),
    selfEmployed: r3(selfEmployed),
    bachelor: r3(bachelor),
    ...(estimated.length ? { estimated } : {}),
  };
}

const national = factsOf('0100000US');
const facts = (geo: string): Facts => factsOf(geo, national as unknown as Record<string, number>);

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Current House members and delegates, by state + district.
type Leg = { name: { official_full?: string; first: string; last: string }; terms: { type: string; state: string; district?: number; party?: string; url?: string; phone?: string }[] };
const legislators = JSON.parse(fs.readFileSync(path.join(RAW, 'legislators-current.json'), 'utf8')) as Leg[];
type Member = { name: string; last: string; party: string; url?: string; phone?: string };
const reps = new Map<string, Member>();
const senators: Record<string, Member[]> = {};
for (const l of legislators) {
  const t = l.terms[l.terms.length - 1];
  const member: Member = { name: l.name.official_full ?? `${l.name.first} ${l.name.last}`, last: l.name.last, party: t.party ?? '', url: t.url, phone: t.phone };
  if (t.type === 'rep') reps.set(`${t.state}-${t.district ?? 0}`, member);
  else if (t.type === 'sen') (senators[t.state] ??= []).push(member);
}

const districts: Record<string, unknown> = {};
let missingRep = 0;
for (const geo of b01001.keys()) {
  if (!geo.startsWith('5001900US')) continue;
  const code = geo.slice(9); // SSDD
  const [st, stateName] = STATES[code.slice(0, 2)] ?? ['??', 'Unknown'];
  const n = Number(code.slice(2));
  const atLarge = n === 0 || n === 98;
  const label = atLarge ? `${st}-AL` : `${st}-${n}`;
  const name = st === 'DC' ? 'District of Columbia (delegate)' : st === 'PR' ? 'Puerto Rico (resident commissioner)' : atLarge ? `${stateName} at-large district` : `${stateName}’s ${ordinal(n)} district`;
  const rep = reps.get(`${st}-${atLarge ? 0 : n}`);
  if (!rep) missingRep++;
  districts[code] = { label, name, state: stateName, st, ...facts(geo), rep: rep ?? null };
}

// ZIP code areas → district(s), weighted by land area inside each district.
const relText = fs.readFileSync(path.join(RAW, 'tab20_cd11920_zcta520_natl.txt'), 'utf8').replace(/^﻿/, '');
const [relHeader, ...relLines] = relText.split(/\r?\n/);
const rc = relHeader.split('|');
const iCd = rc.indexOf('GEOID_CD119_20');
const iZ = rc.indexOf('GEOID_ZCTA5_20');
const iZLand = rc.indexOf('AREALAND_ZCTA5_20');
const iPart = rc.indexOf('AREALAND_PART');
const zipParts = new Map<string, { cd: string; share: number }[]>();
for (const line of relLines) {
  if (!line) continue;
  const c = line.split('|');
  const zip = c[iZ];
  const cd = c[iCd];
  if (!zip || !cd || !districts[cd]) continue;
  const share = Number(c[iPart]) / Math.max(1, Number(c[iZLand]));
  if (!zipParts.has(zip)) zipParts.set(zip, []);
  zipParts.get(zip)!.push({ cd, share });
}
const byDistrict: Record<string, string[]> = {};
const alsoIn: Record<string, string> = {};
for (const [zip, parts] of zipParts) {
  parts.sort((a, b) => b.share - a.share);
  (byDistrict[parts[0].cd] ??= []).push(zip);
  const others = parts.slice(1).filter((p) => p.share >= 0.1).map((p) => p.cd);
  if (others.length) alsoIn[zip] = others.join(' ');
}
const zips = {
  source: 'U.S. Census Bureau, 2020 ZCTA to 119th Congressional District relationship file',
  byDistrict: Object.fromEntries(Object.entries(byDistrict).map(([cd, list]) => [cd, list.sort().join(' ')])),
  alsoIn,
};

const meta = {
  sources: {
    demographics: 'U.S. Census Bureau, American Community Survey 2024 1-year estimates (119th Congress districts)',
    members: `unitedstates/congress-legislators, retrieved ${new Date().toISOString().slice(0, 10)}`,
  },
  national,
  districts,
  senators,
};
fs.writeFileSync(path.join(OUT, 'districts.json'), JSON.stringify(meta));
fs.writeFileSync(path.join(OUT, 'zips.json'), JSON.stringify(zips));
console.log(
  `districts: ${Object.keys(districts).length} (no current member: ${missingRep}), zips: ${zipParts.size}, split zips: ${Object.keys(alsoIn).length}`,
);
console.log(`sizes: districts.json ${(fs.statSync(path.join(OUT, 'districts.json')).size / 1024).toFixed(0)} KB, zips.json ${(fs.statSync(path.join(OUT, 'zips.json')).size / 1024).toFixed(0)} KB`);
console.log('national:', national);
