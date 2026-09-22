import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import { bestObservingWindow, formatDateTime } from "../lib/astro";
import { useLocation } from "../context/LocationContext";
import type { Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";

const showers = showersData as Shower[];

export default function ObservationModePage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const [searchParams] = useSearchParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const { location } = useLocation();
  const now = new Date();
  const shower = useMemo(() => {
    const requested = showers.find((item) => item.id === searchParams.get("shower"));
    if (requested) return requested;
    const active = showers.find((item) => now >= new Date(`${item.activeStart}T00:00:00`) && now <= new Date(`${item.activeEnd}T23:59:59`));
    return active ?? showers.find((item) => new Date(item.peakUTC) > now) ?? showers[showers.length - 1];
  }, [now, searchParams]);
  const visibility = useMemo(
    () => bestObservingWindow(shower, location.lat, location.lng, { bortle: location.bortleClass }),
    [location, shower]
  );
  const best = visibility.best;

  return (
    <div className="observation-mode page">
      <section className="observation-mode-head">
        <div>
          <p className="hero-eyebrow">{t("observationMode.eyebrow")}</p>
          <h1>{localizedName(shower.names, current)}</h1>
          <p className="muted">{localizedName(location.name, current)} · Bortle {location.bortleClass}</p>
        </div>
        <Link className="btn-ghost" to={`/${current}/showers/${shower.id}`}>{t("observationMode.backDetails")}</Link>
      </section>
      <section className="observation-mode-grid">
        <div className="observation-mode-primary">
          <span className="mode-label">{t("observationMode.bestWindow")}</span>
          <strong>{best ? formatDateTime(best.bestTime, current) : "—"}</strong>
          <span className="muted">{best ? `${best.bestRadiantAlt}° · ${best.bestRate} ${t("shower.perHour")}` : t("shower.bestWindowNone")}</span>
        </div>
        <div className="mode-stat"><span>{t("observationMode.radiant")}</span><strong>{best ? `${best.bestRadiantAlt}°` : "—"}</strong></div>
        <div className="mode-stat"><span>{t("observationMode.moon")}</span><strong>{best ? `${Math.round(best.moonIllumFraction * 100)}%` : "—"}</strong></div>
        <div className="mode-stat"><span>{t("observationMode.expected")}</span><strong>{best ? `${best.bestRate}` : "—"}</strong></div>
      </section>
      <section className="card mode-checklist">
        <h2>{t("observationMode.checklistTitle")}</h2>
        <ul className="tips-list">
          {(t("observationMode.checklist", { returnObjects: true }) as unknown as string[]).map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
