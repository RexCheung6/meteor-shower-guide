import { describe, expect, it } from "vitest";
import darkSitesData from "../src/data/dark-sites.json";
import type { DarkSite, ObservationLocation } from "../src/types";
import {
  bortleBandKey,
  climateKeyFor,
  difficultyOf,
  haversineKm,
  hemisphereOf,
  isGbaLocation,
  latBandKey,
  nearestDarkSites,
  topDarkSites
} from "../src/lib/cityAdvice";

const darkSites = darkSitesData as DarkSite[];

function loc(lat: number, lng: number, zh: string, en: string, bortleClass = 8): ObservationLocation {
  return { lat, lng, name: { zh, en }, bortleClass, region: { zh, en } };
}

describe("city advice helpers", () => {
  it("haversine distance is sane for nearby points", () => {
    const gzToConghua = haversineKm(23.13, 113.26, 23.74, 113.79);
    expect(gzToConghua).toBeGreaterThan(50);
    expect(gzToConghua).toBeLessThan(120);
    expect(haversineKm(0, 0, 0, 0)).toBe(0);
  });

  it("returns nearest dark sites sorted by distance", () => {
    const nearby = nearestDarkSites(loc(23.13, 113.26, "广州", "Guangzhou"), darkSites, 3);
    expect(nearby).toHaveLength(3);
    expect(nearby[0].distanceKm).toBeLessThanOrEqual(nearby[1].distanceKm);
    expect(nearby[1].distanceKm).toBeLessThanOrEqual(nearby[2].distanceKm);
    expect(nearby[0].distanceKm).toBeLessThan(200);
  });

  it("finds regional sites within 400 km and excludes the GBA for northern cities", () => {
    const beijing = loc(39.9, 116.4, "北京", "Beijing");
    const nearby = nearestDarkSites(beijing, darkSites, 4, 400);
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.every(({ distanceKm }) => distanceKm <= 400)).toBe(true);
    expect(nearby.some(({ site }) => site.region.zh.includes("河北"))).toBe(true);
    expect(nearby.some(({ site }) => site.region.zh.includes("粤港澳") || site.region.zh.includes("香港"))).toBe(false);
  });

  it("offers in-city darker spots for major cities", () => {
    const gz = loc(23.13, 113.26, "广州", "Guangzhou");
    const citySites = nearestDarkSites(gz, darkSites, 4, 60);
    expect(citySites.length).toBeGreaterThan(0);
    expect(citySites[0].site.id).toBe("maofengshan");
    expect(citySites.every(({ distanceKm }) => distanceKm <= 60)).toBe(true);
  });

  it("excludes the site itself when the location is a dark site", () => {
    const apoliu = darkSites.find((s) => s.id === "apoliu")!;
    const nearby = nearestDarkSites(
      { lat: apoliu.lat, lng: apoliu.lng, name: apoliu.names, bortleClass: apoliu.bortleClass, region: apoliu.region },
      darkSites,
      3,
      800
    );
    expect(nearby.every(({ distanceKm }) => distanceKm > 0)).toBe(true);
  });

  it("finds Brecon Beacons for London and falls back for cities with no close site", () => {
    const london = loc(51.5, -0.13, "英国", "UK");
    const nearLondon = nearestDarkSites(london, darkSites, 3, 400);
    expect(nearLondon.length).toBeGreaterThan(0);
    expect(nearLondon[0].site.id).toBe("brecon");

    const auckland = loc(-36.85, 174.76, "新西兰", "New Zealand");
    const near = nearestDarkSites(auckland, darkSites, 3, 400);
    const fallback = topDarkSites(auckland, darkSites, 3);
    expect(near.length).toBe(0);
    expect(fallback.length).toBe(3);
    expect(fallback.every(({ site }) => site.bortleClass <= 3)).toBe(true);
  });

  it("detects hemisphere and latitude bands", () => {
    expect(hemisphereOf(23.13)).toBe("north");
    expect(hemisphereOf(-33.87)).toBe("south");
    expect(latBandKey(0)).toBe("tropical");
    expect(latBandKey(40)).toBe("mid");
    expect(latBandKey(70)).toBe("high");
  });

  it("detects the GBA and assigns climate notes per city", () => {
    const gz = loc(23.13, 113.26, "广东", "Guangdong");
    const bj = loc(39.9, 116.4, "北京", "Beijing");
    const london = loc(51.5, -0.13, "英国", "UK");
    const sydney = loc(-33.87, 151.21, "澳大利亚", "Australia");
    const tokyo = loc(35.68, 139.65, "日本", "Japan");
    const singapore = loc(1.35, 103.82, "新加坡", "Singapore");
    expect(isGbaLocation(gz)).toBe(true);
    expect(isGbaLocation(bj)).toBe(false);
    expect(climateKeyFor(gz)).toBeNull();
    expect(climateKeyFor(bj)).toBe("tips.climate.north-dry");
    expect(climateKeyFor(london)).toBe("tips.climate.eu-cloudy");
    expect(climateKeyFor(sydney)).toBe("tips.climate.oceania");
    expect(climateKeyFor(tokyo)).toBe("tips.climate.east-asia");
    expect(climateKeyFor(singapore)).toBe("tips.climate.monsoon");
  });

  it("maps Bortle classes to guidance bands", () => {
    expect(bortleBandKey(1)).toBe("pristine");
    expect(bortleBandKey(4)).toBe("rural");
    expect(bortleBandKey(6)).toBe("suburban");
    expect(bortleBandKey(9)).toBe("urban");
  });

  it("rates stargazing difficulty per city", () => {
    const gz = loc(23.13, 113.26, "广东", "Guangdong", 8);
    const lhasa = loc(29.65, 91.14, "西藏", "Tibet", 4);
    const dunhuang = loc(40.14, 94.66, "甘肃", "Gansu", 3);
    const sydney = loc(-33.87, 151.21, "澳大利亚", "Australia", 6);
    expect(difficultyOf(gz, climateKeyFor(gz)).level).toBe("very-hard");
    expect(difficultyOf(lhasa, climateKeyFor(lhasa)).level).toBe("easy");
    expect(difficultyOf(dunhuang, climateKeyFor(dunhuang)).level).toBe("very-easy");
    expect(difficultyOf(sydney, climateKeyFor(sydney)).level).toBe("moderate");
  });
});
