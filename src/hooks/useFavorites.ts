import { useCallback, useState } from "react";
import {
  isSaved as isSavedIn,
  loadFavorites,
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
