import { useState, type CSSProperties, type Ref } from "react";
import { buildImageSources } from "@/lib/sources/images";
import type { PaintReference } from "@/lib/types";

interface RefArtProps {
  reference: PaintReference;
  /** Eager-load the above-the-fold featured piece; lazy-load the rest. */
  priority?: boolean;
  className?: string;
  /** Extra padding so the uncropped artwork breathes inside its mat. */
  inset?: "none" | "snug" | "roomy";
  /**
   * Draw the neutral mat behind the artwork. Off only where the surrounding
   * surface already is the mat, so the enlarged view has no plate-in-a-plate.
   */
  mat?: boolean;
  /**
   * How wide this artwork is drawn, so the browser can pick a candidate from
   * srcset. Each caller knows its own layout; the default suits a full-width
   * plate on a phone.
   */
  sizes?: string;
  /**
   * Shape the plate to the reference itself, rather than to a fixed ratio.
   *
   * For the surfaces where the artwork is the point - the featured plate and
   * Detail - so a tall photograph gets a tall plate instead of being shrunk to
   * fit a landscape box. Cards keep a fixed ratio, because a grid of
   * differently shaped cards reads as broken rather than as varied.
   *
   * Falls back to whatever ratio `className` carries when an item has no
   * usable intrinsic size.
   */
  ownAspect?: boolean;
  /**
   * View-transition identity. Exactly one element in the document may carry a
   * given name, which is what lets this artwork morph between Today, a Browse
   * card, Detail and the enlarged view instead of being cut and redrawn.
   */
  transitionName?: string;
  /** The mat element, for a caller that claims the transition name imperatively. */
  containerRef?: Ref<HTMLDivElement>;
}

const INSET = {
  none: "",
  snug: "p-[5%]",
  roomy: "p-[9%]",
} as const;

/**
 * A reference shown uncropped on a neutral mat. object-contain guarantees the
 * whole subject is visible with no cropping, and the mat colour is a fixed
 * neutral so nothing shifts the reference's own colours (PRODUCT.md).
 *
 * The intrinsic size and the width ladder come from the item, not from this
 * component: real references are photographs and paintings of every
 * proportion, where the twelve placeholders this replaced were all 400x400.
 */
export function RefArt({
  reference,
  priority = false,
  className = "",
  inset = "snug",
  mat = true,
  ownAspect = false,
  sizes = "100vw",
  transitionName,
  containerRef,
}: RefArtProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const { src, srcSet, width, height, lqip } = buildImageSources(
    reference.image,
    reference.credit.sourceId,
  );

  /*
    Clamped to the same range the ingestion pipeline enforces, so the plate can
    never be asked to be a 6:1 strip. A reference outside it would not have
    reached the catalogue; the clamp is here so a hand-edited entry cannot
    collapse the layout either.
  */
  const ratio =
    ownAspect && width > 0 && height > 0
      ? Math.min(2, Math.max(0.5, width / height))
      : null;
  /*
    The fallback ratio is a Tailwind utility on `className`, and utilities beat
    the components layer whatever the specificity - so `.art-ratio` cannot
    simply override it. Dropping the utility is both the fix and the clearer
    statement: exactly one thing decides the plate's shape.
  */
  const shaped = ratio
    ? className.replace(/(^|\s)aspect-\[[^\]]*\]|(^|\s)aspect-(square|video|auto)/g, " ")
    : className;
  const ratioProps = ratio
    ? { className: "art-ratio", style: { "--ar": String(ratio) } as CSSProperties }
    : { className: "", style: undefined };

  /*
    A remote reference is a photograph on someone else's CDN, so it can fail in
    ways a bundled asset never did. Say so in words rather than leaving the
    browser's broken-image icon on the mat, and keep describing the subject so
    the screen is still useful to someone deciding whether to paint it.
  */
  if (status === "failed") {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${mat ? "art-mat" : ""} ${ratioProps.className} ${shaped}`}
        style={ratioProps.style}
      >
        <div
          role="img"
          aria-label={reference.alt}
          className="flex h-full w-full flex-col items-center justify-center gap-1 p-6 text-center"
        >
          <p className="text-[0.8rem] text-ink-faint">
            This reference didn&rsquo;t load.
          </p>
          <p className="text-[0.8rem] text-ink-faint">
            Check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${mat ? "art-mat" : ""} ${ratioProps.className} ${shaped}`}
      style={{
        ...ratioProps.style,
        ...(transitionName ? { viewTransitionName: transitionName } : {}),
      }}
    >
      {/*
        The placeholder is a sibling, never a filter on the artwork itself, and
        it is unmounted the moment the real image arrives. DESIGN.md:495-502
        makes colour fidelity outrank the transition, and posture.spec.ts
        asserts the settled artwork reports `filter: none`.
      */}
      {lqip && status === "loading" ? (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-contain bg-center bg-no-repeat blur-lg ${INSET[inset]}`}
          style={{ backgroundImage: `url(${lqip})` }}
        />
      ) : null}
      <img
        src={src}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={reference.alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        className={`relative h-full w-full select-none object-contain ${INSET[inset]}`}
      />
    </div>
  );
}
