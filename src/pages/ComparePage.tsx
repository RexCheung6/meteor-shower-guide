import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import darkSitesData from "../data/dark-sites.json";
import type { DarkSite } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import { useLocation } from "../context/LocationContext";
import SearchableSelect, { type SelectOption } from "../components/SearchableSelect";
import FavoriteButton from "../components/FavoriteButton";

const sites = darkSitesData as DarkSite[];

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(x)));
}

export default function ComparePage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const { location } = useLocation();
  const [leftId, setLeftId] = useState(sites[0]?.id ?? "");
  const [rightId, setRightId] = useState(sites[1]?.id ?? sites[0]?.id ?? "");
  const options = useMemo<SelectOption[]>(() => sites.map((site) => ({
    key: site.id,
    label: `${localizedName(site.names, current)} · Bortle ${site.bortleClass}`,
    searchText: `${site.names.zh} ${site.names.en} ${site.region.zh} ${site.region.en}`
  })), [current]);
  const left = sites.find((site) => site.id === leftId) ?? sites[0];
  const right = sites.find((site) => site.id === rightId) ?? sites[1] ?? sites[0];
  if (!left || !right) return null;

  return (
    <div className="page">
      <section className="card">
        <h1>{t("compare.title")}</h1>
        <p className="muted">{t("compare.subtitle")}</p>
      </section>
      <section className="compare-grid">
        {[{ site: left, set: setLeftId }, { site: right, set: setRightId }].map(({ site, set }) => (
          <article className="card compare-card" key={site.id}>
            <SearchableSelect options={options} value={site.id} onChange={set} placeholder={localizedName(site.names, current)} searchPlaceholder={t("compare.search")} emptyLabel={t("compare.noMatch")} />
            <h2>{localizedName(site.names, current)}</h2>
            <p className="muted">{localizedName(site.region, current)}</p>
            <dl className="info-grid">
              <div><dt>{t("compare.bortle")}</dt><dd>{site.bortleClass}</dd></div>
              <div><dt>{t("compare.distance")}</dt><dd>{distanceKm(location.lat, location.lng, site.lat, site.lng)} km</dd></div>
              <div className="span-2"><dt>{t("compare.coordinates")}</dt><dd>{site.lat.toFixed(2)}, {site.lng.toFixed(2)}</dd></div>
            </dl>
            <p>{localizedName(site.tips, current)}</p>
            <FavoriteButton type="sites" id={site.id} />
          </article>
        ))}
      </section>
    </div>
  );
}

