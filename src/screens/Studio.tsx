import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { savedReferences } from "@/lib/catalog";
import { PieceCard } from "@/components/PieceCard";
import { EmptyPanel } from "@/components/EmptyPanel";
import { Icon } from "@/components/Icon";

interface StudioSectionProps {
  title: string;
  /** Omitted when there is nothing to count - "Saved 0" is a cold way to say empty. */
  count?: number;
  children: ReactNode;
}

/**
 * One area of the studio. The page is a stack of these so the practice history
 * on the roadmap becomes another section rather than a redesign.
 */
function StudioSection({ title, count, children }: StudioSectionProps) {
  return (
    <section className="mb-12 last:mb-0">
      <div className="flex items-baseline gap-3 border-b border-line pb-2">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h2>
        {count === undefined ? null : (
          <span className="tnum text-[0.85rem] text-ink-soft">{count}</span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * The pieces you set aside, and the answer to "where did my saves go".
 *
 * Saving used to persist to storage and lead nowhere; this is the destination.
 * It is a record to come back to, not a collection to complete - so there is no
 * target, no progress and no language about keeping it up (PRODUCT.md: "No
 * pressure, ever").
 */
export function Studio() {
  const { references, favorites } = useApp();
  const saved = savedReferences(references, favorites);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Your studio
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          Pieces you set aside to paint. They keep for as long as you like, and
          nothing here is keeping score.
        </p>
      </div>

      {/*
        The list can shrink under the user when they remove a piece, so the
        count is announced rather than left to be noticed.
      */}
      <p aria-live="polite" className="sr-only">
        {saved.length === 0
          ? "Nothing in your studio."
          : `${saved.length} ${saved.length === 1 ? "piece" : "pieces"} in your studio.`}
      </p>

      <StudioSection title="Saved" count={saved.length || undefined}>
        {saved.length === 0 ? (
          <EmptyPanel
            icon="heart"
            title="Nothing set aside yet"
            description={
              <p className="text-pretty text-[0.95rem] text-ink-soft">
                Tap the heart on a piece you like the look of and it will wait
                here for you.
              </p>
            }
          >
            <Link
              to="/browse"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-chip bg-accent px-5 text-[0.95rem] font-semibold text-accent-ink shadow-lift"
            >
              Find a piece to paint
              <Icon name="arrow-left" size={18} className="rotate-180" />
            </Link>
          </EmptyPanel>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {saved.map((reference) => (
              <li key={reference.id}>
                <PieceCard reference={reference} to={`/piece/${reference.id}`} />
              </li>
            ))}
          </ul>
        )}
      </StudioSection>
    </div>
  );
}
