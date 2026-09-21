import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearForecastCache, fetchForecast } from "../src/lib/weather";

const sample = {
  timezone_abbreviation: "CST",
  hourly: {
    time: ["2026-08-12T00:00", "2026-08-12T01:00"],
    cloud_cover: [20, 40],
    precipitation: [0, 0.2],
    visibility: [20000, 15000],
    temperature_2m: [27, 26.5]
  }
};

describe("weather cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches, maps units, and reuses the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.stubGlobal("fetch", fetchMock);
    const first = await fetchForecast(23.129, 113.264);
    expect(first.points).toHaveLength(2);
    expect(first.points[0].visibilityKm).toBe(20);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchForecast(23.129, 113.264);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when the cache is stale", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.stubGlobal("fetch", fetchMock);
    await fetchForecast(23.129, 113.264);
    const key = Object.keys(localStorage).find((k) => k.startsWith("mss.weatherCache:"))!;
    const cached = JSON.parse(localStorage.getItem(key)!);
    cached.fetchedAt = Date.now() - 31 * 60000;
    localStorage.setItem(key, JSON.stringify(cached));
    await fetchForecast(23.129, 113.264);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearForecastCache forces a refetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.stubGlobal("fetch", fetchMock);
    await fetchForecast(23.129, 113.264);
    clearForecastCache(23.129, 113.264);
    await fetchForecast(23.129, 113.264);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
