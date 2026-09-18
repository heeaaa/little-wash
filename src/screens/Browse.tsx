import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { filterReferences } from "@/lib/catalog";
import { REFERENCES } from "@/data/references";
import { COLLECTIONS, collectionSearch, type Collection } from "@/data/collections";
import { RefArt } from "@/components/RefArt";
import { MetaRow } from "@/components/MetaRow";
import { SaveButton } from "@/components/SaveButton";
import { SubjectTag } from "@/components/SubjectTag";
import { FilterControls } from "@/components/FilterControls";
import { EmptyState } from "@/components/EmptyState";
import { type PaintReference, pigment, type Subject } from "@/lib/types";

function coverFor(subject: Subject): PaintReference | undefined {
  return REFERENCES.find((r) => r.subject === subject) ?? REFERENCES[0];
}

export function Browse() {
  const { direction, visible, activeFilters } = useApp();

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
              <CollectionCard collection={collection} />
            </li>
          ))}
        </ul>
      </section>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "piece" : "pieces"} in view.
      </p>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 border-b border-line pb-2">
            <h2 className="font-display text-xl font-medium tracking-tight text-ink">
              {activeFilters > 0 ? "Matching pieces" : "The whole catalogue"}
            </h2>
            <span className="tnum text-[0.85rem] text-ink-faint">{visible.length}</span>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6">
              <EmptyState />
            </div>
          ) : (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((reference) => (
                <li key={reference.id}>
                  <BrowseCard reference={reference} to={`/${direction}/piece/${reference.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-surface-raised p-5 shadow-lift">
            <FilterControls layout="stack" idPrefix="browse" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const { direction } = useApp();
  const count = filterReferences(REFERENCES, {
    time: "all",
    difficulty: "all",
    subject: "all",
    ...collection.filter,
  }).length;
  const cover = coverFor(collection.coverSubject);

  return (
    <Link
      to={{ pathname: `/${direction}/browse`, search: collectionSearch(collection) }}
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

function BrowseCard({ reference, to }: { reference: PaintReference; to: string }) {
  const { treatment } = useApp();
  const { search } = useLocation();
  const chaos = treatment === "chaos";
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-raised shadow-lift transition-transform hover:-translate-y-1">
      <div className="relative">
        <Link to={{ pathname: to, search }} aria-label={`Open ${reference.title}`}>
          <div
            style={
              chaos
                ? { boxShadow: `inset 0 -4px 0 ${pigment(reference.subject, 0.55)}` }
                : undefined
            }
          >
            <RefArt reference={reference} className="aspect-[5/4] w-full" />
          </div>
        </Link>
        <div className="absolute right-3 top-3">
          <SaveButton reference={reference} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <SubjectTag subject={reference.subject} rotate={-3} />
        </div>
        <Link
          to={{ pathname: to, search }}
          className="font-display text-lg font-medium leading-tight text-ink underline-offset-4 group-hover:underline"
        >
          {reference.title}
        </Link>
        <MetaRow reference={reference} className="mt-auto pt-1" />
      </div>
    </div>
  );
}
