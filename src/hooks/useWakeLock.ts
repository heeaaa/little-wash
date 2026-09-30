import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Keep screen on" for a phone propped beside a sketchbook.
 *
 * Built on the Screen Wake Lock API, which is a request, not a guarantee. The
 * browser may refuse it (battery saver, a hidden tab), and it always drops the
 * lock itself when the page is hidden. So the painter's wish is kept separately
 * from whether a lock is actually held: switching away to a timer and back
 * re-requests it.
 *
 * A refusal ends the wish. The switch then reads "off" with the reason beside
 * it, one tap asks again, and nothing is taken later behind a switch that says
 * it is off. The same goes for a lock the browser lets go of while the page is
 * still in front of the painter - that is a refusal in all but name.
 *
 * `active` is whether there is anything to keep on for - an open warm-up. The
 * lock is released the moment it becomes false, and when the screen unmounts,
 * whatever the switch says.
 */
export type WakeLockStatus = "unsupported" | "off" | "requesting" | "on" | "refused";

export interface WakeLockApi {
  status: WakeLockStatus;
  /** Whether the painter has asked for it, independent of the browser's answer. */
  wanted: boolean;
  toggle: () => void;
}

function wakeLockApi(): WakeLock | null {
  if (typeof navigator === "undefined") return null;
  return "wakeLock" in navigator && navigator.wakeLock ? navigator.wakeLock : null;
}

export function useWakeLock(active: boolean): WakeLockApi {
  const supported = wakeLockApi() !== null;
  const [wanted, setWanted] = useState(false);
  const [refused, setRefused] = useState(false);
  const [held, setHeld] = useState<"off" | "requesting" | "on">("off");
  const sentinel = useRef<WakeLockSentinel | null>(null);
  // Bumped on every release, so a request that resolves late cannot resurrect a lock.
  const generation = useRef(0);

  const release = useCallback(() => {
    generation.current += 1;
    const lock = sentinel.current;
    // Cleared first, so our own release is not mistaken for the browser's.
    sentinel.current = null;
    if (lock && !lock.released) void lock.release().catch(() => undefined);
  }, []);

  const refuse = useCallback(() => {
    setHeld("off");
    setRefused(true);
    setWanted(false);
  }, []);

  const request = useCallback(async () => {
    const api = wakeLockApi();
    if (!api || sentinel.current) return;
    const ticket = ++generation.current;
    setHeld("requesting");
    try {
      const lock = await api.request("screen");
      if (ticket !== generation.current) {
        // Released, closed or switched off while the browser was deciding.
        void lock.release().catch(() => undefined);
        return;
      }
      sentinel.current = lock;
      setHeld("on");
      lock.addEventListener("release", () => {
        if (sentinel.current !== lock) return;
        sentinel.current = null;
        if (document.visibilityState === "visible") {
          // Dropped with the page in front of the painter: say so, stop asking.
          refuse();
        } else {
          // Dropped because the page was hidden. The wish stands, and the
          // visibility handler asks again on return.
          setHeld("off");
        }
      });
    } catch {
      if (ticket === generation.current) refuse();
    }
  }, [refuse]);

  const shouldHold = supported && active && wanted;

  useEffect(() => {
    if (!shouldHold) {
      release();
      setHeld("off");
      return;
    }
    if (document.visibilityState === "visible") void request();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [shouldHold, request, release]);

  // Closing the last warm-up forgets the wish and the refusal: reopening starts fresh.
  useEffect(() => {
    if (active) return;
    setWanted(false);
    setRefused(false);
  }, [active]);

  useEffect(() => release, [release]);

  const toggle = useCallback(() => {
    setRefused(false);
    setWanted((w) => !w);
  }, []);

  const status: WakeLockStatus = !supported ? "unsupported" : refused ? "refused" : held;
  return { status, wanted, toggle };
}
