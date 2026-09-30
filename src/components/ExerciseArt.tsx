import { useId, type CSSProperties, type ReactNode } from "react";
import type { ExerciseArtId } from "@/data/exercises";

/**
 * Illustrated examples for every warm-up variation, drawn for Little Wash.
 *
 * Unlike references these teach colour behaviour, so colour is the point of
 * the image itself - and the colours are the ones the variation suggests, so
 * what the example shows is what the list asks for. They are deliberately
 * loose: a beginner should look at one and think "I could do that", not
 * "I could never do that".
 *
 * The paint is three SVG filters defined once by `ExerciseArtDefs`: a crisp
 * wash with pigment pooled at its edge, a soft wet-in-wet bloom, and a frilly
 * backrun. Where the defs are missing (a unit test, another screen) the shapes
 * still render, just flat, so nothing depends on them to be legible.
 */
export function ExerciseArt({
  art,
  label,
  className = "",
}: {
  art: ExerciseArtId;
  /** Omit for a thumbnail whose name is carried by the text beside it. */
  label?: string;
  className?: string;
}) {
  // Gradients and masks are per drawing, so each instance needs its own ids.
  const uid = `lw${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const, focusable: "false" as const };

  return (
    <svg viewBox="0 0 240 160" className={className} data-art={art} {...a11y}>
      {ART[art](uid)}
    </svg>
  );
}

/**
 * The shared paint. Rendered once per screen, inert and never visible.
 *
 * Filter regions stay on the element's own bounding box, so each wash only
 * pays for turbulence over its own area rather than the whole drawing. Lines
 * are the exception: a stem's box is a few units wide, and a box-relative
 * margin would clip the displacement at its ends.
 */
export function ExerciseArtDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        {/* A wash on dry paper: an irregular edge, pigment pooled along it, a little granulation. */}
        <filter id="lw-paint" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="9" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.45 1.12" result="grainMask" />
          <feComposite in="shape" in2="grainMask" operator="in" result="grainy" />
          <feMorphology in="shape" operator="erode" radius="1.1" result="inner" />
          <feComposite in="shape" in2="inner" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.45" result="softRim" />
          <feMerge>
            <feMergeNode in="grainy" />
            <feMergeNode in="softRim" />
          </feMerge>
        </filter>

        {/* Wet into wet: the edge dissolves and the colours drift. */}
        <filter id="lw-wet" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="3" seed="12" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="11" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="1.7" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.22 1.05" result="grainMask" />
          <feComposite in="soft" in2="grainMask" operator="in" />
        </filter>

        {/* A backrun: wetter paint pushing into drying paint leaves a frilly, darker edge. */}
        <filter id="lw-bloom" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="21" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="11" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="1.1" result="soft" />
          <feMorphology in="shape" operator="erode" radius="1.6" result="inner" />
          <feComposite in="shape" in2="inner" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.6" result="softRim" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="softRim" />
          </feMerge>
        </filter>

        {/* A brush line: only the wobble, in the drawing's own coordinates. */}
        <filter id="lw-line" filterUnits="userSpaceOnUse" x="-10" y="-10" width="260" height="180">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="6" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/* ───────────────────────── pigments ───────────────────────── */

// The same pans the variations name, so the example matches the list.
const CERULEAN = "#3f86b0";
const WHEEL_BLUE = "#3f77a8";
const ULTRAMARINE = "#3f4d8c";
const ROSE = "#c65a67";
const LEMON = "#e3c34a";
const SAP = "#6e8c4a";
const SIENNA = "#b0623c";
const GAMBOGE = "#e2a33a";
const PAYNES = "#4c566a";
const HOOKERS = "#3d6a4c";
const SEPIA = "#5b4636";

// Mixes of those pans, picked by eye: paint mixes subtractively, so blue and
// yellow make green here rather than the grey an RGB average would give.
const ORANGE = "#dc8a48";
const VIOLET = "#7b5b93";
const GREEN = "#62985a";
const NEUTRAL = "#6f5e52";
const CLOUD_GREY = "#707b8e";
const MIST = "#5f6b86";
const DUSK = "#4a3a48";

const PENCIL = "#8a8578";

/** Twelve steps round the wheel, from three pans. */
const WHEEL_12 = [
  LEMON, "#e2a843", ORANGE, "#d3714f", ROSE, "#a8587c",
  VIOLET, "#5b62a0", WHEEL_BLUE, "#3f8a8a", GREEN, "#a2ae4b",
];
const WHEEL_6 = [LEMON, ORANGE, ROSE, VIOLET, WHEEL_BLUE, GREEN];

/** Seven drops from blue to yellow, through the greens a real mix makes. */
const BLUE_TO_YELLOW = ["#3f4d8c", "#3a6892", "#35818a", "#4a9670", "#76a852", "#abb647", LEMON];

/** A straight blend of two display hexes, for mixes of neighbouring colours. */
function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) =>
    Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${out.join("")}`;
}

