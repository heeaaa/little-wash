/**
 * Which sources a painter wants ideas drawn from.
 *
 * Deliberately not a filter. Time, difficulty and subject live in the URL and
 * are things you change while looking for today's piece; this is a standing
 * preference about what the catalogue is made of, set once on `#/sources`. It
 * shapes the catalogue before filtering, so none of the URL-param plumbing in
 * AppContext has to know about it.
 *
 * Same local-first shape as favorites.ts: versioned key, safe wrapper,
 * degrades to in-memory when storage is unavailable.
 */

import { SOURCES, SOURCE_ORDER } from "@/lib/sources/registry";
import type { SourceId } from "@/lib/sources/types";

const STORAGE_KEY = "little-wash:sources:v1";

/**
 * Disabled ids are stored, not enabled ones.
 *
 * Storing the enabled set would mean every provider added after a painter
 * first opened the app arrived switched off for them, and silently: they would
 * never see the new work. Storing what was turned off makes "on" the default
 * that new sources inherit.
 */
export interface SourcePrefsState {
  disabled: SourceId[];
}

function isSourceId(value: unknown): value is SourceId {
  return typeof value === "string" && value in SOURCES;
}

function readStorage(): SourcePrefsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { disabled: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as SourcePrefsState).disabled)
    ) {
      // Drop ids we no longer recognise: a retired provider must not keep
      // disabling something, and must not crash the screen either.
      return { disabled: (parsed as SourcePrefsState).disabled.filter(isSourceId) };
    }
    return { disabled: [] };
  } catch {
    return { disabled: [] };
  }
}

function writeStorage(state: SourcePrefsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; in-memory state (held by the hook) still works.
  }
}

export function loadDisabledSources(): SourceId[] {
  return readStorage().disabled;
}

export function isSourceEnabled(
  disabled: readonly SourceId[],
  id: SourceId,
): boolean {
  return !disabled.includes(id);
}

/** Return the next disabled list with `id` flipped. Pure; caller persists. */
export function toggleSource(
  disabled: readonly SourceId[],
  id: SourceId,
): SourceId[] {
  return disabled.includes(id)
    ? disabled.filter((x) => x !== id)
    : [...disabled, id];
}

export function persistDisabledSources(disabled: readonly SourceId[]): void {
  writeStorage({ disabled: [...disabled] });
}

/** Enabled sources in the registry's display order. */
export function enabledSources(disabled: readonly SourceId[]): SourceId[] {
  return SOURCE_ORDER.filter((id) => isSourceEnabled(disabled, id));
}
