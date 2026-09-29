/**
 * The catalogue the app ships.
 *
 * One import for everything that needs "all the references": the shell, and
 * the tests that need realistic data to render against. Switching from the
 * placeholder illustrations to the curated catalogue is a change to this file
 * and nothing else -
 *
 *     export { CATALOG as CATALOGUE } from "./catalog.generated";
 *
 * - which is deliberate. Nothing downstream should name `references.ts` or
 * `catalog.generated.ts`, so nothing downstream has to change on the day.
 *
 * Still the placeholders, because the curated catalogue has not yet reached
 * the coverage floor in scripts/catalog/coverage.ts. Switching before it does
 * would leave most of the app's filters empty.
 */

export { REFERENCES as CATALOGUE } from "./references";
