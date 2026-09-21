import type { RateTier } from "../types";

const BORTLE_FACTORS: Record<number, number> = {
  1: 1,
  2: 0.9,
  3: 0.72,
  4: 0.5,
  5: 0.3,
  6: 0.18,
  7: 0.1,
  8: 0.045,
  9: 0.02
};

export function bortleFactor(bortle: number): number {
  const clamped = Math.max(1, Math.min(9, Math.round(bortle)));
  return BORTLE_FACTORS[clamped] ?? 0.05;
}

/** 0..100 cloud cover -> 1 (clear) .. 0.1 (fully overcast) */
export function cloudFactor(cloudPct: number): number {
  const c = Math.max(0, Math.min(100, cloudPct));
  return 1 - 0.9 * (c / 100);
}

/**
 * Expected visible meteors per hour.
 * rate = ZHR * sin(radiant altitude) * cloud factor * light-pollution factor.
 */
export function rateAt(altDeg: number, zhr: number, cloudPct: number, bortle: number): number {
  if (altDeg < 5) return 0;
  const altitudeFactor = Math.sin((altDeg * Math.PI) / 180);
  return zhr * altitudeFactor * cloudFactor(cloudPct) * bortleFactor(bortle);
}

/**
 * Absolute expected meteors per hour:
 * ideal >= 30/h, good >= 10/h, hard >= 2/h, invisible below that.
 */
export function tierOf(rate: number): RateTier {
  if (rate >= 30) return "ideal";
  if (rate >= 10) return "good";
  if (rate >= 2) return "hard";
  return "invisible";
}
