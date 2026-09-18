import type { CSSProperties } from "react";

const MARKS: { top: string; left: string; size: number; pig: string; rot: number }[] = [
  { top: "6%", left: "-2.5%", size: 46, pig: "--pig-fruit", rot: 8 },
  { top: "38%", left: "-3.5%", size: 30, pig: "--pig-botanical", rot: -12 },
  { top: "72%", left: "-2%", size: 38, pig: "--pig-still-life", rot: 20 },
  { top: "18%", left: "99%", size: 34, pig: "--pig-landscape", rot: -6 },
  { top: "55%", left: "100.5%", size: 44, pig: "--pig-creatures", rot: 14 },
  { top: "86%", left: "98%", size: 26, pig: "--pig-objects", rot: -18 },
];

/**
 * Scattered pigment dabs bleeding into the page margins - the "chaos" that a
 * strict grid keeps organised. Purely decorative, hidden from assistive tech,
 * and suppressed under reduced-motion-agnostic static rendering (no motion).
 */
export function ScatterMarks({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-0 hidden lg:block ${className}`}
    >
      {MARKS.map((m, i) => (
        <span
          key={i}
          className="dab absolute block"
          style={
            {
              top: m.top,
              left: m.left,
              width: m.size,
              height: m.size * 0.86,
              background: `rgb(var(${m.pig}) / 0.5)`,
              transform: `rotate(${m.rot}deg)`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
