import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import darkSitesData from "../data/dark-sites.json";
import { CITIES } from "../data/cities";
import { bestObservingWindow, formatDateTime, nightRateSeries } from "../lib/astro";
import type { DarkSite, Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import { climateKeyFor, hemisphereOf, isGbaLocation, latBandKey, nearestDarkSites, topDarkSites } from "../lib/cityAdvice";
import { useLocation } from "../context/LocationContext";
import RateChart from "../components/RateChart";
import SearchableSelect from "../components/SearchableSelect";
import FavoriteButton from "../components/FavoriteButton";
import { downloadICS } from "../lib/calendar";

const MeteorMap = lazy(() => import("../components/MeteorMap"));
const showers = showersData as Shower[];
const darkSites = darkSitesData as DarkSite[];

function tierClass(tier: string): string {
  return `tier tier-${tier}`;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ShowerDetailPage() {
  const { t } = useTranslation();
  const { locale, id } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const navigate = useNavigate();
  const shower = showers.find((s) => s.id === id);
  const { location, setLocation } = useLocation();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const siteOptions = useMemo(() => {
    const gbaSites = darkSites.filter((s) => s.region.zh.includes("粤港澳") || s.region.zh.includes("香港"));
    return [
      ...CITIES.map((c) => ({ key: `city:${c.id}`, label: `${localizedName(c.names, current)} (Bortle ${c.bortleClass})`, value: c })),
      ...gbaSites.map((s) => ({ key: `site:${s.id}`, label: `${localizedName(s.names, current)} (Bortle ${s.bortleClass})`, value: s }))
    ];
  }, [current]);

  const selectOptions = useMemo(
    () =>
      siteOptions.map((o) => ({
        key: o.key,
        label: o.label,
        searchText: `${o.value.names.zh} ${o.value.names.en} ${o.value.region.zh} ${o.value.region.en} ${o.key}`
      })),
    [siteOptions]
  );

  const visibility = useMemo(() => {
    if (!shower) return null;
    return bestObservingWindow(shower, location.lat, location.lng, { bortle: location.bortleClass });
  }, [shower, location]);

  const bestNightDate = useMemo(() => {
    if (!visibility?.best) return null;
    const parts = visibility.best.nightLabel.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [visibility]);

  const rateSeries = useMemo(() => {
    if (!shower || !bestNightDate) return [];
    return nightRateSeries(shower, location.lat, location.lng, bestNightDate, location.bortleClass);
  }, [shower, bestNightDate, location]);

  if (!shower) {
    return (
      <div className="page">
        <div className="card center">
          <p>{t("common.notFound")}</p>
          <Link className="btn-primary" to={`/${current}`}>
            {t("common.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const mapTime = visibility?.best ? new Date(visibility.best.bestTime) : new Date(shower.peakUTC);
  const mapSites = darkSites.filter((s) => s.showerIds.includes(shower.id) || s.showerIds.includes("all") || s.showerIds.length === 0);
  const globalSites = mapSites.filter((s) => !s.region.zh.includes("粤港澳") && !s.region.zh.includes("香港"));
  const citySites = nearestDarkSites(location, darkSites, 4, 60);
  const regionalSites = nearestDarkSites(location, darkSites, 6, 400).filter((item) => item.distanceKm > 60).slice(0, 4);
  const longHaul = topDarkSites(location, darkSites, 3);
  const currentKey = siteOptions.find((o) => o.value.lat === location.lat && o.value.lng === location.lng)?.key ?? "";

  const geolocate = () => {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: { zh: "我的位置", en: "My location" },
          bortleClass: 8
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
      { timeout: 10000 }
    );
  };

  const renderSiteCard = (site: DarkSite) => (
    <div className="site-card" key={site.id}>
      <div className="site-card-head">
        <h3>{localizedName(site.names, current)}</h3>
        <div className="site-card-badges"><span className="bortle-badge">Bortle {site.bortleClass}</span><FavoriteButton type="sites" id={site.id} /></div>
      </div>
      <p className="muted">{localizedName(site.region, current)}</p>
      <p>{localizedName(site.tips, current)}</p>
      <div className="site-actions">
        <button
          type="button"
          className="btn-small"
          onClick={() => navigate(`/${current}/weather?lat=${site.lat}&lng=${site.lng}&name=${encodeURIComponent(localizedName(site.names, current))}`)}
        >
          {t("shower.viewWeather")}
        </button>
        <button type="button" className="btn-small" onClick={() => navigate(`/${current}/map?shower=${shower.id}&site=${site.id}`)}>
          {t("shower.viewOnMap")}
        </button>
      </div>
    </div>
  );

  const renderNearbyCard = (site: DarkSite, distanceKm: number, longHaul: boolean) => (
    <div className="site-card" key={site.id}>
      <div className="site-card-head">
        <h3>{localizedName(site.names, current)}</h3>
        <div className="site-card-badges">{longHaul ? <span className="bortle-badge long-haul-badge">{t("tips.longHaul")}</span> : <span className="bortle-badge">Bortle {site.bortleClass}</span>}<FavoriteButton type="sites" id={site.id} /></div>
      </div>
      <p className="muted">
        {t("tips.distanceKm", { km: distanceKm })} · {localizedName(site.region, current)}
      </p>
      <p>{localizedName(site.tips, current)}</p>
      <div className="site-actions">
        <button
          type="button"
          className="btn-small"
          onClick={() => navigate(`/${current}/weather?lat=${site.lat}&lng=${site.lng}&name=${encodeURIComponent(localizedName(site.names, current))}`)}
        >
          {t("shower.viewWeather")}
        </button>
        <button type="button" className="btn-small" onClick={() => navigate(`/${current}/map?shower=${shower.id}&site=${site.id}`)}>
          {t("shower.viewOnMap")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <section className="card">
        <p className="hero-eyebrow">{t("shower.meteorShower")}</p>
        <div className="detail-title-row">
          <h1>{localizedName(shower.names, current)}</h1>
          <div className="detail-actions">
            <FavoriteButton type="showers" id={shower.id} />
            <button type="button" className="btn-small" onClick={() => downloadICS({
              title: `${localizedName(shower.names, current)} ${t("calendar.eventSuffix")}`,
              start: new Date(shower.peakUTC),
              description: `${t("calendar.description")} ${localizedName(location.name, current)}`
            })}>{t("calendar.addToCalendar")}</button>
            <button type="button" className="btn-primary" onClick={() => navigate(`/${current}/observe?shower=${shower.id}`)}>{t("observationMode.open")}</button>
          </div>
        </div>
        <p className="muted">
          {t("shower.constellation")}: {visibility?.constellation ?? "—"}
        </p>
        <dl className="info-grid">
          <div>
            <dt>{t("shower.activePeriod")}</dt>
            <dd>
              {shower.activeStart} – {shower.activeEnd}
            </dd>
          </div>
          <div>
            <dt>{t("shower.peakUtc")}</dt>
            <dd>{formatDateTime(shower.peakUTC, current, "UTC")} (UTC)</dd>
          </div>
          <div>
            <dt>{t("shower.peakLocal")}</dt>
            <dd>{formatDateTime(shower.peakUTC, current)}</dd>
          </div>
          <div>
            <dt>{t("shower.zhr")}</dt>
            <dd>{shower.zhr}</dd>
          </div>
          <div>
            <dt>{t("shower.radiant")}</dt>
            <dd>
              α {shower.radiant.ra}° · δ {shower.radiant.dec > 0 ? "+" : ""}
              {shower.radiant.dec}°
            </dd>
          </div>
          <div>
            <dt>{t("shower.parent")}</dt>
            <dd>{localizedName(shower.parent, current)}</dd>
          </div>
          <div>
            <dt>{t("shower.visibleFrom")}</dt>
            <dd>{localizedName(shower.visibleFrom, current)}</dd>
          </div>
          <div className="span-2">
            <dt>{t("shower.notes")}</dt>
            <dd>{localizedName(shower.notes, current)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>{t("shower.location")}</h2>
        <div className="location-picker">
          <SearchableSelect
            options={selectOptions}
            value={currentKey}
            onChange={(key) => {
              const opt = siteOptions.find((o) => o.key === key);
              if (opt) setLocation({ lat: opt.value.lat, lng: opt.value.lng, name: opt.value.names, bortleClass: opt.value.bortleClass, region: opt.value.region });
            }}
            placeholder={localizedName(location.name, current)}
            searchPlaceholder={t("shower.searchCity")}
            emptyLabel={t("shower.noMatch")}
          />
          <button type="button" className="btn-small" onClick={geolocate} disabled={locating}>
            {locating ? t("shower.locating") : t("shower.useMyLocation")}
          </button>
        </div>
        {locateError && <p className="muted">{t("shower.locateFailed")}</p>}
      </section>

      <section className="card">
        <h2>{t("shower.bestWindow")}</h2>
        {visibility?.best ? (
          <div className="window-summary">
            <div className="window-main">
              <span className={tierClass(visibility.best.tier)}>{t(`shower.tier${capital(visibility.best.tier)}`)}</span>
              <p className="window-label">
                {t("shower.bestTime")}: <strong>{formatDateTime(visibility.best.bestTime, current)}</strong>
              </p>
              <p className="window-label">
                {t("shower.radiantAlt")}: <strong>{visibility.best.bestRadiantAlt}°</strong>
              </p>
              <p className="window-label">
                {t("shower.expectedRate")}: <strong>{visibility.best.bestRate}</strong> {t("shower.perHour")}
              </p>
              <p className="window-label">
                {t("shower.moonAtBest")}: {Math.round(visibility.best.moonIllumFraction * 100)}% ·{" "}
                {visibility.best.moonUp ? t("shower.moonDown") : t("shower.moonUp")}
              </p>
            </div>
            <div className="table-scroll">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>{t("shower.perNight")}</th>
                    <th>{t("shower.bestTime")}</th>
                    <th>{t("shower.radiantAlt")}</th>
                    <th>{t("shower.expectedRate")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibility.windows.map((w) => (
                    <tr key={w.nightLabel} className={w.nightLabel === visibility.best?.nightLabel ? "row-best" : ""}>
                      <td>{w.nightLabel}</td>
                      <td>{formatDateTime(w.bestTime, current)}</td>
                      <td>{w.bestRadiantAlt}°</td>
                      <td>{w.bestRate}</td>
                      <td>
                        <span className={tierClass(w.tier)}>{t(`shower.tier${capital(w.tier)}`)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rateSeries.length > 0 && (
              <div className="chart-block">
                <h3>{t("shower.hourlyChart")}</h3>
                <RateChart points={rateSeries} />
              </div>
            )}
          </div>
        ) : (
          <p className="muted">
            {t("shower.bestWindowNone")}（{t("shower.radiantAlt")}: {visibility?.radiantAltAtPeak ?? "—"}° · {t("shower.moonIllum")}:{" "}
            {Math.round((visibility?.moonIllumAtPeak ?? 0) * 100)}%）
          </p>
        )}
      </section>

      <section className="card">
        <h2>{t("map.title")}</h2>
        <Suspense fallback={<div className="map-loading">{t("common.loading")}</div>}>
          <MeteorMap shower={shower} time={mapTime} sites={mapSites} showLightPollution={false} locale={current} />
        </Suspense>
      </section>

      <section className="card">
        <h2>{t("shower.bestSites")}</h2>
        {globalSites.length === 0 ? <p className="muted">{t("shower.noSites")}</p> : <div className="site-grid">{globalSites.map(renderSiteCard)}</div>}
      </section>

      <section className="card">
        <h2>{t("tips.citySitesTitle")}</h2>
        <p className="muted">{t("tips.citySitesSub")}</p>
        {citySites.length > 0 ? (
          <div className="site-grid">{citySites.map(({ site, distanceKm }) => renderNearbyCard(site, distanceKm, false))}</div>
        ) : (
          <p className="muted">{t("tips.noCitySites")}</p>
        )}
        <h2 className="section-sub">{t("tips.regionalSitesTitle")}</h2>
        {regionalSites.length > 0 ? (
          <div className="site-grid">{regionalSites.map(({ site, distanceKm }) => renderNearbyCard(site, distanceKm, false))}</div>
        ) : (
          <>
            <p className="muted">{t("tips.noRegionalSites")}</p>
            <div className="site-grid">{longHaul.map(({ site, distanceKm }) => renderNearbyCard(site, distanceKm, true))}</div>
          </>
        )}
      </section>

      <section className="card">
        <h2>{t("shower.localAdvice")}</h2>
        <ul className="tips-list">
          <li>{t(`tips.hemisphere${capital(hemisphereOf(location.lat))}`)}</li>
          <li>{t(`tips.latBand${capital(latBandKey(location.lat))}`)}</li>
          {climateKeyFor(location) && <li>{t(climateKeyFor(location)!)}</li>}
          {isGbaLocation(location) &&
            (t("tips.gbaAdvice", { returnObjects: true }) as unknown as string[]).map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </section>
    </div>
  );
}
