import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CITIES } from "../data/cities";
import darkSitesData from "../data/dark-sites.json";
import type { City, DarkSite } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import { bortleFactor } from "../lib/visibility";
import {
  bortleBandKey,
  climateKeyFor,
  difficultyOf,
  hemisphereOf,
  isGbaLocation,
  latBandKey,
  nearestDarkSites,
  topDarkSites
} from "../lib/cityAdvice";
import { useLocation } from "../context/LocationContext";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";

const darkSites = darkSitesData as DarkSite[];

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TipsPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const navigate = useNavigate();
  const { location, setLocation } = useLocation();
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);

  const selectOptions = useMemo<SelectOption[]>(
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

  const currentKey = useMemo(() => {
    const city = CITIES.find((c) => c.lat === location.lat && c.lng === location.lng);
    if (city) return `city:${city.id}`;
    const site = darkSites.find((s) => s.lat === location.lat && s.lng === location.lng);
    if (site) return `site:${site.id}`;
    return "";
  }, [location]);

  const guide = useMemo(() => {
    const bortle = Math.max(1, Math.min(9, Math.round(location.bortleClass)));
    const climateKey = climateKeyFor(location);
    return {
      bortle,
      bortleBand: bortleBandKey(bortle),
      factorPercent: Math.round(bortleFactor(bortle) * 100),
      hemisphere: hemisphereOf(location.lat),
      latBand: latBandKey(location.lat),
      climateKey,
      isGba: isGbaLocation(location),
      difficulty: difficultyOf(location, climateKey)
    };
  }, [location]);

  const citySites = useMemo(() => nearestDarkSites(location, darkSites, 4, 60), [location]);
  const regionalSites = useMemo(
    () => nearestDarkSites(location, darkSites, 6, 400).filter((item) => item.distanceKm > 60).slice(0, 4),
    [location]
  );
  const longHaul = useMemo(() => topDarkSites(location, darkSites, 3), [location]);

  const geolocate = () => {
    if (!navigator.geolocation) {
      setLocateFailed(true);
      return;
    }
    setLocating(true);
    setLocateFailed(false);
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
        setLocateFailed(true);
      },
      { timeout: 10000 }
    );
  };

  const chooseOption = (key: string) => {
    const [type, id] = key.split(":");
    if (type === "city") {
      const c = CITIES.find((city) => city.id === id);
      if (c) setLocation({ lat: c.lat, lng: c.lng, name: c.names, bortleClass: c.bortleClass, region: c.region });
    } else if (type === "site") {
      const s = darkSites.find((site) => site.id === id);
      if (s) setLocation({ lat: s.lat, lng: s.lng, name: s.names, bortleClass: s.bortleClass, region: s.region });
    }
  };

  const renderSiteCard = (site: DarkSite, distanceKm: number, longHaul: boolean) => (
    <div className="site-card" key={site.id}>
      <div className="site-card-head">
        <h3>{localizedName(site.names, current)}</h3>
        {longHaul ? <span className="bortle-badge long-haul-badge">{t("tips.longHaul")}</span> : <span className="bortle-badge">Bortle {site.bortleClass}</span>}
      </div>
      <p className="muted">
        {t("tips.distanceKm", { km: distanceKm })} · {localizedName(site.region, current)}
      </p>
      <p>{localizedName(site.tips, current)}</p>
      <div className="site-actions">
        <button
          type="button"
          className="btn-small"
          onClick={() =>
            navigate(
              `/${current}/weather?lat=${site.lat}&lng=${site.lng}&name=${encodeURIComponent(localizedName(site.names, current))}`
            )
          }
        >
          {t("shower.viewWeather")}
        </button>
        <button type="button" className="btn-small" onClick={() => navigate(`/${current}/map?site=${site.id}`)}>
          {t("shower.viewOnMap")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <section className="card">
        <h1>{t("tips.title")}</h1>
        <p className="muted">{t("tips.subtitle")}</p>
      </section>

      <section className="card">
        <h2>{t("tips.selectCity")}</h2>
        <div className="location-picker">
          <SearchableSelect
            options={selectOptions}
            value={currentKey}
            onChange={chooseOption}
            placeholder={localizedName(location.name, current)}
            searchPlaceholder={t("weather.searchCity")}
            emptyLabel={t("weather.noMatch")}
          />
          <button type="button" className="btn-small" onClick={geolocate} disabled={locating}>
            {locating ? t("weather.locating") : t("shower.useMyLocation")}
          </button>
        </div>
        {locateFailed && <p className="muted">{t("shower.locateFailed")}</p>}
      </section>

      <section className="card">
        <h2>{t("tips.cityGuideTitle", { city: localizedName(location.name, current) })}</h2>
        <p className="muted">{t("tips.cityGuideSub")}</p>
        <div className="city-guide">
          <div className="guide-item">
            <span className="bortle-badge">{t("tips.bortleTitle", { bortle: guide.bortle })}</span>
            <p>{t(`tips.bortle${capital(guide.bortleBand)}`)}</p>
            <p className="muted">{t("tips.rateNote", { percent: guide.factorPercent })}</p>
          </div>
          <div className="guide-item">
            <h3>{t("tips.difficultyTitle")}</h3>
            <span className={`difficulty-badge difficulty-${guide.difficulty.level}`}>
              {t(`tips.difficulty.${guide.difficulty.level}`)}
            </span>
            <p>{t(`tips.difficultyDesc.${guide.difficulty.level}`)}</p>
            <div className="difficulty-bar" aria-label={`${guide.difficulty.score}/100`}>
              <div className="difficulty-fill" style={{ width: `${guide.difficulty.score}%` }} />
            </div>
          </div>
          <ul className="tips-list">
            <li>{t(`tips.hemisphere${capital(guide.hemisphere)}`)}</li>
            <li>{t(`tips.latBand${capital(guide.latBand)}`)}</li>
            {guide.climateKey && (
              <li>
                <strong>{t("tips.climateNote")}：</strong>
                {t(guide.climateKey)}
              </li>
            )}
          </ul>
          {guide.isGba && (
            <div className="gba-block">
              <h3>{t("tips.gba")}</h3>
              <ul className="tips-list">
                {(t("tips.gbaAdvice", { returnObjects: true }) as unknown as string[]).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>{t("tips.citySitesTitle")}</h2>
        <p className="muted">{t("tips.citySitesSub")}</p>
        {citySites.length > 0 ? (
          <div className="site-grid">{citySites.map(({ site, distanceKm }) => renderSiteCard(site, distanceKm, false))}</div>
        ) : (
          <p className="muted">{t("tips.noCitySites")}</p>
        )}
        <h2 className="section-sub">{t("tips.regionalSitesTitle")}</h2>
        {regionalSites.length > 0 ? (
          <div className="site-grid">{regionalSites.map(({ site, distanceKm }) => renderSiteCard(site, distanceKm, false))}</div>
        ) : (
          <>
            <p className="muted">{t("tips.noRegionalSites")}</p>
            <div className="site-grid">{longHaul.map(({ site, distanceKm }) => renderSiteCard(site, distanceKm, true))}</div>
          </>
        )}
      </section>

      <section className="card">
        <h2>{t("tips.urban")}</h2>
        <ol className="tips-list">
          {(t("tips.urbanTips", { returnObjects: true }) as unknown as string[]).map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>{t("tips.lightPollution")}</h2>
        <p className="muted">{t("tips.bortleNote")}</p>
      </section>

      <section className="card">
        <h2>{t("tips.basics")}</h2>
        <ul className="tips-list">
          {(t("tips.basicsItems", { returnObjects: true }) as unknown as string[]).map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
