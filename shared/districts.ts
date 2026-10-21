/**
 * "Your district": turns U.S. Census demographics for a congressional district into
 * who's in the room for a community decision. Data is built by scripts/build-district-data.ts.
 */

export interface DistrictFacts {
  pop: number;
  income: number;
  under18: number;
  age18to24: number;
  age25to34: number;
  age65: number;
  college: number;
  renter: number;
  transit: number;
  remote: number;
  eduHealth: number;
  selfEmployed: number;
  bachelor: number;
  /** Measures the Census didn't publish for this district (national figure used instead). */
  estimated?: string[];
}

export interface Member {
  name: string;
  last: string;
  party: string;
  url?: string;
  phone?: string;
}

export interface District extends DistrictFacts {
  label: string;
  name: string;
  state: string;
  /** Two-letter state or territory code. */
  st: string;
  /** The current House member (null while a seat is vacant). */
  rep: Member | null;
}

export interface DistrictData {
  sources: { demographics: string; members: string };
  national: DistrictFacts;
  districts: Record<string, District>;
  /** Current senators by two-letter state code (none for DC and territories). */
  senators: Record<string, Member[]>;
}

export interface ZipData {
  source: string;
  /** district code → space-separated ZIP codes mostly inside it */
  byDistrict: Record<string, string>;
  /** ZIP → other districts that hold at least 10% of its land */
  alsoIn: Record<string, string>;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const ratio = (a: number, b: number) => (b > 0 ? a / b : 1);
/** Exaggerate differences a little (so a district clearly feels different), within sensible bounds. */
const shape = (r: number, k = 1.35) => Math.round(clamp(Math.pow(Math.max(r, 0.01), k), 0.35, 3.5) * 100) / 100;

/**
 * Community voices ↔ Census measures:
 *  harold  Retirees                    share aged 65+
 *  priya   Students & teens            under 18, plus college students
 *  maria   Working parents             share under 18 (households with kids)
 *  darnell Small business owners       self-employed workers
 *  lena    Healthcare workers          education, health care & social assistance jobs
 *  sam     Activists & advocates       young adults × college degrees
 *  kevin   Young professionals         ages 25–34, transit riders and remote workers
 *  rosa    Fiscal watchdogs            homeowners (property-tax payers)
 */
export function districtMix(f: DistrictFacts, nat: DistrictFacts): Record<string, number> {
  return {
    harold: shape(ratio(f.age65, nat.age65), 1.5),
    priya: shape(ratio(f.under18 + 0.6 * f.college, nat.under18 + 0.6 * nat.college)),
    maria: shape(ratio(f.under18, nat.under18)),
    darnell: shape(ratio(f.selfEmployed, nat.selfEmployed)),
    lena: shape(ratio(f.eduHealth, nat.eduHealth)),
    sam: shape(Math.sqrt(ratio(f.bachelor, nat.bachelor) * ratio(f.age18to24 + f.age25to34, nat.age18to24 + nat.age25to34))),
    kevin: shape(0.6 * ratio(f.age25to34, nat.age25to34) + 0.4 * ratio(f.transit + f.remote, nat.transit + nat.remote), 1.6),
    rosa: shape(ratio(1 - f.renter, 1 - nat.renter), 1.6),
  };
}

/** District codes (SSDD) for a ZIP code, primary first. Empty when the ZIP isn't a residential area. */
export function findDistricts(zips: ZipData, zip: string): string[] {
  const z = zip.trim();
  if (!/^\d{5}$/.test(z)) return [];
  let primary: string | undefined;
  for (const [cd, list] of Object.entries(zips.byDistrict)) {
    // Each list is sorted and space-separated, so a substring check with spaces is exact.
    if ((' ' + list + ' ').includes(' ' + z + ' ')) {
      primary = cd;
      break;
    }
  }
  if (!primary) return [];
  return [primary, ...(zips.alsoIn[z]?.split(' ') ?? [])];
}

export interface FactLine {
  label: string;
  value: number;
  national: number;
  /** How to show it: a share (0–1) or dollars. */
  kind: 'share' | 'dollars';
}

/** The facts worth showing, each compared with the nation. */
export function describeDistrict(f: DistrictFacts, nat: DistrictFacts): FactLine[] {
  return [
    { label: 'Residents 65 and older', value: f.age65, national: nat.age65, kind: 'share' },
    { label: 'Residents under 18', value: f.under18, national: nat.under18, kind: 'share' },
    { label: 'Enrolled in college', value: f.college, national: nat.college, kind: 'share' },
    { label: 'Households that rent', value: f.renter, national: nat.renter, kind: 'share' },
    { label: 'Workers who take transit', value: f.transit, national: nat.transit, kind: 'share' },
    { label: 'Workers who are self-employed', value: f.selfEmployed, national: nat.selfEmployed, kind: 'share' },
    { label: 'Adults with a bachelor’s degree', value: f.bachelor, national: nat.bachelor, kind: 'share' },
    { label: 'Median household income', value: f.income, national: nat.income, kind: 'dollars' },
  ];
}

/** A district in a few plain lines, for the AI report. */
export function districtSummary(d: District, nat: DistrictFacts): { label: string; name: string; representative?: string; facts: string[] } {
  const fmt = (l: FactLine, v: number) => (l.kind === 'dollars' ? `$${Math.round(v).toLocaleString('en-US')}` : `${Math.round(v * 1000) / 10}%`);
  return {
    label: d.label,
    name: d.name,
    representative: d.rep ? `${d.rep.name} (${d.rep.party})` : undefined,
    facts: describeDistrict(d, nat).map((l) => `${l.label}: ${fmt(l, l.value)} (national ${fmt(l, l.national)})`),
  };
}
