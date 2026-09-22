import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import { assessNight, formatDateTime, moonAltitudeAt, moonIlluminatedFraction } from "../lib/astro";
import { fetchForecast } from "../lib/weather";
import { useLocation } from "../context/LocationContext";
import type { HourlyPoint, Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";

const showers = showersData as Shower[];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function localDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function tonightCloud(points: HourlyPoint[], now: Date): number {
  const today = localDateKey(now);
  const currentHour = now.getHours();
  const tonight = points.filter((point) => {
    if (!point.time.startsWith(today)) return false;
    const hour = Number(point.time.slice(11, 13));
    return hour >= currentHour || hour < 6;
  }).slice(0, 12);
  if (tonight.length === 0) return 50;
  return tonight.reduce((sum, point) => sum + point.cloudCover, 0) / tonight.length;
}

export default function ObservationScoreCard() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const { location } = useLocation();
  const [cloud, setCloud] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const now = useMemo(() => new Date(), []);
  const shower = useMemo(() => {
    const timestamp = now.getTime();
    return showers.find((item) => {
      const start = new Date(`${item.activeStart}T00:00:00`).getTime();
      const end = new Date(`${item.activeEnd}T23:59:59`).getTime();
      return timestamp >= start && timestamp <= end;
    }) ?? showers.find((item) => new Date(item.peakUTC).getTime() > timestamp) ?? showers[showers.length - 1];
  }, [now]);

  useEffect(() => {
    let cancelled = false;
    setCloud(null);
    setFetchedAt(null);
    setFailed(false);
    fetchForecast(location.lat, location.lng)
      .then((forecast) => {
        if (!cancelled) {
          setCloud(tonightCloud(forecast.points, new Date()));
          setFetchedAt(forecast.fetchedAt);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng]);

  const assessment = useMemo(() => {
    const cloudPct = cloud ?? 50;
    const result = assessNight(shower, location.lat, location.lng, now, location.bortleClass, cloudPct);
    const best = result;
    const moonFraction = moonIlluminatedFraction(best ? new Date(best.bestTime) : now);
    const moonUp = moonAltitudeAt(best ? new Date(best.bestTime) : now, location.lat, location.lng) > 0;
    const cloudScore = 100 - cloudPct;
    const moonScore = (1 - moonFraction) * (moonUp ? 55 : 100);
    const radiantScore = best ? clamp((best.bestRadiantAlt / 60) * 100) : 0;
    const lightScore = clamp(((9 - location.bortleClass) / 8) * 100);
    const score = Math.round(cloudScore * 0.4 + moonScore * 0.25 + radiantScore * 0.25 + lightScore * 0.1);
    return { best, cloudPct, moonFraction, moonUp, score };
  }, [cloud, location, now, shower]);

  const scoreClass = assessment.score >= 70 ? "score-good" : assessment.score >= 45 ? "score-mid" : "score-bad";
  const verdictKey = assessment.score >= 70 ? "good" : assessment.score >= 45 ? "mid" : "bad";

  return (
    <section className={`observation-card ${scoreClass}`}>
      <div className="observation-card-main">
        <div>
          <p className="hero-eyebrow">{t("home.observationEyebrow")}</p>
          <h2>{t("home.observationTitle")}</h2>
          <p className="muted">
            {t("home.observationBasedOn", { shower: localizedName(shower.names, current), location: localizedName(location.name, current) })}
          </p>
        </div>
        <div className="observation-score" aria-label={`${assessment.score}/100`}>
          <strong>{assessment.score}</strong><span>/100</span>
        </div>
      </div>
      <div className="observation-verdict">{t(`home.observationVerdict.${verdictKey}`)}</div>
      <div className="observation-factors">
        <div><span>{t("home.observationCloud")}</span><strong>{Math.round(assessment.cloudPct)}%</strong></div>
        <div><span>{t("home.observationMoon")}</span><strong>{Math.round(assessment.moonFraction * 100)}%</strong></div>
        <div><span>{t("home.observationRadiant")}</span><strong>{assessment.best ? `${Math.round(assessment.best.bestRadiantAlt)}°` : "—"}</strong></div>
        <div><span>{t("home.observationWindow")}</span><strong>{assessment.best ? formatDateTime(assessment.best.bestTime, current) : "—"}</strong></div>
      </div>
      <div className="observation-card-footer">
        <span className="muted">
          {failed
            ? t("home.observationWeatherUnavailable")
            : fetchedAt
              ? t("home.observationUpdated", { time: new Date(fetchedAt).toLocaleTimeString(current === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }) })
              : t("home.observationLoading")}
        </span>
        <Link className="btn-small" to={`/${current}/weather`}>{t("home.observationDetails")}</Link>
      </div>
    </section>
  );
}
