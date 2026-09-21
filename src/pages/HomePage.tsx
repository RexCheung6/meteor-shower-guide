import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import Countdown from "../components/Countdown";
import { formatDateTime, moonIlluminatedFraction } from "../lib/astro";
import type { Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";

const DAY_MS = 86400000;
const showers = showersData as Shower[];

function moonTierKey(frac: number): string {
  if (frac < 0.1) return "moonNone";
  if (frac < 0.35) return "moonLow";
  if (frac < 0.7) return "moonMid";
  return "moonHigh";
}

function dateRangeISO(isoDate: string, endOfDay: boolean): number {
  return new Date(`${isoDate}T${endOfDay ? "23:59:59" : "00:00:00"}Z`).getTime();
}

export default function HomePage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => [...showers].sort((a, b) => a.peakUTC.localeCompare(b.peakUTC)), []);
  const next = sorted.find((s) => new Date(s.peakUTC).getTime() > now);
  const nextId = next?.id;
  const upcoming7 = sorted.filter((s) => {
    if (s.id === nextId) return false;
    const p = new Date(s.peakUTC).getTime();
    return p > now && p <= now + 7 * DAY_MS;
  });
  const upcoming30 = sorted.filter((s) => {
    if (s.id === nextId) return false;
    const p = new Date(s.peakUTC).getTime();
    return p > now && p <= now + 30 * DAY_MS;
  });
  const active = sorted.find((s) => now >= dateRangeISO(s.activeStart, false) && now <= dateRangeISO(s.activeEnd, true));

  const renderRow = (s: Shower) => (
    <tr key={s.id}>
      <td>
        <Link to={`/${current}/showers/${s.id}`}>{localizedName(s.names, current)}</Link>
      </td>
      <td>{formatDateTime(s.peakUTC, current)}</td>
      <td>{s.zhr}</td>
      <td>
        <span className={`moon-badge ${moonTierKey(moonIlluminatedFraction(new Date(s.peakUTC)))}`}>
          {t(`home.${moonTierKey(moonIlluminatedFraction(new Date(s.peakUTC)))}`)}
        </span>
      </td>
      <td className="table-visible">{localizedName(s.visibleFrom, current)}</td>
      <td>
        <Link className="btn-small" to={`/${current}/showers/${s.id}`}>
          {t("home.action")}
        </Link>
      </td>
    </tr>
  );

  return (
    <div className="page">
      <section className="hero">
        <p className="hero-eyebrow">{t("common.appName")}</p>
        <h1 className="hero-title">{t("home.heroTitle")}</h1>
        <p className="hero-subtitle">{t("home.heroSubtitle")}</p>
      </section>
      {active && (
        <div className="banner">
          {t("home.banner", { name: localizedName(active.names, current) })}{" "}
          <Link to={`/${current}/showers/${active.id}`}>{t("home.action")}</Link>
        </div>
      )}
      {next && (
        <section className="hero-card">
          <div className="hero-main">
            <p className="hero-eyebrow">{t("home.nextPeak")}</p>
            <h1>
              <Link to={`/${current}/showers/${next.id}`}>{localizedName(next.names, current)}</Link>
            </h1>
            <Countdown target={next.peakUTC} />
          </div>
          <dl className="hero-stats">
            <div>
              <dt>{t("home.peak")}</dt>
              <dd>{formatDateTime(next.peakUTC, current)}</dd>
            </div>
            <div>
              <dt>{t("home.zhr")}</dt>
              <dd>{next.zhr}</dd>
            </div>
            <div>
              <dt>{t("home.moon")}</dt>
              <dd>
                <span className={`moon-badge ${moonTierKey(moonIlluminatedFraction(new Date(next.peakUTC)))}`}>
                  {t(`home.${moonTierKey(moonIlluminatedFraction(new Date(next.peakUTC)))}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("home.visible")}</dt>
              <dd>{localizedName(next.visibleFrom, current)}</dd>
            </div>
          </dl>
        </section>
      )}
      {!next && (
        <section className="card">
          <p className="muted">{t("home.noUpcoming")}</p>
        </section>
      )}
      {upcoming7.length > 0 && (
        <section className="card">
          <h2>{t("home.upcoming7")}</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("home.name")}</th>
                  <th>{t("home.peak")}</th>
                  <th>{t("home.zhr")}</th>
                  <th>{t("home.moon")}</th>
                  <th className="table-visible">{t("home.visible")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{upcoming7.map(renderRow)}</tbody>
            </table>
          </div>
        </section>
      )}
      {upcoming30.length > 0 && (
        <section className="card">
          <h2>{t("home.upcoming30")}</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("home.name")}</th>
                  <th>{t("home.peak")}</th>
                  <th>{t("home.zhr")}</th>
                  <th>{t("home.moon")}</th>
                  <th className="table-visible">{t("home.visible")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{upcoming30.map(renderRow)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
