// Color tokens shared by canvas drawing code. Keep in sync with :root in styles.css.
export const C = {
  ink: '#0B1020',
  surface: '#0E1428',
  raised: '#141B33',
  line: '#232C4A',
  paper: '#EEF0F7',
  mist: '#A3ABC4',
  fog: '#6B7390',
  foam: '#A6F0DA',
  support: '#5B8DEF',
  oppose: '#D0703A',
  neutral: '#6B7390',
};

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const SUP = hexToRgb(C.support);
const OPP = hexToRgb(C.oppose);
const NEU = hexToRgb(C.neutral);

/** Opinion (-1 … 1) → rgb, through the neutral midpoint. */
export function opinionRgb(o: number): [number, number, number] {
  const t = Math.min(1, Math.abs(o) / 0.6);
  const end = o >= 0 ? SUP : OPP;
  return [NEU[0] + (end[0] - NEU[0]) * t, NEU[1] + (end[1] - NEU[1]) * t, NEU[2] + (end[2] - NEU[2]) * t];
}

export const personaColor = (hue: number, l = 72, c = 0.09) => `oklch(${l}% ${c} ${hue})`;
