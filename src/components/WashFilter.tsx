/**
 * The wet paper itself: a turbulence field whose displacement swells and
 * settles over one re-wet. Both View Transition snapshots reference this same
 * filter, so the outgoing piece dissolves into exactly the paper the incoming
 * one resolves out of.
 *
 * The animation is SMIL rather than CSS because `scale` and `baseFrequency`
 * are SVG attributes, not CSS properties - there is no way to reach them from
 * a keyframe. `begin="indefinite"` keeps it dormant until `wash.ts` fires it.
 *
 * Rendered once, inert, and never visible: it exists only to be referenced.
 */
export function WashFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter id="wash-bloom" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          {/*
            baseFrequency is fixed, and deliberately so. Animating it made the
            bloom marginally grainier over its life and cost half the frame
            rate: a moving frequency forces the whole noise field to be
            regenerated every frame, while a fixed one is generated once and
            only re-sampled as the displacement swells. On a throttled
            mid-range profile that was the difference between 30fps and 60.
            The bloom comes from the swell, not from the sweep.
          */}
          <feTurbulence
            id="wash-turbulence"
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves={1}
            seed={7}
            result="paper"
          />
          {/*
            scale 0 -> 18 -> 0: the paper wets, blooms and dries. It returns to
            zero so the settled frame is geometrically exact - and the element
            drops `filter` entirely once the transition ends, so the reference
            a painter mixes against is never a filtered image.
          */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="paper"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          >
            <animate
              id="wash-swell"
              attributeName="scale"
              values="0;18;0"
              keyTimes="0;0.4;1"
              dur="520ms"
              begin="indefinite"
              fill="freeze"
              calcMode="spline"
              keySplines="0.16 1 0.3 1;0.16 1 0.3 1"
            />
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  );
}
