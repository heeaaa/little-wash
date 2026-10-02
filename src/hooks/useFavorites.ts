import { useCallback, useEffect, useState } from "react";
import {
  isSaved as isSavedIn,
  loadFavorites,
  onFavoritesReplaced,
  persistFavorites,
  toggleFavorite,
} from "@/lib/favorites";

export interface FavoritesApi {
  favorites: string[];
  isSaved: (id: string) => boolean;
  toggleSave: (id: string) => void;
}

/** Local-first favourites: in-memory state mirrored to localStorage. */
export function useFavorites(): FavoritesApi {
  // Lazy init so storage is read once, not on every render.
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  // Replaced from outside: signing in moves this browser's pieces into the
  // account, a session that ends before they arrive puts them back, another
  // tab changes them. The in-memory copy follows storage each time.
  useEffect(() => onFavoritesReplaced(() => setFavorites(loadFavorites())), []);

  const toggleSave = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = toggleFavorite(prev, id);
      persistFavorites(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => isSavedIn(favorites, id), [favorites]);

  return { favorites, isSaved, toggleSave };
}
