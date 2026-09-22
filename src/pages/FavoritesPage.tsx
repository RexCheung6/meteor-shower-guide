import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import darkSitesData from "../data/dark-sites.json";
import type { DarkSite, Shower } from "../types";
import { localizedName, type Locale } from "../lib/locale";
import { loadFavorites, type Favorites } from "../lib/favorites";
import FavoriteButton from "../components/FavoriteButton";

const showers = showersData as Shower[];
const sites = darkSitesData as DarkSite[];

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const [favorites, setFavorites] = useState<Favorites>(loadFavorites);

  useEffect(() => {
    const sync = () => setFavorites(loadFavorites());
    window.addEventListener("mss:favorites-changed", sync);
    return () => window.removeEventListener("mss:favorites-changed", sync);
  }, []);

  const favoriteShowers = useMemo(() => showers.filter((shower) => favorites.showers.includes(shower.id)), [favorites.showers]);
  const favoriteSites = useMemo(() => sites.filter((site) => favorites.sites.includes(site.id)), [favorites.sites]);

  return (
    <div className="page">
      <section className="card">
        <h1>{t("favorites.title")}</h1>
        <p className="muted">{t("favorites.subtitle")}</p>
      </section>
      <section className="card">
        <h2>{t("favorites.showers")}</h2>
        {favoriteShowers.length === 0 ? <p className="muted">{t("favorites.emptyShowers")}</p> : (
          <div className="favorite-list">
            {favoriteShowers.map((shower) => (
              <div className="favorite-list-item" key={shower.id}>
                <Link to={`/${current}/showers/${shower.id}`}>{localizedName(shower.names, current)}</Link>
                <FavoriteButton type="showers" id={shower.id} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <h2>{t("favorites.sites")}</h2>
        {favoriteSites.length === 0 ? <p className="muted">{t("favorites.emptySites")}</p> : (
          <div className="favorite-list">
            {favoriteSites.map((site) => (
              <div className="favorite-list-item" key={site.id}>
                <span>{localizedName(site.names, current)} <small className="muted">· Bortle {site.bortleClass}</small></span>
                <FavoriteButton type="sites" id={site.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

