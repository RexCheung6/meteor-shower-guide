import { Suspense, lazy, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import darkSitesData from "../data/dark-sites.json";
import { formatDateTime } from "../lib/astro";
import type { DarkSite, Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";

const MeteorMap = lazy(() => import("../components/MeteorMap"));
const showers = showersData as Shower[];
const darkSites = darkSitesData as DarkSite[];

export default function MapPage() {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string }>();
  const current: Locale = locale === "en" ? "en" : "zh";
  const [searchParams] = useSearchParams();
  const [showerId, setShowerId] = useState(() => searchParams.get("shower") ?? "perseids");
  const [timeOffsetHours, setTimeOffsetHours] = useState(0);
  const [showLightPollution, setShowLightPollution] = useState(false);
  const focusSiteId = searchParams.get("site");

  const shower = useMemo(() => showers.find((s) => s.id === showerId) ?? showers[0], [showerId]);
  const mapTime = useMemo(() => new Date(new Date(shower.peakUTC).getTime() + timeOffsetHours * 3600000), [shower, timeOffsetHours]);
  const sites = useMemo(
    () => darkSites.filter((s) => s.showerIds.includes(shower.id) || s.showerIds.includes("all") || s.showerIds.length === 0),
    [shower]
  );

  return (
    <div className="page">
      <section className="card">
        <h1>{t("map.title")}</h1>
        <p className="muted">{t("map.subtitle")}</p>
        <div className="map-controls">
          <label className="field inline">
            <span>{t("map.shower")}</span>
            <select value={shower.id} onChange={(e) => setShowerId(e.target.value)}>
              {showers.map((s) => (
                <option key={s.id} value={s.id}>
                  {localizedName(s.names, current)}
                </option>
              ))}
            </select>
          </label>
          <label className="field inline">
            <span>
              {t("map.timeAt")}（{t("map.peak")} {timeOffsetHours >= 0 ? "+" : ""}
              {timeOffsetHours}h）
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={timeOffsetHours}
              onChange={(e) => setTimeOffsetHours(Number(e.target.value))}
            />
          </label>
          <label className="check-field">
            <input type="checkbox" checked={showLightPollution} onChange={(e) => setShowLightPollution(e.target.checked)} />
            {t("map.lightPollutionLayer")}
          </label>
        </div>
        <p className="muted map-time-label">
          {formatDateTime(mapTime.toISOString(), current, "UTC")} UTC
        </p>
      </section>
      <Suspense fallback={<div className="map-loading">{t("common.loading")}</div>}>
        <MeteorMap
          shower={shower}
          time={mapTime}
          sites={sites}
          focusSiteId={focusSiteId}
          showLightPollution={showLightPollution}
          locale={current}
        />
      </Suspense>
      <section className="card">
        <h2>{t("map.howToReadTitle")}</h2>
        <ol className="tips-list">
          {(t("map.howToRead", { returnObjects: true }) as unknown as string[]).map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ol>
      </section>
      <p className="muted map-note">{t("map.note")}</p>
    </div>
  );
}
