import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { RefArt } from "@/components/RefArt";
import { PaletteRow } from "@/components/PaletteRow";
import { MetaRow } from "@/components/MetaRow";
import { SaveButton } from "@/components/SaveButton";
import { SurpriseButton } from "@/components/SurpriseButton";
import { FilterControls } from "@/components/FilterControls";
import { EmptyState } from "@/components/EmptyState";
import { SubjectTag } from "@/components/SubjectTag";
import { StickyNote } from "@/components/studio/StickyNote";
import { Icon } from "@/components/Icon";
import { pigment } from "@/lib/types";

export function Today() {
  const { direction, treatment, featured, visible } = useApp();
  const { search } = useLocation();
  const chaos = treatment === "chaos";
  const others = visible.filter((r) => r.id !== featured?.id);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="relative z-10 mb-8 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Today&rsquo;s wash
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          One simple subject to start with. Change the mood with the filters, or
          let us deal you another.
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "idea" : "ideas"} match your filters.
      </p>

      <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          {featured ? <FeaturedPlate /> : <EmptyState />}

          {others.length > 0 ? (
            <section className="mt-12">
              <SectionHeading title="More to try" note={`${others.length} more`} />
              <ul className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2">
                {others.map((reference) => (
                  <li key={reference.id} className="min-w-0">
                    <div className="relative">
                      <Link
                        to={{ pathname: `/${direction}/piece/${reference.id}`, search }}
                        className="group flex gap-4 rounded-card"
                      >
                        <div
                          className="shrink-0"
                          style={
                            chaos
                              ? { boxShadow: `0 0 0 3px ${pigment(reference.subject, 0.35)}` }
                              : undefined
                          }
                        >
                          <RefArt
                            reference={reference}
                            className="h-24 w-24 rounded-[6px] border border-line"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="truncate font-display text-lg font-medium text-ink underline-offset-4 group-hover:underline">
                            {reference.title}
                          </p>
                          <div className="mt-1">
                            <SubjectTag subject={reference.subject} rotate={-3} />
                          </div>
                          <MetaRow reference={reference} className="mt-2" />
                        </div>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-surface-raised p-5 shadow-lift">
            <FilterControls layout="stack" idPrefix="today" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line pb-2">
      <h2 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h2>
      {note ? <span className="tnum text-[0.85rem] text-ink-faint">{note}</span> : null}
    </div>
  );
}

function FeaturedPlate() {
  const { direction, treatment, featured } = useApp();
  const { search } = useLocation();
  const chaos = treatment === "chaos";
  if (!featured) return null;

  return (
    <article data-testid="featured" className="relative">
      <div className="relative">
        <div
          className="relative rounded-card border border-line bg-surface-raised p-3 shadow-plate sm:p-4"
          style={
            chaos
              ? { boxShadow: `0 0 0 4px ${pigment(featured.subject, 0.28)}, var(--shadow-plate)` }
              : undefined
          }
        >
          <Link
            to={{ pathname: `/${direction}/piece/${featured.id}`, search }}
            aria-label={`Open ${featured.title}`}
            className="group block"
          >
            <RefArt
              reference={featured}
              priority
              inset="roomy"
              className="aspect-[4/3] w-full rounded-[6px]"
            />
          </Link>
          <div className="absolute right-5 top-5 sm:right-6 sm:top-6">
            <SaveButton reference={featured} />
          </div>
        </div>

        {/* Chaos: a sticky-note prompt pinned to the plate. */}
        {chaos ? (
          <StickyNote
            rotate={-3}
            className="absolute -bottom-5 left-4 hidden max-w-[15rem] sm:block"
          >
            {featured.prompt}
          </StickyNote>
        ) : null}
      </div>

      <div className={`mt-6 ${chaos ? "sm:mt-9" : ""}`}>
        <div className="mb-2">
          <SubjectTag subject={featured.subject} rotate={-2} />
        </div>
        <h2 className="text-balance font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink">
          {featured.title}
        </h2>
        {/*
          Scattered keeps the prompt as quiet italic serif at all sizes.
          Chaos carries it in the pinned sticky note on sm+, but the sticky is
          hidden on phones, so show a plain prompt there instead of losing it.
        */}
        <p
          className={`mt-1.5 max-w-reading text-pretty font-display text-[1.1rem] italic leading-relaxed text-ink-soft ${
            chaos ? "sm:hidden" : ""
          }`}
        >
          {featured.prompt}
        </p>
        <MetaRow reference={featured} className="mt-3.5" />

        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-ink-faint">
            <Icon name="palette" size={15} /> Suggested palette
          </p>
          <PaletteRow palette={featured.palette} variant="dabs" showNames />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
        <Link
          to={{ pathname: `/${direction}/piece/${featured.id}`, search }}
          className="inline-flex min-h-[52px] items-center gap-2 rounded-chip bg-accent px-6 text-[1.02rem] font-semibold text-accent-ink shadow-lift transition-transform hover:-translate-y-0.5"
        >
          Open this piece
          <Icon name="arrow-left" size={19} className="rotate-180" />
        </Link>
        <SaveButton reference={featured} variant="full" />
        <SurpriseButton variant="quiet" />
      </div>
    </article>
  );
}
