import { Body, Constellation, Equator, Horizon, Illumination, MakeTime, Observer, SearchAltitude } from "astronomy-engine";
import type { ObservingWindow, Shower, ShowerVisibility, RateTier } from "../types";
import { rateAt, tierOf } from "./visibility";

const DARK_ALT = -12;
const MIN_RADIANT_ALT = 10;
const SAMPLE_MS = 15 * 60000;

export function makeObserver(lat: number, lng: number): Observer {
  return new Observer(lat, lng, 0);
}

export function radiantAltitudeAt(date: Date, lat: number, lng: number, raDeg: number, decDeg: number): number {
  const time = MakeTime(date);
  const observer = makeObserver(lat, lng);
  return Horizon(time, observer, raDeg / 15, decDeg).altitude;
}

export function sunAltitudeAt(date: Date, lat: number, lng: number): number {
  const time = MakeTime(date);
  const observer = makeObserver(lat, lng);
  const eq = Equator(Body.Sun, time, observer, false, false);
  return Horizon(time, observer, eq.ra, eq.dec).altitude;
}

export function moonAltitudeAt(date: Date, lat: number, lng: number): number {
  const time = MakeTime(date);
  const observer = makeObserver(lat, lng);
  const eq = Equator(Body.Moon, time, observer, false, false);
  return Horizon(time, observer, eq.ra, eq.dec).altitude;
}

export function moonIlluminatedFraction(date: Date): number {
  return Illumination(Body.Moon, MakeTime(date)).phase_fraction;
}

export function constellationOf(raDeg: number, decDeg: number): string {
  return Constellation(raDeg / 15, decDeg).name;
}

export interface TwilightTimes {
  sunset: Date | null;
  sunrise: Date | null;
  darkStart: Date | null;
  darkEnd: Date | null;
}

/**
 * Twilight for the local night that starts on `localDate`.
 * darkStart/darkEnd are the moments astronomical darkness (Sun < -12 deg)
 * begins in the evening and ends at dawn.
 */
export function nightTwilight(localDate: Date, lat: number, lng: number): TwilightTimes {
  const observer = makeObserver(lat, lng);
  const noon = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12);
  // Search forward from local noon so the rising crossings found belong to
  // the dawn of the next calendar day (the night that starts on `localDate`).
  const sunsetSearch = SearchAltitude(Body.Sun, observer, -1, MakeTime(noon), 1.5, -0.833);
  const sunriseSearch = SearchAltitude(Body.Sun, observer, 1, MakeTime(noon), 1.5, -0.833);
  const darkStartSearch = SearchAltitude(Body.Sun, observer, -1, MakeTime(noon), 1.5, DARK_ALT);
  const darkEndSearch = SearchAltitude(Body.Sun, observer, 1, MakeTime(noon), 1.5, DARK_ALT);
  return {
    sunset: sunsetSearch ? sunsetSearch.date : null,
    sunrise: sunriseSearch ? sunriseSearch.date : null,
    darkStart: darkStartSearch ? darkStartSearch.date : null,
    darkEnd: darkEndSearch ? darkEndSearch.date : null
  };
}

export interface NightAssessment {
  nightLabel: string;
  darkStart: string;
  darkEnd: string;
  bestTime: string;
  bestRadiantAlt: number;
  bestRate: number;
  moonIllumFraction: number;
  moonUp: boolean;
  tier: RateTier;
}

export interface NightRatePoint {
  time: Date;
  alt: number;
  rate: number;
}

export function nightRateSeries(
  shower: Shower,
  lat: number,
  lng: number,
  localDate: Date,
  bortle: number,
  cloudPct?: number
): NightRatePoint[] {
  const tw = nightTwilight(localDate, lat, lng);
  if (!tw.darkStart || !tw.darkEnd || tw.darkStart.getTime() >= tw.darkEnd.getTime()) return [];
  const points: NightRatePoint[] = [];
  for (let t = tw.darkStart.getTime(); t < tw.darkEnd.getTime(); t += SAMPLE_MS) {
    const date = new Date(t);
    const alt = radiantAltitudeAt(date, lat, lng, shower.radiant.ra, shower.radiant.dec);
    const rate = rateAt(alt, shower.zhr, cloudPct ?? 0, bortle);
    points.push({ time: date, alt, rate });
  }
  return points;
}

function toISO(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function assessNight(
  shower: Shower,
  lat: number,
  lng: number,
  localDate: Date,
  bortle: number,
  cloudPct?: number
): NightAssessment | null {
  const tw = nightTwilight(localDate, lat, lng);
  if (!tw.darkStart || !tw.darkEnd || tw.darkStart.getTime() >= tw.darkEnd.getTime()) return null;
  let best: { time: Date; alt: number; rate: number } | null = null;
  for (let t = tw.darkStart.getTime(); t < tw.darkEnd.getTime(); t += SAMPLE_MS) {
    const date = new Date(t);
    const alt = radiantAltitudeAt(date, lat, lng, shower.radiant.ra, shower.radiant.dec);
    if (alt < MIN_RADIANT_ALT) continue;
    const rate = rateAt(alt, shower.zhr, cloudPct ?? 0, bortle);
    if (!best || rate > best.rate) best = { time: date, alt, rate };
  }
  if (!best) return null;
  const moonUp = moonAltitudeAt(best.time, lat, lng) > 0;
  const moonIllumFraction = moonIlluminatedFraction(best.time);
  const ymd = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
  return {
    nightLabel: ymd,
    darkStart: toISO(tw.darkStart) ?? "",
    darkEnd: toISO(tw.darkEnd) ?? "",
    bestTime: best.time.toISOString(),
    bestRadiantAlt: Math.round(best.alt * 10) / 10,
    bestRate: Math.round(best.rate * 10) / 10,
    moonIllumFraction,
    moonUp,
    tier: tierOf(best.rate)
  };
}

function localDateFromISO(iso: string, timeZone?: string): Date {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export interface VisibilityOptions {
  bortle: number;
  cloudPct?: number;
  timeZone?: string;
}

/**
 * Evaluates the nights around the shower peak for a given observer.
 * Returns per-night assessments plus the best window and peak-time context.
 */
export function bestObservingWindow(
  shower: Shower,
  lat: number,
  lng: number,
  opts: VisibilityOptions
): ShowerVisibility {
  const peakLocalDate = localDateFromISO(shower.peakUTC, opts.timeZone);
  const windows: ObservingWindow[] = [];
  for (let offset = -1; offset <= 2; offset++) {
    const night = new Date(peakLocalDate.getFullYear(), peakLocalDate.getMonth(), peakLocalDate.getDate() + offset);
    const assessed = assessNight(shower, lat, lng, night, opts.bortle, opts.cloudPct);
    if (assessed) windows.push(assessed);
  }
  windows.sort((a, b) => b.bestRate - a.bestRate);
  const peakTime = new Date(shower.peakUTC);
  return {
    windows,
    best: windows[0] ?? null,
    constellation: constellationOf(shower.radiant.ra, shower.radiant.dec),
    radiantAltAtPeak: Math.round(radiantAltitudeAt(peakTime, lat, lng, shower.radiant.ra, shower.radiant.dec) * 10) / 10,
    moonIllumAtPeak: Math.round(moonIlluminatedFraction(peakTime) * 100) / 100
  };
}

/** Format an ISO timestamp in the given locale's default time zone. */
export function formatDateTime(iso: string, locale: "zh" | "en", timeZone?: string): string {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
}
