/**
 * The harvest plan: what to go and look for, by subject.
 *
 * Exists because the first session harvested one themed collection and ended
 * up with a catalogue that was entirely fruit and entirely over 10 minutes.
 * Coverage has to be planned; it does not fall out of whatever a single search
 * returns.
 */

import { readFileSync } from "node:fs";
import type { Subject } from "../../src/lib/types.ts";
import type { Candidate } from "./types.ts";

export interface PlannedQuery {
  query: string;
  orientation?: string;
  /** Museum department to search within; see HarvestQuery. */
  department?: number;
}

export interface SubjectPlan {
  target: number;
  queries: PlannedQuery[];
}

export interface HarvestPlan {
  target: number;
  subjects: Record<string, SubjectPlan>;
}

export const SUBJECTS: readonly Subject[] = [
  "fruit",
  "botanical",
  "still-life",
  "creatures",
  "landscape",
  "objects",
];

export function loadPlan(path = "catalog/harvest-plan.json"): HarvestPlan {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as HarvestPlan & {
    subjects: Record<string, SubjectPlan & { _note?: string }>;
  };

  const subjects: Record<string, SubjectPlan> = {};
  for (const [name, plan] of Object.entries(raw.subjects)) {
    if (name.startsWith("_")) continue;
    subjects[name] = { target: plan.target, queries: plan.queries };
  }

  return { target: raw.target, subjects };
}

/** Every query in the plan, tagged with the subject it is meant to fill. */
export function plannedQueries(
  plan: HarvestPlan,
  only?: string,
): Array<PlannedQuery & { subject: string }> {
  return Object.entries(plan.subjects)
    .filter(([subject]) => !only || subject === only)
    .flatMap(([subject, sp]) => sp.queries.map((q) => ({ ...q, subject })));
}

/**
 * Merge a planned harvest into the queue already on disk.
 *
 * Harvesting one subject used to overwrite the whole candidates file, wiping
 * every other subject - and the candidates recorded proposals refer to.
 * Anything harvested again is refreshed in place; everything else is kept.
 */
export function mergeCandidates(
  existing: readonly Candidate[],
  fresh: readonly Candidate[],
): Candidate[] {
  const key = (c: Candidate) => `${c.sourceId}:${c.externalId}`;
  const incoming = new Map<string, Candidate>();
  for (const c of fresh) if (!incoming.has(key(c))) incoming.set(key(c), c);

  const merged = existing.map((c) => {
    const refreshed = incoming.get(key(c));
    if (refreshed) incoming.delete(key(c));
    return refreshed ?? c;
  });
  return [...merged, ...incoming.values()];
}
