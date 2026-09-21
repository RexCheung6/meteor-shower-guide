import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CITIES } from "../data/cities";
import darkSitesData from "../data/dark-sites.json";
import { clearForecastCache, confidenceFor, fetchForecast, nightLabel } from "../lib/weather";
import { nightTwilight } from "../lib/astro";
import type { City, DarkSite, HourlyPoint, WeatherForecast } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import { useLocation } from "../context/LocationContext";
import CloudChart, { type DarkWindow } from "../components/CloudChart";
import SearchableSelect from "../components/SearchableSelect";

const darkSites = darkSitesData as DarkSite[];

interface DaySummary {
  date: string;
  avgCloud: number;
  rainMm: number;
  clear: boolean;
  daysAhead: number;
}

function bucketDate(label: string, hour: number): string | null {
  if (hour >= 21) return label;
  if (hour <= 4) {
    const d = new Date(`${label}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function shiftDate(ymd: string, offset: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildDays(points: HourlyPoint[]): DaySummary[] {
  const buckets = new Map<string, { cloudSum: number; rain: number; count: number }>();
  for (const p of points) {
    const label = nightLabel(p.time);
    const hour = Number(p.time.slice(11, 13));
    const bucket = bucketDate(label, hour);
    if (!bucket) continue;
    const entry = buckets.get(bucket) ?? { cloudSum: 0, rain: 0, count: 0 };
    entry.cloudSum += p.cloudCover;
    entry.rain += p.precipitation;
    entry.count += 1;
    buckets.set(bucket, entry);
  }
  const first = Math.min(...[...buckets.keys()].map((d) => parseYMD(d).getTime()));
  return [...buckets.entries()]
    .map(([date, b]) => {
      const avgCloud = b.cloudSum / Math.max(1, b.count);
      return {
        date,
        avgCloud: Math.round(avgCloud),
        rainMm: Math.round(b.rain * 10) / 10,
        clear: avgCloud <= 35 && b.rain <= 0.5,
        daysAhead: Math.round((parseYMD(date).getTime() - first) / 86400000)
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function WeatherPage() {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string }>();
  const current: Locale = locale === "en" ? "en" : "zh";
  const [searchParams] = useSearchParams();
  const { location, setLocation } = useLocation();
  const overrideDone = useRef(false);
  useEffect(() => {
    if (overrideDone.current) return;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const name = searchParams.get("name");
    if (lat && lng && name) {
      setLocation({ lat: Number(lat), lng: Number(lng), name: { zh: name, en: name }, bortleClass: 8 });
    }
    overrideDone.current = true;
  }, [searchParams, setLocation]);
  const [selectKey, setSelectKey] = useState("");
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchForecast(location.lat, location.lng)
      .then((f) => {
        if (!cancelled) {
          setForecast(f);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [location, refreshToken]);

  const selectOptions = useMemo(
    () => [
      ...CITIES.map((c: City) => ({
        key: `city:${c.id}`,
        label: `${localizedName(c.names, current)} · ${localizedName(c.region, current)}`,
        searchText: `${c.names.zh} ${c.names.en} ${c.region.zh} ${c.region.en}`
      })),
      ...darkSites.map((s) => ({
        key: `site:${s.id}`,
        label: `${localizedName(s.names, current)} (Bortle ${s.bortleClass})`,
        searchText: `${s.names.zh} ${s.names.en} ${s.region.zh} ${s.region.en}`
      }))
    ],
    [current]
  );

  const days = useMemo(() => (forecast ? buildDays(forecast.points) : []), [forecast]);
  const chosen = useMemo(() => {
    if (selectedDate && days.some((d) => d.date === selectedDate)) return selectedDate;
    return days.find((d) => d.clear)?.date ?? days[0]?.date ?? "";
  }, [days, selectedDate]);

  const chartPoints = useMemo(() => (forecast ? forecast.points.filter((p) => nightLabel(p.time) === chosen) : []), [forecast, chosen]);

  const darkWindows = useMemo(() => {
    if (!chosen) return [];
    const windows: DarkWindow[] = [];
    for (const day of [shiftDate(chosen, -1), chosen, shiftDate(chosen, 1)]) {
      const tw = nightTwilight(parseYMD(day), location.lat, location.lng);
      if (tw.darkStart && tw.darkEnd) windows.push({ start: tw.darkStart, end: tw.darkEnd });
    }
    return windows;
  }, [chosen, location]);

  const geolocate = () => {
    if (!navigator.geolocation) {
      setLocateFailed(true);
      return;
    }
    setLocating(true);
    setLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: { zh: "我的位置", en: "My location" }, bortleClass: 8 });
        setSelectKey("");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocateFailed(true);
      },
      { timeout: 10000 }
    );
  };

  const refresh = () => {
    clearForecastCache(location.lat, location.lng);
    setRefreshToken((v) => v + 1);
  };

  const chosenSummary = days.find((d) => d.date === chosen);

  return (
    <div className="page">
      <section className="card">
        <h1>{t("weather.title")}</h1>
        <p className="muted">{t("weather.subtitle")}</p>
        <div className="location-picker">
          <SearchableSelect
            options={selectOptions}
            value={selectKey}
            onChange={(key) => {
              setSelectKey(key);
              const [type, id] = key.split(":");
              if (type === "city") {
                const c = CITIES.find((city) => city.id === id);
                if (c) setLocation({ lat: c.lat, lng: c.lng, name: c.names, bortleClass: c.bortleClass, region: c.region });
              } else if (type === "site") {
                const s = darkSites.find((site) => site.id === id);
                if (s) setLocation({ lat: s.lat, lng: s.lng, name: s.names, bortleClass: s.bortleClass, region: s.region });
              }
            }}
            placeholder={localizedName(location.name, current)}
            searchPlaceholder={t("weather.searchCity")}
            emptyLabel={t("weather.noMatch")}
          />
          <button type="button" className="btn-small" onClick={geolocate} disabled={locating}>
            {locating ? t("weather.locating") : t("weather.useMyLocation")}
          </button>
          <button type="button" className="btn-small" onClick={refresh}>
            {t("weather.refresh")}
          </button>
        </div>
        {locateFailed && <p className="muted">{t("weather.locateFailed")}</p>}
        {forecast && (
          <p className="muted">
            {t("weather.forecastFor")}: {localizedName(location.name, current)} · {t("weather.fetchedAt")}:{" "}
            {new Date(forecast.fetchedAt).toLocaleString(current === "zh" ? "zh-CN" : "en-US")}
          </p>
        )}
      </section>

      {loading && <div className="card center muted">{t("weather.loading")}</div>}
      {error && (
        <div className="card center">
          <p>{t("weather.error")}</p>
          <button type="button" className="btn-primary" onClick={refresh}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {forecast && days.length > 0 && (
        <>
          <section className="card">
            <h2>{t("weather.daily")}</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("weather.date")}</th>
                    <th>{t("weather.nightCloud")}</th>
                    <th>{t("weather.precip")}</th>
                    <th>{t("weather.verdict")}</th>
                    <th>{t("weather.confidence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className={d.date === chosen ? "row-best" : ""}>
                      <td>
                        {d.date}
                        {d.date === chosenSummary?.date && chosenSummary.clear && <span className="badge-good">{t("weather.bestNight")}</span>}
                      </td>
                      <td>
                        <span className={d.avgCloud <= 35 ? "text-good" : d.avgCloud <= 70 ? "text-mid" : "text-bad"}>{d.avgCloud}%</span>
                      </td>
                      <td>{d.rainMm} mm</td>
                      <td>
                        <span className={`badge ${d.clear ? "badge-good" : "badge-cloud"}`}>{d.clear ? t("weather.clearNight") : t("weather.notClearNight")}</span>
                      </td>
                      <td className="muted">{t(`weather.confidence${capital(confidenceFor(d.daysAhead * 24))}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!days.some((d) => d.clear) && <p className="muted">{t("weather.noClearNights")}</p>}
          </section>

          <section className="card">
            <h2>{t("weather.chartTitle")}</h2>
            <div className="location-picker">
              <label className="field inline">
                <span>{t("weather.selectDay")}</span>
                <select value={chosen} onChange={(e) => setSelectedDate(e.target.value)}>
                  {days.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.date}
                      {d.clear ? ` · ${t("weather.clearNight")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <CloudChart points={chartPoints} darkWindows={darkWindows} locale={current} />
            <p className="muted chart-note">{t("weather.darkShade")}</p>
          </section>
        </>
      )}
    </div>
  );
}
