import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { SOURCE_ORDER, sourceInfo } from "@/lib/sources/registry";
import { Icon } from "@/components/Icon";
import { RefArt } from "@/components/RefArt";
import { SUBJECT_LABEL, type PaintReference } from "@/lib/types";

/**
 * Where ideas come from.
 *
 * A standing preference rather than a filter: time, difficulty and subject are
 * things you change while looking for today's piece, and they live in the URL.
 * This is about what the catalogue is made of, so it is set once and kept.
 *
 * Every source names its licence and links to the institution, because a
 * painter choosing to paint from a collection deserves to know whose work it
 * is and on what terms it is offered.
 */
export function Sources() {
  const { catalogue, references, isSourceEnabled, toggleSourceEnabled } = useApp();

  const countsBySource = new Map<string, number>();
  for (const reference of references) {
    const id = reference.credit.sourceId;
    countsBySource.set(id, (countsBySource.get(id) ?? 0) + 1);
  }

  // Only offer sources the catalogue actually contains. Listing a provider
  // with nothing behind it would promise a collection that is not there.
  const available = SOURCE_ORDER.filter((id) => (countsBySource.get(id) ?? 0) > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Where ideas come from
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          Choose the collections you want to paint from. Pieces you have already
          saved stay in your studio either way, and pieces you marked Not for me
          wait at the foot of this page.
        </p>
      </div>

      <ul className="space-y-3">
        {available.map((id) => {
          const info = sourceInfo(id);
          const enabled = isSourceEnabled(id);
          const count = countsBySource.get(id) ?? 0;

          return (
            <li key={id}>
              <div className="flex items-start gap-4 rounded-card border border-line bg-surface-raised p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h2
                      id={`source-${id}-name`}
                      className="font-display text-[1.1rem] font-medium text-ink"
                    >
                      {info.label}
                    </h2>
                    <span className="tnum text-[0.8rem] text-ink-faint">
                      {count} {count === 1 ? "reference" : "references"}
                    </span>
                    {info.placeholder ? (
                      <span className="rounded-chip border border-line px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">
                        Placeholder
                      </span>
                    ) : null}
                  </div>
                  <p
                    id={`source-${id}-blurb`}
                    className="mt-1 text-pretty text-[0.95rem] leading-relaxed text-ink-soft"
                  >
                    {info.blurb}
                  </p>
                  <p className="mt-1.5 text-[0.8rem] text-ink-faint">
                    {info.licence.name} &middot;{" "}
                    <a
                      href={info.homeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[rgb(var(--ink)/0.25)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]"
                    >
                      Visit {info.label}
                    </a>
                  </p>
                </div>
                {/*
                  A switch rather than a checkbox: it carries its own accessible
                  name, and the control itself can be a 44px target without a
                  checkbox the size of a thumbnail.
                */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-labelledby={`source-${id}-name`}
                  aria-describedby={`source-${id}-blurb`}
                  onClick={() => toggleSourceEnabled(id)}
                  className="relative inline-flex h-11 w-[52px] shrink-0 items-center rounded-full border border-line px-1 transition-colors hover:border-[rgb(var(--ink)/0.35)]"
                  style={{
                    background: enabled
                      ? "rgb(var(--teal) / 0.9)"
                      : "rgb(var(--ink) / 0.12)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`block h-7 w-7 rounded-full bg-surface-raised shadow-lift transition-transform ${
                      enabled ? "translate-x-[18px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        Switching everything off is a legitimate thing to do by accident, and a
        blank Today with no explanation is the worst way to find out.
      */}
      {catalogue.length === 0 ? (
        <p
          role="status"
          className="mt-6 rounded-card border border-line bg-surface-sunken p-4 text-[0.95rem] leading-relaxed text-ink-soft"
        >
          Every source is switched off, so there is nothing to paint. Turn one
          back on above to start again.
        </p>
      ) : null}

      <HiddenPieces />

      <p className="mt-10">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-[0.95rem] font-semibold text-teal underline decoration-[rgb(var(--teal)/0.35)] underline-offset-4 hover:decoration-[rgb(var(--teal))]"
        >
          <Icon name="arrow-left" size={16} /> Back to today
        </Link>
      </p>
    </div>
  );
}

/**
 * Pieces someone marked Not for me, newest first, each with "Bring back".
 *
 * Here rather than in the studio: the studio is a record of what someone kept
 * and painted, and a list of pieces turned down does not belong beside it.
 * This page already holds the standing choices about what is offered.
 *
 * A piece shown again leaves the list at once. Focus moves to the next piece's
 * button, or the one before, or the heading once the list is empty - never to
 * the top of the page.
 */
function HiddenPieces() {
  const { references, hidden, toggleHidden } = useApp();
  const { state } = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [focusAt, setFocusAt] = useState<number | null>(null);
  const [said, setSaid] = useState("");

  // Newest first: the piece just hidden is the one most likely to be wanted back.
  const pieces = hidden
    .map((id) => references.find((reference) => reference.id === id))
    .filter((reference): reference is PaintReference => Boolean(reference))
    .reverse();

  // Arriving from "See what you've hidden": come straight to the list.
  const arrivedFor = (state as { show?: string } | null)?.show;
  useEffect(() => {
    if (arrivedFor !== "hidden") return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
  }, [arrivedFor]);

  useEffect(() => {
    if (focusAt === null) return;
    setFocusAt(null);
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>("button");
    const target = buttons?.[Math.min(focusAt, buttons.length - 1)];
    (target ?? heading.current)?.focus({ preventScroll: true });
  }, [focusAt]);

  const showAgain = (piece: PaintReference, index: number) => {
    toggleHidden(piece.id);
    setSaid(`${piece.title} can come up again on Today and in Browse.`);
    setFocusAt(index);
  };

  return (
    <section aria-labelledby="hidden-pieces" className="mt-12">
      <div className="flex items-baseline gap-3 border-b border-line pb-2">
        <h2
          id="hidden-pieces"
          ref={heading}
          tabIndex={-1}
          className="jump-target font-display text-xl font-medium tracking-tight text-ink"
        >
          Pieces you&rsquo;ve hidden
        </h2>
      </div>

      {pieces.length === 0 ? (
        <p className="mt-4 max-w-reading text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
          Nothing hidden. Anything you mark Not for me waits here, in case you
          change your mind.
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-reading text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
            They stay out of Today and Browse. Bring one back whenever you like.
          </p>
          <ul ref={list} className="mt-3 divide-y divide-line">
            {pieces.map((piece, index) => (
              <li key={piece.id} className="flex items-center gap-3 py-3">
                {/* Its title is beside it: the description would only be read twice over. */}
                <RefArt reference={{ ...piece, alt: "" }} sizes="56px" className="h-14 w-14 shrink-0 rounded-[6px]" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/piece/${piece.id}`}
                    state={{ from: "/sources" }}
                    className="flex min-h-[44px] items-end font-display text-[1.02rem] text-ink underline-offset-4 hover:underline"
                  >
                    <span className="min-w-0 truncate">{piece.title}</span>
                  </Link>
                  <p className="text-[0.82rem] text-ink-faint">
                    {SUBJECT_LABEL[piece.subject]} &middot; <span className="tnum">{piece.minutes}</span> min
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => showAgain(piece, index)}
                  aria-label={`Bring back: ${piece.title}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-chip border border-line bg-surface-raised px-3 text-[0.9rem] font-semibold text-ink hover:border-[rgb(var(--ink)/0.35)]"
                >
                  <Icon name="eye" size={17} />
                  Bring back
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p role="status" className="sr-only">
        {said}
      </p>
    </section>
  );
}
