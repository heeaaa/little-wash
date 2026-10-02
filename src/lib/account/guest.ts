/**
 * This browser's own lists, as the account service sees them: something to
 * read on first sign-in, move into the account, and empty - and to put back,
 * if the session ends before the account has confirmed them.
 */

import { loadFavorites, replaceFavorites } from "@/lib/favorites";
import { loadPainted, replacePainted } from "@/lib/painted";
import { clearSeenLeaves } from "@/lib/leavesSeen";
import type { GuestLibrary } from "./record";

export interface GuestStore {
  read(): GuestLibrary;
  /** Empty the lists, once their pieces are safely in the account's record. */
  clear(): void;
  /** Put pieces back into the lists: they never reached the account. */
  restore(library: GuestLibrary): void;
  /** Forget which painted-tree leaves were seen: they named the account's pieces. */
  forgetSeenLeaves(): void;
}

export const browserGuestStore: GuestStore = {
  read: () => ({ saved: loadFavorites(), painted: loadPainted() }),
  clear: () => {
    replaceFavorites([]);
    replacePainted([]);
  },
  restore: (library) => {
    // Whatever this browser gained since, plus what it had before.
    const saved = [...library.saved, ...loadFavorites().filter((id) => !library.saved.includes(id))];
    const painted = [
      ...library.painted,
      ...loadPainted().filter((entry) => !library.painted.some((kept) => kept.id === entry.id)),
    ];
    replaceFavorites(saved);
    replacePainted(painted);
  },
  forgetSeenLeaves: clearSeenLeaves,
};
