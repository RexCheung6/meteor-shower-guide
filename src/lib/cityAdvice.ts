import type { DarkSite, ObservationLocation } from "../types";

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestDarkSites(
  location: ObservationLocation,
  sites: DarkSite[],
  limit = 3,
  maxDistanceKm?: number
): { site: DarkSite; distanceKm: number }[] {
  return sites
    .filter((site) => !(site.lat === location.lat && site.lng === location.lng))
    .map((site) => ({ site, distanceKm: Math.round(haversineKm(location.lat, location.lng, site.lat, site.lng)) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((item) => (maxDistanceKm ? item.distanceKm <= maxDistanceKm : true))
    .slice(0, limit);
}

export function topDarkSites(
  location: ObservationLocation,
  sites: DarkSite[],
  limit = 3
): { site: DarkSite; distanceKm: number }[] {
  return sites
    .filter((site) => site.bortleClass <= 3)
    .filter((site) => !(site.lat === location.lat && site.lng === location.lng))
    .map((site) => ({ site, distanceKm: Math.round(haversineKm(location.lat, location.lng, site.lat, site.lng)) }))
    .sort((a, b) => a.site.bortleClass - b.site.bortleClass || a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export type Hemisphere = "north" | "south";

export function hemisphereOf(lat: number): Hemisphere {
  return lat >= 0 ? "north" : "south";
}

export type LatBand = "tropical" | "mid" | "high";

export function latBandKey(lat: number): LatBand {
  const a = Math.abs(lat);
  if (a < 23.5) return "tropical";
  if (a <= 55) return "mid";
  return "high";
}

export function isGbaLocation(location: ObservationLocation): boolean {
  const z = location.region?.zh ?? "";
  if (z.includes("粤港澳") || z.includes("香港") || z.includes("澳门")) return true;
  return location.lat >= 21.5 && location.lat <= 23.8 && location.lng >= 111.5 && location.lng <= 115.0;
}

/**
 * Returns an i18n key (tips.climate.*) with a local climate note for the city,
 * or null when the generic GBA block should be shown instead.
 */
export function climateKeyFor(location: ObservationLocation): string | null {
  if (isGbaLocation(location)) return null;
  const z = location.region?.zh ?? "";
  const en = location.region?.en ?? "";
  const nameEn = location.name?.en ?? "";

  if (["广东", "广西", "福建", "海南"].some((r) => z.includes(r))) return "tips.climate.hot-humid";
  if (["云南", "贵州", "四川", "重庆"].some((r) => z.includes(r))) return "tips.climate.southwest";
  if (["西藏", "青海"].some((r) => z.includes(r))) return "tips.climate.plateau";
  if (z.includes("台湾")) return "tips.climate.taiwan";
  if (["北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "山东", "河南", "陕西", "甘肃", "宁夏", "新疆"].some((r) => z.includes(r)))
    return "tips.climate.north-dry";
  if (["江苏", "上海", "浙江", "安徽", "湖北", "湖南", "江西"].some((r) => z.includes(r))) return "tips.climate.east";

  if (["India", "Bangladesh", "Pakistan", "Thailand", "Vietnam", "Philippines", "Indonesia", "Malaysia", "Singapore", "Kenya", "Nigeria", "Colombia", "Peru"].some((r) => en.includes(r)))
    return "tips.climate.monsoon";
  if (["UAE", "Saudi Arabia", "Qatar", "Israel", "Iran", "Turkey", "Egypt"].some((r) => en.includes(r))) return "tips.climate.dry";
  if (["UK", "France", "Germany", "Netherlands", "Belgium", "Poland", "Czechia", "Austria", "Hungary", "Switzerland", "Denmark", "Sweden", "Norway", "Finland", "Ireland", "Russia", "Ukraine"].some((r) => en.includes(r)))
    return "tips.climate.eu-cloudy";
  if (["Spain", "Italy", "Greece", "Portugal"].some((r) => en.includes(r))) return "tips.climate.eu-south";
  if (["San Francisco", "Seattle", "Vancouver", "Los Angeles"].some((n) => nameEn.includes(n))) return "tips.climate.na-west";
  if (["USA", "Canada", "Mexico"].some((r) => en.includes(r))) return "tips.climate.na-east";
  if (["Brazil", "Argentina", "Chile", "Colombia", "Peru"].some((r) => en.includes(r))) return "tips.climate.sa";
  if (["Australia", "New Zealand"].some((r) => en.includes(r))) return "tips.climate.oceania";
  if (["South Africa", "Egypt", "Kenya", "Nigeria"].some((r) => en.includes(r))) return "tips.climate.africa";
  if (["Japan", "South Korea"].some((r) => en.includes(r))) return "tips.climate.east-asia";
  return null;
}

export function bortleBandKey(bortle: number): "pristine" | "rural" | "suburban" | "urban" {
  const b = Math.round(bortle);
  if (b <= 2) return "pristine";
  if (b <= 4) return "rural";
  if (b <= 6) return "suburban";
  return "urban";
}

export type DifficultyLevel = "very-easy" | "easy" | "moderate" | "hard" | "very-hard";

export interface Difficulty {
  level: DifficultyLevel;
  score: number;
}

const BORTLE_SCORE: Record<number, number> = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 40, 6: 50, 7: 65, 8: 80, 9: 90 };
const CLOUDY_CLIMATES = new Set([
  "tips.climate.hot-humid",
  "tips.climate.southwest",
  "tips.climate.east",
  "tips.climate.taiwan",
  "tips.climate.monsoon",
  "tips.climate.eu-cloudy",
  "tips.climate.na-west",
  "tips.climate.na-east",
  "tips.climate.sa",
  "tips.climate.africa"
]);

export function difficultyOf(location: ObservationLocation, climateKey: string | null): Difficulty {
  const bortle = Math.max(1, Math.min(9, Math.round(location.bortleClass)));
  const score = BORTLE_SCORE[bortle] ?? 80;
  const climateBonus = climateKey === null ? 10 : CLOUDY_CLIMATES.has(climateKey) ? 10 : 0;
  const latBonus = Math.abs(location.lat) > 55 ? 10 : Math.abs(location.lat) < 23.5 ? 5 : 0;
  const total = Math.min(100, score + climateBonus + latBonus);
  let level: DifficultyLevel;
  if (total <= 20) level = "very-easy";
  else if (total <= 35) level = "easy";
  else if (total <= 55) level = "moderate";
  else if (total <= 75) level = "hard";
  else level = "very-hard";
  return { level, score: total };
}
