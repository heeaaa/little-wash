import { flushSync } from "react-dom";

/**
 * The motion logic of the app, in one place.
 *
 * One rule: the paper is never cut, only moved or re-wet.
 *
 * - **Move** - a navigation. The artwork keeps its identity across routes and
 *   the browser morphs its geometry. Driven by the router's own View Transition
 *   support; this module only names the element.
 * - **Re-wet** - the piece itself is replaced (a deal, or a filter that changes
 *   what is featured). The outgoing and incoming snapshots are pushed through
 *   the same animated turbulence, so one dissolves into the wet paper as the
 *   other resolves out of it.
 *
 * Both moments run on the same View Transitions machinery and the same timing
 * scale, so the app has one material story rather than two effects.
 */

/**
 * The shared name every "the piece you are looking at" element carries. Exactly
 * one element may hold it at a time, which is what lets Today, a Browse card,
 * Detail and the enlarged view all morph into one another.
 */
export const PIECE_ART = "piece-art";

/** Set on <html> for the duration of a re-wet so CSS can tell the moments apart. */
const WASH_ATTR = "data-wash";

/*
  Which re-wet is current. Two inside 520ms - two filter chips in a row, or a
  chip then a deal - make the browser skip the first transition, but its
  `finished` still settles. Without this the skipped one would strip the
  marker off <html> while the live one was mid-flight, and every
  `html[data-wash="rewet"]` rule would stop applying part way through.
*/
let washSeq = 0;

type Update = () => void;

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function supported(): boolean {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

/**
 * Re-seed and fire the turbulence so no two blooms are identical. Real paint
 * never repeats, and a transition that does is the thing that reads as canned.
 */
function beginBloom(): void {
  const turbulence = document.getElementById("wash-turbulence");
  if (turbulence) {
    turbulence.setAttribute("seed", String(Math.floor(Math.random() * 1000)));
  }
  const swell = document.getElementById("wash-swell") as
    | (SVGAnimationElement & { beginElement?: () => void })
    | null;
  swell?.beginElement?.();
}

/**
 * Replace the featured piece as a re-wet. Falls back to running `update`
 * directly wherever View Transitions are unavailable or motion is unwanted,
 * where the CSS `.piece-settle` default still carries the change.
 */
export function rewet(update: Update): void {
  if (!supported() || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  const seq = ++washSeq;
  root.setAttribute(WASH_ATTR, "rewet");
  beginBloom();
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished
    // A skipped transition rejects; that is ordinary here and must not surface
    // as an unhandled rejection.
    .catch(() => {})
    .finally(() => {
      if (seq === washSeq) root.removeAttribute(WASH_ATTR);
    });
}

/**
 * Move: the artwork changes place. A navigation, or a change of posture like
 * opening the enlarged view.
 *
 * `before` runs while the outgoing page is still on screen, for a surface that
 * must claim the shared name first; it has to write to the DOM directly, since
 * nothing gets to commit between it and the snapshot.
 *
 * `flushSync` is not optional: the browser snapshots the DOM the moment the
 * callback returns, and React would otherwise not have committed yet.
 */
export function move(update: Update, before?: Update): void {
  if (!supported() || prefersReducedMotion()) {
    update();
    return;
  }
  before?.();
  document.startViewTransition(() => flushSync(update));
}
