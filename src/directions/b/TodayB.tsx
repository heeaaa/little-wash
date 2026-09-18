import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { RefArt } from "@/components/RefArt";
import { SaveButton } from "@/components/SaveButton";
import { SurpriseButton } from "@/components/SurpriseButton";
import { FilterControls } from "@/components/FilterControls";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { DifficultyMark } from "@/components/DifficultyMark";
import {
  DIFFICULTY_LABEL,
  SUBJECT_LABEL,
  type PaintReference,
} from "@/lib/types";

/**
 * Direction B - "The Field Kit".
 * Warm paper, committed pigment, a bold grotesque voice and rounded, tactile
 * cards stacked like a poster. Colour lives in the chrome; artwork keeps its
 * neutral mat.
 */
export function TodayB() {
  const { featured, visible } = useApp();
  const others = visible.filter((r) => r.id !== featured?.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-7 max-w-2xl">
        <h1 className="text-balance font-display text-[2.4rem] font-extrabold leading-[0.98] tracking-tight text-ink sm:text-[3.2rem]">
          What&rsquo;s on your palette today?
        </h1>
        <p className="mt-3 text-pretty text-[1.05rem] font-medium leading-relaxed text-ink-soft">
          Grab water and one brush. Pick a subject, or hit Surprise me and just
          start.
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "idea" : "ideas"} match your filters.
      </p>

      <div className="mb-8 rounded-card border border-line bg-surface-raised p-5 shadow-lift sm:p-6">
        <FilterControls layout="row" idPrefix="b" />
      </div>

      {featured ? <FeaturedPoster /> : <EmptyState />}

      {others.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-ink">
            More to bring to life
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((reference) => (
              <li key={reference.id}>
                <IdeaCard reference={reference} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FeaturedPoster() {
  const { featured } = useApp();
  const { search } = useLocation();
  if (!featured) return null;

  return (
    <article
      data-testid="featured"
      className="overflow-hidden rounded-card bg-surface-raised shadow-plate"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="relative">
          <Link
            to={{ pathname: `/b/piece/${featured.id}`, search }}
            aria-label={`Open ${featured.title}`}
            className="group block h-full"
          >
            <RefArt
              reference={featured}
              priority
              inset="roomy"
              className="aspect-[4/3] h-full w-full md:aspect-auto md:min-h-[24rem]"
            />
          </Link>
          <div className="absolute right-4 top-4">
            <SaveButton reference={featured} />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <TimeBadge reference={featured} />
              <DifficultyBadge reference={featured} />
              <SubjectBadge reference={featured} />
            </div>
            <h2 className="text-balance font-display text-[2rem] font-extrabold leading-[1.02] tracking-tight text-ink">
              {featured.title}
            </h2>
            <p className="mt-2 text-pretty text-[1.05rem] font-medium leading-relaxed text-ink-soft">
              {featured.prompt}
            </p>
          </div>

          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink-faint">
              <Icon name="palette" size={16} /> Mix from
            </p>
            <ul className="flex flex-wrap gap-2.5">
              {featured.palette.map((swatch) => (
                <li
                  key={swatch.name}
                  className="inline-flex items-center gap-2 rounded-chip bg-surface-sunken py-1.5 pl-2 pr-3.5 text-[0.85rem] font-semibold text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="block h-5 w-5 rounded-full shadow-lift"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  {swatch.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            <SurpriseButton variant="solid" />
            <Link
              to={{ pathname: `/b/piece/${featured.id}`, search }}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-chip border-2 border-ink px-5 text-[1.02rem] font-bold text-ink transition-colors hover:bg-ink hover:text-surface-raised"
            >
              Open piece
              <Icon name="arrow-left" size={19} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function IdeaCard({ reference }: { reference: PaintReference }) {
  const { search } = useLocation();
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface-raised shadow-lift transition-transform hover:-translate-y-1">
      <div className="relative">
        <Link
          to={{ pathname: `/b/piece/${reference.id}`, search }}
          aria-label={`Open ${reference.title}`}
        >
          <RefArt reference={reference} className="aspect-[5/4] w-full" />
        </Link>
        <div className="absolute right-3 top-3">
          <SaveButton reference={reference} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          to={{ pathname: `/b/piece/${reference.id}`, search }}
          className="font-display text-[1.3rem] font-bold leading-tight tracking-tight text-ink underline-offset-4 group-hover:underline"
        >
          {reference.title}
        </Link>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <TimeBadge reference={reference} />
          <DifficultyBadge reference={reference} />
        </div>
      </div>
    </div>
  );
}

/* Colour lives in the badges - each pigment role gets its own dot. */

function TimeBadge({ reference }: { reference: PaintReference }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
      <Icon name="clock" size={15} style={{ color: "rgb(var(--pig-teal))" }} />
      <span className="tnum">{reference.minutes}</span>&nbsp;min
    </span>
  );
}

function DifficultyBadge({ reference }: { reference: PaintReference }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
      <span style={{ color: "rgb(var(--pig-ochre))" }}>
        <DifficultyMark difficulty={reference.difficulty} />
      </span>
      {DIFFICULTY_LABEL[reference.difficulty]}
    </span>
  );
}

function SubjectBadge({ reference }: { reference: PaintReference }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
      <span
        aria-hidden="true"
        className="block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: "rgb(var(--pig-rose))" }}
      />
      {SUBJECT_LABEL[reference.subject]}
    </span>
  );
}
