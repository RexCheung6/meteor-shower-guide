export interface LocalizedText {
  zh: string;
  en: string;
}

export interface Shower {
  id: string;
  names: LocalizedText;
  /** Active period, inclusive ISO dates YYYY-MM-DD */
  activeStart: string;
  activeEnd: string;
  /** Peak instant in UTC */
  peakUTC: string;
  /** Radiant position. ra is in degrees (IMO style), dec in degrees. */
  radiant: { ra: number; dec: number };
  zhr: number;
  parent: LocalizedText;
  notes: LocalizedText;
  visibleFrom: LocalizedText;
}

export interface DarkSite {
  id: string;
  names: LocalizedText;
  lat: number;
  lng: number;
  /** Bortle class 1..9 */
  bortleClass: number;
  region: LocalizedText;
  tips: LocalizedText;
  /** Shower ids this site is recommended for; [] or ["all"] means general. */
  showerIds: string[];
}

export interface City {
  id: string;
  names: LocalizedText;
  lat: number;
  lng: number;
  bortleClass: number;
  region: LocalizedText;
}

export interface ObservationLocation {
  lat: number;
  lng: number;
  name: LocalizedText;
  bortleClass: number;
  region?: LocalizedText;
}

export interface HourlyPoint {
  /** Local wall-clock time from the API, format YYYY-MM-DDTHH:00 */
  time: string;
  cloudCover: number;
  precipitation: number;
  visibilityKm: number;
  temperature: number;
}

export interface WeatherForecast {
  fetchedAt: number;
  timezone: string;
  points: HourlyPoint[];
}

export type RateTier = "ideal" | "good" | "hard" | "invisible";

export interface ObservingWindow {
  /** Local night label YYYY-MM-DD */
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

export interface ShowerVisibility {
  windows: ObservingWindow[];
  best: ObservingWindow | null;
  constellation: string;
  radiantAltAtPeak: number;
  moonIllumAtPeak: number;
}
