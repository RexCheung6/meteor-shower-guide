import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadFavorites, toggleFavorite, type Favorites } from "../lib/favorites";

export default function FavoriteButton({ type, id }: { type: keyof Favorites; id: string }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(() => loadFavorites()[type].includes(id));

  useEffect(() => {
    const sync = () => setActive(loadFavorites()[type].includes(id));
    window.addEventListener("mss:favorites-changed", sync);
    return () => window.removeEventListener("mss:favorites-changed", sync);
  }, [id, type]);

  return (
    <button
      type="button"
      className={`favorite-button ${active ? "active" : ""}`}
      aria-pressed={active}
      onClick={() => setActive(toggleFavorite(type, id)[type].includes(id))}
    >
      <span aria-hidden="true">{active ? "★" : "☆"}</span> {active ? t("common.removeFavorite") : t("common.addFavorite")}
    </button>
  );
}

