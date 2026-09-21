import { describe, expect, it } from "vitest";
import showersData from "../src/data/showers.json";
import type { Shower } from "../src/types";
import {
  bestObservingWindow,
  moonIlluminatedFraction,
  nightTwilight,
  radiantAltitudeAt
} from "../src/lib/astro";

const showers = showersData as Shower[];
const perseids = showers.find((s) => s.id === "perseids")!;

const GUANGZHOU = { lat: 23.13, lng: 113.26 };
const SYDNEY = { lat: -33.87, lng: 151.21 };

describe("radiant altitude", () => {
  it("Perseid radiant is high over the GBA before dawn on Aug 13", () => {
    // 2026-08-13 03:30 +08:00 = 2026-08-12T19:30Z
    const alt = radiantAltitudeAt(new Date("2026-08-12T19:30:00Z"), GUANGZHOU.lat, GUANGZHOU.lng, perseids.radiant.ra, perseids.radiant.dec);
    expect(alt).toBeGreaterThan(30);
    expect(alt).toBeLessThan(70);
  });

  it("Perseid radiant never rises from Sydney (southern hemisphere)", () => {
    const peak = new Date(perseids.peakUTC);
    const alt = radiantAltitudeAt(peak, SYDNEY.lat, SYDNEY.lng, perseids.radiant.ra, perseids.radiant.dec);
    expect(alt).toBeLessThan(0);
  });
});

describe("twilight windows", () => {
  it("astronomical darkness over Guangzhou spans the GBA pre-dawn window", () => {
    const tw = nightTwilight(new Date(2026, 7, 12), GUANGZHOU.lat, GUANGZHOU.lng);
    expect(tw.darkStart).not.toBeNull();
    expect(tw.darkEnd).not.toBeNull();
    // Dark start Aug 12 ~19:50 local = 11:50Z; dark end Aug 13 ~04:30 local = 20:30Z
    expect(tw.darkStart!.getTime()).toBeGreaterThan(new Date("2026-08-12T11:00:00Z").getTime());
    expect(tw.darkStart!.getTime()).toBeLessThan(new Date("2026-08-12T13:00:00Z").getTime());
    expect(tw.darkEnd!.getTime()).toBeGreaterThan(new Date("2026-08-12T19:00:00Z").getTime());
    expect(tw.darkEnd!.getTime()).toBeLessThan(new Date("2026-08-12T22:00:00Z").getTime());
  });
});

describe("best observing window", () => {
  it("finds the pre-dawn window of Aug 13 for the GBA", () => {
    const v = bestObservingWindow(perseids, GUANGZHOU.lat, GUANGZHOU.lng, { bortle: 8 });
    expect(v.best).not.toBeNull();
    const bestTime = new Date(v.best!.bestTime).getTime();
    // The usable dark window is on the night of Aug 12 local (evening Aug 12 -> dawn Aug 13)
    expect(bestTime).toBeGreaterThanOrEqual(new Date("2026-08-12T13:00:00Z").getTime());
    expect(bestTime).toBeLessThanOrEqual(new Date("2026-08-12T22:00:00Z").getTime());
    expect(v.best!.bestRadiantAlt).toBeGreaterThan(35);
    expect(v.best!.bestRate).toBeGreaterThan(1);
    expect(v.best!.bestRate).toBeLessThan(15);
    expect(["good", "hard", "ideal"]).toContain(v.best!.tier);
  });

  it("reports no usable window for Perseids from Sydney", () => {
    const v = bestObservingWindow(perseids, SYDNEY.lat, SYDNEY.lng, { bortle: 2 });
    expect(v.best).toBeNull();
  });
});

describe("moon", () => {
  it("is essentially new at the 2026 Perseid peak", () => {
    const frac = moonIlluminatedFraction(new Date(perseids.peakUTC));
    expect(frac).toBeLessThan(0.05);
  });
});

describe("local peak conversion", () => {
  it("the Perseid node maximum maps to daytime in Beijing time", () => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const s = fmt.format(new Date("2026-08-13T02:00:00Z"));
    expect(s).toMatch(/2026-08-13/);
    expect(s).toMatch(/10:00/);
  });
});
