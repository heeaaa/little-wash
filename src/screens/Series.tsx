import { useRef, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { SERIES, SERIES_PARAM, type Series as SeriesEntry } from "@/data/series";
import { findSeries, minutesEach, resolveSeries } from "@/lib/series";
import { sourceInfo } from "@/lib/sources/registry";
import type { SourceId } from "@/lib/sources/types";
import type { PaintReference } from "@/lib/types";
import { claimArtwork } from "@/lib/wash";
import { CreditLine } from "@/components/CreditLine";
import { EmptyPanel } from "@/components/EmptyPanel";
import { Icon } from "@/components/Icon";
import { MetaRow } from "@/components/MetaRow";
import { PaintedNote } from "@/components/PaintedNote";
import { RefArt } from "@/components/RefArt";
import { SaveButton } from "@/components/SaveButton";
import { WashLink } from "@/components/WashLink";

const BACK_LINK =
  "inline-flex min-h-[44px] items-center gap-2 rounded-chip pr-3 text-[0.95rem] font-semibold text-ink-soft hover:text-ink";

const PRIMARY =
  "inline-flex min-h-[44px] items-center gap-2 rounded-chip bg-accent px-5 text-[0.95rem] font-semibold text-accent-ink shadow-lift";

const QUIET =
  "inline-flex min-h-[44px] items-center text-[0.95rem] font-semibold text-teal underline decoration-[rgb(var(--teal)/0.35)] underline-offset-4 hover:decoration-[rgb(var(--teal))]";

/** "Pexels", "Pexels and Unsplash", "Pexels, Unsplash and The Met". */
function namesOf(sources: readonly SourceId[]): string {
  const names = sources.map((id) => sourceInfo(id).label);
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One series, in the order it is meant to be painted.
 *
 * A contents page rather than a gallery: every piece in a numbered row, so the
 * whole run can be read in a screen or two and the next one found at a
 * glance. The numbers are the order and nothing else. Nothing unlocks, nothing
 * is counted, and a piece shows the day it was painted the way the studio
 * does - its own date, never a tally across the series (PRODUCT.md:94).
 */
export function Series() {
  const { id } = useParams();
  const { catalogue, references, painted } = useApp();
  const series = findSeries(SERIES, id);
  const state = series ? resolveSeries(series, catalogue, references) : null;

  if (!series || !state || state.kind === "missing") {
    return (
      <SeriesPage>
        <EmptyPanel
          icon="grid"
          title="That series isn’t here"
          titleAs="h1"
          description={
            <p className="text-pretty text-[0.95rem] text-ink-soft">
              It may have been renamed. You&rsquo;ll find every series at the
              top of Browse.
            </p>
          }
        >
          <Link to="/browse" className={PRIMARY}>
            Browse the catalogue
          </Link>
        </EmptyPanel>
      </SeriesPage>
    );
  }

  /*
    A series is offered whole or not at all, so switching off a source it
    draws on takes it out of Browse. Someone arriving from a saved or shared
    link gets the reason and the switch, not a series with holes in it.
  */
  if (state.kind === "withdrawn") {
    const names = namesOf(state.sources);
    return (
      <SeriesPage>
        <div className={SPLIT}>
          <SeriesHeader series={series} />
          <EmptyPanel
            icon="grid"
            title={`This series needs ${names}`}
            titleAs="h2"
            description={
              <p className="text-pretty text-[0.95rem] text-ink-soft">
                Some of its pieces are from {names}, which you have switched
                off. Switch {state.sources.length === 1 ? "it" : "them"} back
                on to paint the whole series.
              </p>
            }
          >
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link to="/sources" className={PRIMARY}>
                Where ideas come from
              </Link>
              <Link to="/browse" className={QUIET}>
                Browse the catalogue
              </Link>
            </div>
          </EmptyPanel>
        </div>
      </SeriesPage>
    );
  }

  const pieces = state.pieces;

  return (
    <SeriesPage>
      <div className={SPLIT}>
        <SeriesHeader series={series}>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-ink-soft">
            <Icon name="clock" size={16} />
            <span className="tnum">
              {pieces.length} pieces &middot; {minutesEach(pieces)}
            </span>
          </p>
          <p className="mt-3 text-pretty text-[0.9rem] leading-relaxed text-ink-soft">
            Take them in order, one a day or all in one go. Nothing unlocks, and
            nothing here keeps score.
          </p>
        </SeriesHeader>

        <ol className="space-y-4">
          {pieces.map((reference, index) => (
            <li key={reference.id}>
              <SeriesRow
                series={series}
                reference={reference}
                number={index + 1}
                paintedOn={painted.find((entry) => entry.id === reference.id)?.on}
              />
            </li>
          ))}
        </ol>
      </div>
    </SeriesPage>
  );
}

function SeriesPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <Link to="/browse" className={BACK_LINK}>
        <Icon name="arrow-left" size={19} /> Browse
      </Link>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** The introduction and the run side by side from `lg`, stacked below it. */
const SPLIT = "grid gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-12";

/**
 * What the series is. Kept when the series cannot be shown, so someone who
 * followed a link still learns what they were sent to before being told what
 * is in the way.
 */
function SeriesHeader({ series, children }: { series: SeriesEntry; children?: ReactNode }) {
  return (
    <header className="max-w-reading lg:sticky lg:top-24 lg:self-start">
      <span
        className="mb-3 block h-1.5 w-10 rounded-full"
        style={{ background: `rgb(var(${series.pigmentVar}))` }}
        aria-hidden="true"
      />
      <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
        {series.title}
      </h1>
      <p className="mt-3 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
        {series.blurb}
      </p>
      {children}
    </header>
  );
}

interface SeriesRowProps {
  series: SeriesEntry;
  reference: PaintReference;
  number: number;
  /** The day it was painted, if it has been. */
  paintedOn?: string;
}

/**
 * One piece in the run. A card with one link, the title, like every card in
 * the app: the overlay makes the whole row the target, Save sits above it, and
 * the artwork claims the shared name only at the moment of leaving, so it can
 * morph into Detail's plate.
 */
function SeriesRow({ series, reference, number, paintedOn }: SeriesRowProps) {
  const art = useRef<HTMLDivElement>(null);

  return (
    <div className="group relative grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-card border border-line bg-surface-raised p-3 shadow-lift transition-transform hover:-translate-y-0.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-4 lg:grid-cols-[10.5rem_minmax(0,1fr)_auto]">
      <RefArt
        reference={reference}
        containerRef={art}
        sizes="(min-width: 1024px) 168px, (min-width: 640px) 136px, 80px"
        className="col-start-1 row-start-1 aspect-[5/4] w-full self-start rounded-[6px]"
      />

      {/*
        On a phone the text takes the whole column beside the plate - at 320px
        a Save button in the title line left the title 88px, one word a line -
        and Save sits under the plate instead. From `sm` it has its own column.
      */}
      <div className="col-start-2 row-span-2 row-start-1 flex min-w-0 flex-col gap-1.5 sm:row-span-1">
        <p className="flex min-w-0 items-baseline gap-2 font-display text-[1.05rem] font-medium leading-snug text-ink sm:text-lg">
          <span className="tnum shrink-0 text-ink-faint">{number}</span>
          <WashLink
            to={{
              pathname: `/piece/${reference.id}`,
              search: `?${new URLSearchParams({ [SERIES_PARAM]: series.id })}`,
            }}
            onBeforeMove={() => claimArtwork(art.current)}
            className="card-link min-w-0 underline-offset-4 group-hover:underline"
          >
            {reference.title}
          </WashLink>
        </p>
        <MetaRow reference={reference} />
        {paintedOn ? <PaintedNote on={paintedOn} /> : null}
        <CreditLine reference={reference} />
      </div>

      {/* Above the title link's overlay, so it saves rather than opens. */}
      <div className="relative z-[2] col-start-1 row-start-2 self-start justify-self-center sm:col-start-3 sm:row-start-1 sm:-mr-1 sm:-mt-1">
        <SaveButton reference={reference} />
      </div>
    </div>
  );
}
