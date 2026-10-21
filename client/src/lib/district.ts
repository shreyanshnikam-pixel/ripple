import { districtMix, findDistricts, type District, type DistrictData, type ZipData } from '../../../shared/districts';

let districtData: Promise<DistrictData> | null = null;
let zipData: Promise<ZipData> | null = null;

/** District profiles (about 170 KB) load only when someone opens the district tools. */
export function loadDistricts(): Promise<DistrictData> {
  districtData ??= import('../data/districts.json').then((m) => m.default as unknown as DistrictData);
  return districtData;
}

/** The ZIP lookup (about 250 KB) loads only when someone types a ZIP code. It never leaves the device. */
export function loadZips(): Promise<ZipData> {
  zipData ??= import('../data/zips.json').then((m) => m.default as unknown as ZipData);
  return zipData;
}

export interface DistrictPick {
  code: string;
  district: District;
  mix: Record<string, number>;
}

export async function districtFromCode(code: string): Promise<DistrictPick | null> {
  const data = await loadDistricts();
  const district = data.districts[code];
  return district ? { code, district, mix: districtMix(district, data.national) } : null;
}

/** "CA-12" or "0612" → the district. */
export async function districtFromLabel(label: string): Promise<DistrictPick | null> {
  const data = await loadDistricts();
  const wanted = label.trim().toUpperCase();
  const entry = Object.entries(data.districts).find(([code, d]) => d.label.toUpperCase() === wanted || code === wanted);
  return entry ? districtFromCode(entry[0]) : null;
}

export async function districtsForZip(zip: string): Promise<DistrictPick[]> {
  const codes = findDistricts(await loadZips(), zip);
  const picks = await Promise.all(codes.map(districtFromCode));
  return picks.filter((p): p is DistrictPick => !!p);
}

export async function allDistrictOptions(): Promise<{ code: string; label: string; name: string; state: string }[]> {
  const data = await loadDistricts();
  return Object.entries(data.districts)
    .map(([code, d]) => ({ code, label: d.label, name: d.name, state: d.state }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.code.localeCompare(b.code));
}

const KEY = 'ripple:district';

/** Remembers the person's district (never their ZIP code) on this device only. */
export function rememberDistrict(code: string | null) {
  try {
    if (code) localStorage.setItem(KEY, code);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage can be blocked; the district just won't be remembered */
  }
}

export function recalledDistrict(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
