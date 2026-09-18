import type { PaintReference } from "@/lib/types";

interface RefArtProps {
  reference: PaintReference;
  /** Eager-load the above-the-fold featured piece; lazy-load the rest. */
  priority?: boolean;
  className?: string;
  /** Extra padding so the uncropped artwork breathes inside its mat. */
  inset?: "snug" | "roomy";
}

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
}: RefArtProps) {
  return (
    <div className={`art-mat relative overflow-hidden ${className}`}>
      <img
        src={reference.art}
        alt={reference.alt}
        width={1000}
        height={1000}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`h-full w-full select-none object-contain ${
          inset === "roomy" ? "p-[9%]" : "p-[5%]"
        }`}
      />
    </div>
  );
}
