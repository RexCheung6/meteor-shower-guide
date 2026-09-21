import { describe, expect, it } from "vitest";
import { bortleFactor, cloudFactor, rateAt, tierOf } from "../src/lib/visibility";
import type { RateTier } from "../src/types";

describe("rate model", () => {
  it("ideal dark sky with radiant overhead gives the full ZHR", () => {
    expect(rateAt(90, 100, 0, 1)).toBeCloseTo(100, 1);
  });

  it("lower radiant altitude reduces the rate by sin(alt)", () => {
    expect(rateAt(30, 100, 0, 1)).toBeCloseTo(50, 0);
  });

  it("cloud cover and Bortle class both reduce the rate", () => {
    const clear = rateAt(60, 100, 0, 4);
    const cloudy = rateAt(60, 100, 80, 4);
    expect(cloudy).toBeLessThan(clear * 0.3);
    const city = rateAt(60, 100, 0, 8);
    expect(city).toBeLessThan(clear * 0.2);
  });

  it("bortle factors are bounded and monotonic", () => {
    expect(bortleFactor(1)).toBeGreaterThan(bortleFactor(5));
    expect(bortleFactor(5)).toBeGreaterThan(bortleFactor(9));
    expect(bortleFactor(99)).toBeGreaterThan(0);
  });

  it("cloud factor is 1 when clear and near 0.1 when overcast", () => {
    expect(cloudFactor(0)).toBe(1);
    expect(cloudFactor(100)).toBeCloseTo(0.1);
  });

  it("tiers follow absolute hourly-rate thresholds", () => {
    expect(tierOf(60)).toBe("ideal");
    expect(tierOf(25)).toBe("good");
    expect(tierOf(8)).toBe("hard");
    expect(tierOf(1)).toBe("invisible");
    const tiers: RateTier[] = ["ideal", "good", "hard", "invisible"];
    expect(tiers).toContain(tierOf(3.5));
  });
});
