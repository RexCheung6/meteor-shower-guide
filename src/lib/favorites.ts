export interface Favorites {
  showers: string[];
  sites: string[];
}

const KEY = "mss.favorites";

export function loadFavorites(): Favorites {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Favorites>;
    return {
      showers: Array.isArray(parsed.showers) ? parsed.showers.filter((id): id is string => typeof id === "string") : [],
      sites: Array.isArray(parsed.sites) ? parsed.sites.filter((id): id is string => typeof id === "string") : []
    };
  } catch {
    return { showers: [], sites: [] };
  }
}

export function saveFavorites(favorites: Favorites): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent("mss:favorites-changed"));
  } catch {
    // Storage may be unavailable; keep the UI usable.
  }
}

export function toggleFavorite(type: keyof Favorites, id: string): Favorites {
  const favorites = loadFavorites();
  favorites[type] = favorites[type].includes(id) ? favorites[type].filter((item) => item !== id) : [...favorites[type], id];
  saveFavorites(favorites);
  return favorites;
}