const STEPS_5 = [0, 0.25, 0.5, 0.75, 1];
/** Five values of one pigment, pale to dark, as they read on paper. */
const VALUES_5 = [0.16, 0.34, 0.53, 0.73, 0.93];

const MULTIPLY: CSSProperties = { mixBlendMode: "multiply" };

/* ───────────────────────── shapes ───────────────────────── */

/** A pointed leaf or feather, base at the origin, tip straight up. */
function leafPath(length: number, width: number): string {
  const w = width / 2;
  return `M0 0 C${w} ${-length * 0.25} ${w} ${-length * 0.7} 0 ${-length} C${-w} ${-length * 0.7} ${-w} ${-length * 0.25} 0 0 Z`;
}

function Leaf({
  x,
  y,
  angle,
  length,
  width,
  fill,
  opacity = 0.85,
}: {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  fill: string;
  opacity?: number;
}) {
  return (
    <path
      d={leafPath(length, width)}
      transform={`translate(${x} ${y}) rotate(${angle})`}
      fill={fill}
      fillOpacity={opacity}
    />
  );
}

/** A pine: three stacked tiers on a short trunk, `top` to `top + height`. */
function pinePath(cx: number, top: number, height: number, width: number): string {
  const h = height;
  const w = width;
  const p = (dx: number, dy: number) => `${(cx + dx * w).toFixed(1)} ${(top + dy * h).toFixed(1)}`;
  return [
    `M${p(0, 0)}`,
    `L${p(0.28, 0.32)}`,
    `L${p(0.17, 0.32)}`,
    `L${p(0.4, 0.64)}`,
    `L${p(0.25, 0.64)}`,
    `L${p(0.5, 1)}`,
    `L${p(-0.5, 1)}`,
    `L${p(-0.25, 0.64)}`,
    `L${p(-0.4, 0.64)}`,
    `L${p(-0.17, 0.32)}`,
    `L${p(-0.28, 0.32)}`,
    "Z",
  ].join(" ");
}

function Gradient({
  id,
  stops,
  y1 = "0",
  y2 = "1",
  userSpace = false,
}: {
  id: string;
  stops: ReadonlyArray<[offset: number, colour: string, opacity: number]>;
  y1?: string;
  y2?: string;
  userSpace?: boolean;
}) {
  return (
    <linearGradient
      id={id}
      x1="0"
      x2="0"
      y1={y1}
      y2={y2}
      gradientUnits={userSpace ? "userSpaceOnUse" : "objectBoundingBox"}
    >
      {stops.map(([offset, colour, opacity]) => (
        <stop key={offset} offset={offset} stopColor={colour} stopOpacity={opacity} />
      ))}
    </linearGradient>
  );
}

const paint = "url(#lw-paint)";
const wet = "url(#lw-wet)";
const bloom = "url(#lw-bloom)";
const line = "url(#lw-line)";

/* ───────────────────────── the twenty drawings ───────────────────────── */

