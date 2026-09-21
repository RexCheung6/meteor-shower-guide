import type { HourlyPoint, WeatherForecast } from "../types";

const BASE = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 30 * 60000;

function cacheKey(lat: number, lng: number): string {
  return `mss.weatherCache:${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function readCache(key: string): WeatherForecast | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherForecast;
    if (Date.now() - parsed.fetchedAt > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchForecast(lat: number, lng: number): Promise<WeatherForecast> {
  const key = cacheKey(lat, lng);
  const cached = readCache(key);
  if (cached) return cached;
  const url =
    `${BASE}?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
    "&hourly=cloud_cover,precipitation,visibility,temperature_2m&timezone=auto&forecast_days=16";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather-http-${res.status}`);
  const data = (await res.json()) as {
    timezone_abbreviation?: string;
    hourly: { time: string[]; cloud_cover: number[]; precipitation: number[]; visibility: number[]; temperature_2m: number[] };
  };
  const points: HourlyPoint[] = data.hourly.time.map((time, i) => ({
    time,
    cloudCover: data.hourly.cloud_cover[i] ?? 0,
    precipitation: data.hourly.precipitation[i] ?? 0,
    visibilityKm: (data.hourly.visibility[i] ?? 0) / 1000,
    temperature: data.hourly.temperature_2m[i] ?? 0
  }));
  const forecast: WeatherForecast = {
    fetchedAt: Date.now(),
    timezone: data.timezone_abbreviation ?? "",
    points
  };
  try {
    localStorage.setItem(key, JSON.stringify(forecast));
  } catch {
    // storage may be full; ignore
  }
  return forecast;
}

export type Confidence = "high" | "medium" | "low";

export function confidenceFor(hoursAhead: number): Confidence {
  if (hoursAhead <= 72) return "high";
  if (hoursAhead <= 168) return "medium";
  return "low";
}

export function nightLabel(pointTime: string): string {
  return pointTime.slice(0, 10);
}

export function clearForecastCache(lat: number, lng: number): void {
  try {
    localStorage.removeItem(cacheKey(lat, lng));
  } catch {
    // ignore
  }
}
