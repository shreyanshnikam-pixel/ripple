/**
 * Calibration from real surveys. People who answer a shared link aren't a random sample,
 * so this is deliberately cautious: a topic needs several decent-sized surveys, the correction
 * is shrunk toward zero, capped, and always shown as a labeled adjustment.
 */
export interface CalibrationRecord {
  /** The topic (anchor id) the surveyed decision matched. */
  anchor: string;
  /** Ripple's predicted support (%) when the survey was made. */
  predicted: number;
  /** Real support (%) among survey answers. */
  actual: number;
  /** Number of answers. */
  n: number;
}

export interface CalibrationEntry {
  points: number;
  surveys: number;
  answers: number;
}

export const MIN_ANSWERS = 30;
export const MIN_SURVEYS = 3;
export const CAP = 5;
/** Answers' worth of trust in the original starting point. */
const PRIOR = 600;

export function calibrationTable(records: CalibrationRecord[]): Record<string, CalibrationEntry> {
  const by = new Map<string, CalibrationRecord[]>();
  for (const r of records) if (r.n >= MIN_ANSWERS && r.anchor) by.set(r.anchor, [...(by.get(r.anchor) ?? []), r]);
  const out: Record<string, CalibrationEntry> = {};
  for (const [anchor, rs] of by) {
    if (rs.length < MIN_SURVEYS) continue;
    const answers = rs.reduce((t, r) => t + r.n, 0);
    const gap = rs.reduce((t, r) => t + (r.actual - r.predicted) * r.n, 0) / answers;
    const points = Math.round(Math.max(-CAP, Math.min(CAP, gap * (answers / (answers + PRIOR)))));
    if (points !== 0) out[anchor] = { points, surveys: rs.length, answers };
  }
  return out;
}

/** How close predictions have been, for surveys large enough to say anything. */
export function trackRecord(records: CalibrationRecord[]) {
  const ok = records.filter((r) => r.n >= MIN_ANSWERS);
  const gaps = ok.map((r) => Math.abs(r.actual - r.predicted));
  const within = ok.filter((r) => Math.abs(r.actual - r.predicted) <= 1.96 * Math.sqrt(0.25 / r.n) * 100).length;
  return {
    surveys: ok.length,
    answers: ok.reduce((t, r) => t + r.n, 0),
    meanAbsError: ok.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10 : null,
    withinMargin: ok.length ? Math.round((within / ok.length) * 100) / 100 : null,
  };
}
