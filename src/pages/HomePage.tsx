import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import Countdown from "../components/Countdown";
import { formatDateTime, moonIlluminatedFraction } from "../lib/astro";
import type { Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import ObservationScoreCard from "../components/ObservationScoreCard";
import { CITIES } from "../data/cities";
import darkSitesData from "../data/dark-sites.json";
import type { City, DarkSite } from "../types";
import { useLocation } from "../context/LocationContext";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";
import StarfieldCanvas from "../components/StarfieldCanvas";

const DAY_MS = 86400000;
const showers = showersData as Shower[];
const darkSites = darkSitesData as DarkSite[];

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
  const { location, setLocation } = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const [selectKey, setSelectKey] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const functionalAreaRef = useRef<HTMLElement>(null);

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

  const locationOptions = useMemo<SelectOption[]>(
    () => [
      ...CITIES.map((city: City) => ({
        key: `city:${city.id}`,
        label: `${localizedName(city.names, current)} · ${localizedName(city.region, current)}`,
        searchText: `${city.names.zh} ${city.names.en} ${city.region.zh} ${city.region.en}`
      })),
      ...darkSites.map((site) => ({
        key: `site:${site.id}`,
        label: `${localizedName(site.names, current)} (Bortle ${site.bortleClass})`,
        searchText: `${site.names.zh} ${site.names.en} ${site.region.zh} ${site.region.en}`
      }))
    ],
    [current]
  );

  const geolocate = () => {
    if (!navigator.geolocation) {
      setLocateFailed(true);
      return;
    }
    setLocating(true);
    setLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, name: { zh: "我的位置", en: "My location" }, bortleClass: 8 });
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

  const startObserving = () => {
    functionalAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      <section className="hero starfield-hero">
        <StarfieldCanvas />
        <div className="hero-content">
          <p className="hero-eyebrow">{t("common.appName")}</p>
          <h1 className="hero-title">{t("home.heroTitle")}</h1>
          <p className="hero-subtitle">{t("home.heroSubtitle")}</p>
          <button type="button" className="hero-cta" onClick={startObserving}>
            {t("home.startObserving")}
            <span aria-hidden="true">↓</span>
          </button>
          <p className="hero-hint">{t("home.heroHint")}</p>
        </div>
      </section>
      <section ref={functionalAreaRef} id="home-functional-area" className="home-functional-area" aria-labelledby="home-functional-title">
        <div className="functional-area-heading">
          <p className="hero-eyebrow">{t("home.functionalEyebrow")}</p>
          <h2 id="home-functional-title">{t("home.functionalTitle")}</h2>
        </div>
      <section className="home-location card">
        <div>
          <h2>{t("home.locationTitle")}</h2>
          <p className="muted">{t("home.locationSubtitle")}</p>
        </div>
        <div className="location-picker">
          <SearchableSelect
            options={locationOptions}
            value={selectKey}
            onChange={(key) => {
              setSelectKey(key);
              const [type, id] = key.split(":");
              if (type === "city") {
                const city = CITIES.find((item) => item.id === id);
                if (city) setLocation({ lat: city.lat, lng: city.lng, name: city.names, bortleClass: city.bortleClass, region: city.region });
              } else if (type === "site") {
                const site = darkSites.find((item) => item.id === id);
                if (site) setLocation({ lat: site.lat, lng: site.lng, name: site.names, bortleClass: site.bortleClass, region: site.region });
              }
            }}
            placeholder={localizedName(location.name, current)}
            searchPlaceholder={t("home.locationSearch")}
            emptyLabel={t("home.locationNoMatch")}
          />
          <button type="button" className="btn-small" onClick={geolocate} disabled={locating}>
            {locating ? t("home.locationLocating") : t("home.locationUseCurrent")}
          </button>
        </div>
        {locateFailed && <p className="muted location-error">{t("home.locationFailed")}</p>}
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
      <ObservationScoreCard />
      <div className="home-shortcuts">
        <Link className="btn-small" to={`/${current}/favorites`}>{t("common.viewFavorites")}</Link>
        <Link className="btn-small" to={`/${current}/observe`}>{t("observationMode.open")}</Link>
        <Link className="btn-small" to={`/${current}/compare`}>{t("compare.open")}</Link>
        <Link className="btn-small" to={`/${current}/log`}>{t("common.log")}</Link>
      </div>
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
      </section>
    </div>
  );
}
