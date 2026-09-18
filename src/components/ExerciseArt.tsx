import type { ExerciseVisual } from "@/data/exercises";

/**
 * Inline painterly demonstrations for each exercise. Unlike references these
 * teach colour behaviour, so colour is the point of the image itself.
 */
export function ExerciseArt({
  visual,
  className = "",
}: {
  visual: ExerciseVisual;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 160"
      className={className}
      role="img"
      aria-label={LABELS[visual]}
    >
      <defs>
        <filter id={`wc-${visual}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
        </filter>
      </defs>
      <g filter={`url(#wc-${visual})`}>{SHAPES[visual]}</g>
    </svg>
  );
}

const LABELS: Record<ExerciseVisual, string> = {
  blooms: "Two colours bleeding together on wet paper",
  wheel: "A colour wheel mixed from three primaries",
  graded: "A wash grading from deep colour to pale",
  values: "Five boxes stepping from pale to dark",
  mixstrip: "A strip blending one colour into another",
};

const SHAPES: Record<ExerciseVisual, JSX.Element> = {
  blooms: (
    <>
      <ellipse cx="95" cy="80" rx="52" ry="44" fill="#4f93a8" opacity="0.55" />
      <ellipse cx="140" cy="88" rx="46" ry="40" fill="#c65a67" opacity="0.5" />
      <ellipse cx="112" cy="72" rx="26" ry="22" fill="#7a6ba0" opacity="0.5" />
    </>
  ),
  wheel: (
    <>
      {Array.from({ length: 6 }).map((_, i) => {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const cx = 120 + Math.cos(ang) * 44;
        const cy = 80 + Math.sin(ang) * 44;
        const colors = ["#e6c94f", "#d88f3c", "#c65a67", "#8a5aa0", "#3f77a8", "#5a9a6a"];
        return <circle key={i} cx={cx} cy={cy} r="17" fill={colors[i]} opacity="0.75" />;
      })}
    </>
  ),
  graded: (
    <>
      <rect x="40" y="36" width="160" height="22" fill="#4f7d3f" opacity="0.9" />
      <rect x="40" y="58" width="160" height="22" fill="#4f7d3f" opacity="0.7" />
      <rect x="40" y="80" width="160" height="22" fill="#4f7d3f" opacity="0.48" />
      <rect x="40" y="102" width="160" height="22" fill="#4f7d3f" opacity="0.26" />
    </>
  ),
  values: (
    <>
      {[0.25, 0.45, 0.62, 0.8, 0.95].map((o, i) => (
        <rect key={i} x={26 + i * 40} y="56" width="34" height="48" fill="#5b5d86" opacity={o} />
      ))}
    </>
  ),
  mixstrip: (
    <>
      {[
        "#6e8c4a",
        "#7d804a",
        "#8c744a",
        "#9c6a44",
        "#b0623c",
      ].map((c, i) => (
        <rect key={i} x={26 + i * 40} y="56" width="36" height="48" fill={c} opacity="0.85" />
      ))}
    </>
  ),
};
