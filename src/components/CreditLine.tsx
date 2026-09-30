import { creditParts } from "@/lib/sources/attribution";
import type { PaintReference } from "@/lib/types";

interface CreditLineProps {
  /** Only the provenance, so anything with a credit can be credited the same way. */
  reference: Pick<PaintReference, "credit" | "kind">;
  /**
   * How much of the credit to show.
   *
   * `compact` is a card or a plate caption - who made it, nothing else.
   * `inline` adds the licence, for the enlarged view a painter sits with.
   * `full` is the detail screen: maker, holder, date, medium, licence, and a
   * link to the work on the provider's own site.
   */
  variant?: "compact" | "inline" | "full";
  className?: string;
}

const LINK =
  "underline decoration-[rgb(var(--ink)/0.25)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]";

/**
 * Who made this reference.
 *
 * Shown on every surface that shows a reference, whether or not the licence
 * asks for it: four of the five licences the catalogue allows require nothing.
 * We credit because the person who made the work deserves it, and because a
 * painter studying a piece should be able to find its maker.
 *
 * Small type below the artwork, never over it. DESIGN.md:402 keeps ornaments
 * off the mat, and the same rule applies to text: nothing sits on the surface
 * a painter is mixing colour against.
 */
export function CreditLine({
  reference,
  variant = "compact",
  className = "",
}: CreditLineProps) {
  const parts = creditParts(reference.credit, reference.kind);
  const base = `text-[0.8rem] leading-snug text-ink-faint ${className}`;

  if (variant === "compact") {
    return <p className={base}>{parts.line}</p>;
  }

  const maker = parts.creator ? (
    parts.creatorUrl ? (
      <a
        href={parts.creatorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK}
      >
        {parts.creator}
      </a>
    ) : (
      parts.creator
    )
  ) : null;

  const holder = (
    <a
      href={parts.objectUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      {parts.institution}
    </a>
  );

  const licence = (
    <a
      href={parts.licence.url}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      {parts.licence.name}
    </a>
  );

  if (variant === "inline") {
    return (
      <p className={base}>
        {reference.kind === "photograph" ? (
          <>
            {maker ? <>Photo by {maker} on {holder}</> : <>Photo from {holder}</>}
          </>
        ) : (
          <>{maker ? <>{maker}, {holder}</> : holder}</>
        )}{" "}
        ({licence})
      </p>
    );
  }

  return (
    <div className={base}>
      <p>
        {reference.kind === "photograph" ? (
          <>{maker ? <>Photo by {maker} on {holder}</> : <>Photo from {holder}</>}</>
        ) : (
          <>{maker ? <>{maker}, {holder}</> : holder}</>
        )}
        {parts.dateDisplay ? <>, {parts.dateDisplay}</> : null}
        {parts.medium ? <>. {parts.medium}</> : null}
      </p>
      <p className="mt-0.5">Licensed under {licence}.</p>
    </div>
  );
}
