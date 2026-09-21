import type { ObservationLocation } from "../types";

export const LOCATION_KEY = "mss.location";

export const DEFAULT_LOCATION: ObservationLocation = {
  lat: 23.1291,
  lng: 113.2644,
  name: { zh: "广州", en: "Guangzhou" },
  bortleClass: 8,
  region: { zh: "广东", en: "Guangdong" }
};

export function loadSavedLocation(): ObservationLocation {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as ObservationLocation;
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number" && parsed.name?.zh && parsed.name?.en) {
      return parsed;
    }
    return DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

export function saveLocation(location: ObservationLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {
    // storage unavailable; ignore
  }
}
