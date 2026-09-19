import { useEffect, useRef, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { filterReferences } from "@/lib/catalog";
import { REFERENCES } from "@/data/references";
import { COLLECTIONS, collectionSearch, type Collection } from "@/data/collections";
import { RefArt } from "@/components/RefArt";
import { PieceCard } from "@/components/PieceCard";
import {
  ClearFilters,
  FilterControls,
  PrimaryFilters,
  SubjectSheet,
} from "@/components/FilterControls";
import { EmptyState } from "@/components/EmptyState";
import { type PaintReference, type Subject } from "@/lib/types";

function coverFor(subject: Subject): PaintReference | undefined {
  return REFERENCES.find((r) => r.subject === subject) ?? REFERENCES[0];
}

export function Browse() {
  const { visible, activeFilters } = useApp();
  const results = useRef<HTMLHeadingElement>(null);
  const jumpPending = useRef(false);

  /*
    Choosing a collection changes the results, which on a phone sit ~1500px
    below the fold behind five collection cards and the filter panel. The count
    changed, the live region announced it, and to anyone looking at the screen
    the tap did nothing.

    So the results come to the user. Focus moves to the results heading rather
    than only scrolling: it takes the keyboard with it, so tabbing carries on
    into the results instead of back at the collection you just left, and it
    names where you landed. `.jump-target` keeps it clear of the sticky header.
  */
  const jumpToResults = (event: MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift-click and middle-click open the collection elsewhere and
    // navigate nothing here. Arming the jump would leave the flag set until
    // some later, unrelated render consumed it and yanked the page.
    const opensElsewhere =
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;
    if (opensElsewhere) return;
    jumpPending.current = true;
  };

  useEffect(() => {
    if (!jumpPending.current) return;
    jumpPending.current = false;

    const heading = results.current;
    if (!heading) return;

    // Already comfortably in view (desktop, where nothing is hidden) - moving
    // the page under someone who can see the change would be the ruder option.
    const box = heading.getBoundingClientRect();
    const alreadyVisible = box.top >= 0 && box.bottom <= window.innerHeight;

    heading.focus({ preventScroll: true });
    if (!alreadyVisible) {
      const still =
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    }
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Browse the studio
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          Start from a collection, or filter the whole catalogue to whatever fits
          your afternoon.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl font-medium tracking-tight text-ink">
          Collections
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((collection) => (
            <li key={collection.id}>
              <CollectionCard collection={collection} onChosen={jumpToResults} />
            </li>
          ))}
        </ul>
      </section>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "piece" : "pieces"} in view.
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          {/*
            Same hierarchy as Today on small screens: the controls precede the
            results they act on rather than collapsing to the foot of a very
            long page.
          */}
          <section aria-label="Narrow the catalogue" className="mb-8 lg:hidden">
            <div className="flex flex-col gap-5 rounded-card border border-line bg-surface-raised p-4 shadow-lift">
              <PrimaryFilters idPrefix="browse-m" />
              <SubjectSheet idPrefix="browse-m" />
              <ClearFilters className="self-start" />
            </div>
          </section>

          <div className="flex items-baseline gap-3 border-b border-line pb-2">
            <h2
              ref={results}
              tabIndex={-1}
              className="jump-target font-display text-xl font-medium tracking-tight text-ink"
            >
              {activeFilters > 0 ? "Matching pieces" : "The whole catalogue"}
            </h2>
            <span className="tnum text-[0.85rem] text-ink-soft">{visible.length}</span>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6">
              <EmptyState />
            </div>
          ) : (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((reference) => (
                <li key={reference.id}>
                  <PieceCard reference={reference} to={`/piece/${reference.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-card border border-line bg-surface-raised p-5 shadow-lift">
            <FilterControls idPrefix="browse-d" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function CollectionCard({
  collection,
  onChosen,
}: {
  collection: Collection;
  onChosen: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const count = filterReferences(REFERENCES, {
    time: "all",
    difficulty: "all",
    subject: "all",
    ...collection.filter,
  }).length;
  const cover = coverFor(collection.coverSubject);

  return (
    <Link
      to={{ pathname: "/browse", search: collectionSearch(collection) }}
      onClick={onChosen}
      className="group flex h-full items-stretch gap-4 overflow-hidden rounded-card border border-line bg-surface-raised p-3 shadow-lift transition-transform hover:-translate-y-1"
    >
      <div
        className="shrink-0 rounded-[6px]"
        style={{ boxShadow: `inset 0 0 0 3px rgb(var(${collection.pigmentVar}) / 0.5)` }}
      >
        {cover ? <RefArt reference={cover} className="h-24 w-24 rounded-[6px]" /> : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center py-1">
        <span
          className="mb-1 inline-block h-1.5 w-8 rounded-full"
          style={{ background: `rgb(var(${collection.pigmentVar}))` }}
          aria-hidden="true"
        />
        <p className="font-display text-lg font-medium leading-tight text-ink group-hover:underline">
          {collection.title}
        </p>
        <p className="mt-1 text-pretty text-[0.85rem] leading-snug text-ink-soft">
          {collection.blurb}
        </p>
        <p className="tnum mt-1.5 text-[0.78rem] text-ink-faint">{count} pieces</p>
      </div>
    </Link>
  );
}
