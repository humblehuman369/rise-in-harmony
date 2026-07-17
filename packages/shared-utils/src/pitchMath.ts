/**
 * Pitch-ratio math for TrueHz Convert (offline retune).
 * Pure functions — no platform APIs.
 */

export type PitchRetune = {
  sourcePitchA: number;
  targetPitchA: number;
  ratio: number;
  cents: number;
};

/** Pitch ratio targetA / sourceA. */
export function pitchRatio(sourcePitchA: number, targetPitchA: number): number {
  if (!(sourcePitchA > 0) || !(targetPitchA > 0)) {
    throw new RangeError("sourcePitchA and targetPitchA must be > 0");
  }
  return targetPitchA / sourcePitchA;
}

/** Cents offset for a frequency ratio: 1200 · log2(ratio). */
export function ratioToCents(ratio: number): number {
  if (!(ratio > 0)) {
    throw new RangeError("ratio must be > 0");
  }
  return 1200 * Math.log2(ratio);
}

export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

/** Full retune descriptor for a concert-pitch change (e.g. A=440 → A=432). */
export function describeRetune(
  sourcePitchA: number,
  targetPitchA: number,
): PitchRetune {
  const ratio = pitchRatio(sourcePitchA, targetPitchA);
  return {
    sourcePitchA,
    targetPitchA,
    ratio,
    cents: ratioToCents(ratio),
  };
}

/** Clamp concert pitch A to a sane musical range. */
export function clampConcertA(hz: number): number {
  const n = Number(hz);
  if (!Number.isFinite(n)) return 440;
  return Math.min(480, Math.max(400, Math.round(n * 100) / 100));
}

/** Human-readable cents label, e.g. "−31.77 ¢". */
export function formatCents(cents: number, digits = 2): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${Math.abs(cents).toFixed(digits)} ¢`;
}

/** Expected pure-tone peak after ratio retune (sourceToneHz × ratio). */
export function expectedPeakHz(sourceToneHz: number, ratio: number): number {
  return sourceToneHz * ratio;
}
