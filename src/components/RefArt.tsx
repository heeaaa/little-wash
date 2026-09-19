import type { Ref } from "react";
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
 */
export function RefArt({
  reference,
  priority = false,
  className = "",
  inset = "snug",
  mat = true,
  transitionName,
  containerRef,
}: RefArtProps) {
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${mat ? "art-mat" : ""} ${className}`}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      <img
        src={reference.art}
        alt={reference.alt}
        width={1000}
        height={1000}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`h-full w-full select-none object-contain ${INSET[inset]}`}
      />
    </div>
  );
}