const ART: Record<ExerciseArtId, (uid: string) => ReactNode> = {
  /* Wet-on-wet blooms */

  "blooms-classic": () => (
    <g filter={wet}>
      <ellipse cx="96" cy="82" rx="52" ry="44" fill={CERULEAN} fillOpacity="0.62" />
      <ellipse cx="146" cy="84" rx="48" ry="41" fill={ROSE} fillOpacity="0.6" style={MULTIPLY} />
      <ellipse cx="82" cy="74" rx="17" ry="14" fill={CERULEAN} fillOpacity="0.45" />
      <ellipse cx="160" cy="93" rx="14" ry="12" fill={ROSE} fillOpacity="0.45" />
    </g>
  ),

  "blooms-flowers": () => (
    <>
      <g filter={line} fill="none" stroke={SAP} strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.9">
        <path d="M72 70 C75 100 88 124 104 150" />
        <path d="M124 58 C122 90 117 120 112 150" />
        <path d="M172 76 C164 104 142 126 120 150" />
      </g>
      <g filter={paint}>
        <Leaf x={86} y={116} angle={-58} length={26} width={10} fill={SAP} />
        <Leaf x={146} y={124} angle={62} length={24} width={9} fill={SAP} />
      </g>
      <g filter={wet}>
        <circle cx="72" cy="58" r="24" fill={ROSE} fillOpacity="0.5" />
        <circle cx="124" cy="44" r="22" fill={ROSE} fillOpacity="0.46" />
        <circle cx="172" cy="66" r="20" fill={ROSE} fillOpacity="0.52" />
        <circle cx="73" cy="60" r="9" fill={ROSE} fillOpacity="0.7" />
        <circle cx="123" cy="46" r="8" fill={ROSE} fillOpacity="0.7" />
        <circle cx="171" cy="67" r="7" fill={ROSE} fillOpacity="0.72" />
      </g>
    </>
  ),

  "blooms-clouds": (uid) => (
    <>
      <defs>
        {/* Deeper overhead, paler towards the clouds, as a wet sky settles. */}
        <Gradient id={`${uid}-sky`} stops={[[0, CERULEAN, 0.82], [0.55, CERULEAN, 0.56], [1, CERULEAN, 0.34]]} />
      </defs>
      <path
        filter={wet}
        fill={`url(#${uid}-sky)`}
        fillRule="evenodd"
        d={[
          "M14 16 H226 V122 C190 128 60 126 14 120 Z",
          "M48 78 C40 78 40 66 50 64 C50 52 66 48 72 56 C76 44 96 44 100 56 C110 52 118 62 112 70 C120 72 118 80 108 80 Z",
          "M136 58 C130 58 130 50 138 49 C140 40 152 38 156 45 C160 36 176 38 176 48 C184 48 186 58 178 59 Z",
          "M146 104 C140 104 140 96 148 95 C150 86 162 84 166 91 C172 84 186 88 184 96 C192 97 190 106 182 106 Z",
        ].join(" ")}
      />
      <g filter={wet} fill={CLOUD_GREY} fillOpacity="0.32">
        <ellipse cx="80" cy="77" rx="28" ry="4.5" />
        <ellipse cx="158" cy="56" rx="18" ry="3.5" />
        <ellipse cx="166" cy="103" rx="18" ry="3.5" />
      </g>
    </>
  ),

  "blooms-puddles": () => (
    <g filter={bloom}>
      <path d="M40 80 C38 56 64 42 88 50 C110 56 114 82 100 96 C86 110 44 106 40 80 Z" fill={LEMON} fillOpacity="0.72" />
      <path d="M96 96 C92 76 118 66 140 72 C164 78 170 104 152 118 C134 130 100 120 96 96 Z" fill={ROSE} fillOpacity="0.6" style={MULTIPLY} />
      <path d="M140 58 C140 38 168 30 188 40 C206 50 204 76 186 86 C166 96 140 82 140 58 Z" fill={ULTRAMARINE} fillOpacity="0.55" style={MULTIPLY} />
      <ellipse cx="128" cy="90" rx="9" ry="7" fill={ROSE} fillOpacity="0.35" style={MULTIPLY} />
    </g>
  ),

  /* Three-colour wheel */

  "wheel-classic": () => {
    const cx = 120;
    const cy = 80;
    return (
      <>
        <circle cx={cx} cy={cy} r="46" fill="none" stroke={PENCIL} strokeOpacity="0.45" strokeWidth="0.8" filter={line} />
        <g filter={paint}>
          {WHEEL_6.map((colour, i) => {
            const angle = ((-90 + i * 60) * Math.PI) / 180;
            const primary = i % 2 === 0;
            return (
              <circle
                key={colour}
                cx={cx + Math.cos(angle) * 46}
                cy={cy + Math.sin(angle) * 46}
                r={primary ? 19 : 15.5}
                fill={colour}
                fillOpacity="0.84"
              />
            );
          })}
          <circle cx={cx} cy={cy} r="9" fill={NEUTRAL} fillOpacity="0.72" />
        </g>
      </>
    );
  },

  "wheel-tree": () => {
    const cx = 121;
    const cy = 56;
    return (
      <>
        <path
          filter={paint}
          fill={NEUTRAL}
          fillOpacity="0.85"
          d="M114 152 C116 134 116 114 117 98 C112 90 106 84 100 77 C107 80 112 84 117 89 C118 80 119 72 120 64 L124 64 C124.4 72 124.7 80 125 89 C130 83 136 78 143 74 C137 81 131 88 126 97 C127 116 128 134 131 152 Z"
        />
        <g filter={paint}>
          {WHEEL_12.map((colour, i) => {
            const deg = -90 + i * 30;
            const rad = (deg * Math.PI) / 180;
            return (
              <Leaf
                key={colour}
                x={cx + Math.cos(rad) * 15}
                y={cy + Math.sin(rad) * 15}
                angle={deg + 90}
                length={29}
                width={18}
                fill={colour}
              />
            );
          })}
        </g>
      </>
    );
  },

  "wheel-feathers": () => {
    const cx = 120;
    const cy = 82;
    return (
      <>
        <g filter={paint}>
          {WHEEL_6.map((colour, i) => {
            const deg = -90 + i * 60;
            const rad = (deg * Math.PI) / 180;
            return (
              <Leaf
                key={colour}
                x={cx + Math.cos(rad) * 6}
                y={cy + Math.sin(rad) * 6}
                angle={deg + 90}
                length={58}
                width={17}
                fill={colour}
                opacity={0.72}
              />
            );
          })}
        </g>
        <g filter={line} strokeWidth="1.2" strokeLinecap="round">
          {WHEEL_6.map((colour, i) => {
            const rad = ((-90 + i * 60) * Math.PI) / 180;
            return (
              <line
                key={colour}
                x1={cx + Math.cos(rad) * 5}
                y1={cy + Math.sin(rad) * 5}
                x2={cx + Math.cos(rad) * 58}
                y2={cy + Math.sin(rad) * 58}
                stroke={colour}
              />
            );
          })}
        </g>
        <circle cx={cx} cy={cy} r="4.5" fill={NEUTRAL} fillOpacity="0.8" filter={paint} />
      </>
    );
  },

  /* Value ladder */

  "values-classic": () => (
    <g filter={paint}>
      {VALUES_5.map((opacity, i) => (
        <rect key={opacity} x={21 + i * 42} y="62" width="36" height="36" fill={ULTRAMARINE} fillOpacity={opacity} />
      ))}
    </g>
  ),

  "values-mountains": () => {
    // Glazes, back to front. Each layer's own opacity is chosen so the
    // stacked result steps evenly - later layers sit on everything behind.
    const ridges: Array<[d: string, opacity: number]> = [
      ["M12 56 Q30 44 44 48 Q60 30 78 42 Q94 50 108 38 Q126 24 144 40 Q160 50 176 40 Q196 28 212 42 Q222 48 228 46 V146 H12 Z", 0.18],
      ["M12 74 Q28 64 46 68 Q64 56 82 64 Q100 72 118 58 Q134 48 150 62 Q168 72 186 60 Q204 52 228 64 V146 H12 Z", 0.22],
      ["M12 90 Q34 80 54 86 Q72 76 92 84 Q112 92 130 80 Q148 70 166 82 Q186 92 206 82 Q218 78 228 82 V146 H12 Z", 0.28],
      ["M12 106 Q30 98 50 102 Q70 94 90 102 Q112 110 134 98 Q152 90 172 100 Q194 110 214 100 Q222 97 228 100 V146 H12 Z", 0.39],
      ["M12 122 Q34 114 56 120 Q80 126 100 116 Q120 108 142 118 Q164 126 186 118 Q208 112 228 118 V146 H12 Z", 0.64],
    ];
    return (
      <>
        {ridges.map(([d, opacity]) => (
          <path key={d} d={d} fill={PAYNES} fillOpacity={opacity} filter={paint} />
        ))}
      </>
    );
  },

  "values-trees": () => (
    <>
      <path d="M14 139 H226" stroke={PENCIL} strokeOpacity="0.4" strokeWidth="0.8" filter={line} />
      <g filter={paint}>
        {VALUES_5.map((opacity, i) => {
          const cx = 36 + i * 42;
          const height = [70, 78, 72, 80, 74][i]!;
          const top = 128 - height;
          return (
            <g key={opacity} fill={HOOKERS} fillOpacity={opacity}>
              <path d={pinePath(cx, top, height, 32)} />
              <rect x={cx - 2.5} y="127" width="5" height="11" />
            </g>
          );
        })}
      </g>
    </>
  ),

  "values-sky": () => (
    <g filter={paint}>
      {[...VALUES_5].reverse().map((opacity, i) => (
        <rect key={opacity} x="16" y={20 + i * 24} width="208" height="21" fill={ULTRAMARINE} fillOpacity={opacity} />
      ))}
    </g>
  ),

  "values-moons": () => (
    <g filter={paint}>
      {VALUES_5.map((opacity, i) => (
        <circle key={opacity} cx={32 + i * 44} cy={[108, 84, 74, 84, 108][i]} r="17" fill={SEPIA} fillOpacity={opacity} />
      ))}
    </g>
  ),

  /* Two-colour mixing strip */

  "mix-classic": () => (
    <g filter={paint}>
      {STEPS_5.map((t, i) => (
        <rect key={t} x={21 + i * 42} y="56" width="36" height="48" fill={mix(SAP, SIENNA, t)} fillOpacity="0.88" />
      ))}
    </g>
  ),

  "mix-leaves": () => {
    const leaves: Array<[x: number, y: number, angle: number]> = [
      [96, 30, 60],
      [112, 52, -58],
      [124, 78, 68],
      [131, 104, -64],
      [136, 128, 74],
    ];
    return (
      <>
        <path
          d="M78 18 C110 40 130 80 138 146"
          fill="none"
          stroke={mix(SAP, SIENNA, 0.5)}
          strokeWidth="2.2"
          strokeLinecap="round"
          filter={line}
        />
        <g filter={paint}>
          {leaves.map(([x, y, angle], i) => (
            <Leaf key={i} x={x} y={y} angle={angle} length={32} width={14} fill={mix(SAP, SIENNA, STEPS_5[i]!)} />
          ))}
        </g>
      </>
    );
  },

  "mix-teardrops": () => (
    <g filter={paint}>
      {BLUE_TO_YELLOW.map((colour, i) => (
        <path
          key={colour}
          transform={`translate(${30 + i * 30} 84)`}
          d="M0 -24 C5 -12 12 -4 12 5 A12 12 0 0 1 -12 5 C-12 -4 -5 -12 0 -24 Z"
          fill={colour}
          fillOpacity="0.85"
        />
      ))}
    </g>
  ),

  "mix-petals": () => {
    const cx = 120;
    const cy = 82;
    return (
      <g filter={paint}>
        {STEPS_5.map((t, i) => {
          const deg = -90 + i * 72;
          const rad = (deg * Math.PI) / 180;
          return (
            <path
              key={t}
              transform={`translate(${cx + Math.cos(rad) * 5} ${cy + Math.sin(rad) * 5}) rotate(${deg + 90})`}
              d="M0 0 C17 -9 21 -36 0 -50 C-21 -36 -17 -9 0 0 Z"
              fill={mix(ROSE, LEMON, t)}
              fillOpacity="0.8"
            />
          );
        })}
        <circle cx={cx} cy={cy} r="7" fill={ORANGE} fillOpacity="0.9" />
      </g>
    );
  },

  /* Graded wash */

  "graded-classic": (uid) => (
    <>
      <defs>
        <Gradient id={`${uid}-g`} stops={[[0, SAP, 0.94], [0.35, SAP, 0.62], [0.7, SAP, 0.28], [1, SAP, 0.03]]} />
      </defs>
      <rect x="44" y="22" width="152" height="116" fill="none" stroke={PENCIL} strokeOpacity="0.35" strokeWidth="0.8" filter={line} />
      <rect x="44" y="22" width="152" height="116" fill={`url(#${uid}-g)`} filter={paint} />
    </>
  ),

  "graded-sky": (uid) => (
    <>
      <defs>
        <Gradient id={`${uid}-g`} stops={[[0, CERULEAN, 0.88], [0.4, CERULEAN, 0.5], [0.78, CERULEAN, 0.14], [1, CERULEAN, 0]]} />
      </defs>
      <rect x="14" y="14" width="212" height="112" fill={`url(#${uid}-g)`} filter={paint} />
      <path
        d="M14 120 Q44 112 70 118 Q98 124 124 116 Q152 108 180 116 Q204 122 226 114 V136 H14 Z"
        fill={PAYNES}
        fillOpacity="0.85"
        filter={paint}
      />
    </>
  ),

  "graded-sunset": (uid) => (
    <>
      <defs>
        <Gradient
          id={`${uid}-g`}
          stops={[[0, ROSE, 0.8], [0.45, mix(ROSE, GAMBOGE, 0.5), 0.66], [1, GAMBOGE, 0.5]]}
        />
      </defs>
      <rect x="14" y="14" width="212" height="122" fill={`url(#${uid}-g)`} filter={paint} />
      <g filter={paint} fill={DUSK} fillOpacity="0.9">
        <path d="M14 126 Q40 114 66 120 Q92 126 114 116 Q140 104 166 114 Q192 124 226 116 V140 H14 Z" />
        <rect x="175" y="102" width="2.6" height="14" />
        <circle cx="176.3" cy="98" r="8" />
      </g>
    </>
  ),

  "graded-mist": (uid) => (
    <>
      <defs>
        <Gradient id={`${uid}-sky`} stops={[[0, MIST, 0.5], [0.7, MIST, 0], [1, MIST, 0]]} />
        <Gradient id={`${uid}-far`} userSpace y1="56" y2="122" stops={[[0, MIST, 0.46], [1, MIST, 0]]} />
        <Gradient id={`${uid}-near`} userSpace y1="88" y2="140" stops={[[0, MIST, 0.8], [1, MIST, 0]]} />
      </defs>
      <rect x="14" y="14" width="212" height="126" fill={`url(#${uid}-sky)`} filter={paint} />
      <path
        d="M14 92 Q50 70 88 80 Q120 88 150 72 Q184 56 226 76 V140 H14 Z"
        fill={`url(#${uid}-far)`}
        filter={paint}
      />
      <path
        d="M14 112 Q46 96 84 104 Q118 112 150 100 Q180 90 226 104 V140 H14 Z"
        fill={`url(#${uid}-near)`}
        filter={paint}
      />
    </>
  ),
};

/** Every drawing this component can make, for tests and for the data to check against. */
export const EXERCISE_ART_IDS = Object.keys(ART) as ExerciseArtId[];
