import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { RefArt } from "@/components/RefArt";
import { PaletteRow } from "@/components/PaletteRow";
import { SaveButton } from "@/components/SaveButton";
import { SurpriseButton } from "@/components/SurpriseButton";
import {
  ClearFilters,
  FilterControls,
  PrimaryFilters,
  SubjectSheet,
} from "@/components/FilterControls";
import { EmptyState } from "@/components/EmptyState";
import { SubjectTag } from "@/components/SubjectTag";
import { CreditLine } from "@/components/CreditLine";
import { MetaRow } from "@/components/MetaRow";
import { Icon } from "@/components/Icon";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { PIECE_ART } from "@/lib/wash";
import { WashLink } from "@/components/WashLink";
import { HiddenUndo, NotForMeButton } from "@/components/NotForMe";

/** The piece just hidden from Today, and the piece dealt in its place. */
interface Hiding {
  id: string;
  title: string;
  next: string | null;
}

/**
 * Today is a decision surface, not a document: one piece, its identity, the
 * action, then the two questions the product is positioned on. The catalogue
 * lives on Browse - offering the rest of it here would hand back the very
 * deliberation this screen exists to remove.
 */
export function Today() {
  const { featured, visible, hiddenMatching, notForMe, undoNotForMe } = useApp();
  const [hiding, setHiding] = useState<Hiding | null>(null);
  /*
    Which control to give focus back to once the piece has changed. The
    featured piece is keyed by its id, so a deal or a hide replaces the very
    button that was pressed; without this, focus fell back to the page.
  */
  const refocus = useRef<string | null>(null);

  // Undo is offered while the piece dealt in its place is still the one on
  // screen: the next deal, filter or page takes it away, with no timer.
  const undo = hiding && (featured?.id ?? null) === hiding.next ? hiding : null;

  const hide = () => {
    if (!featured) return;
    const { id, title } = featured;
    refocus.current = "not-for-me";
    const next = notForMe();
    setHiding({ id, title, next: next?.id ?? null });
  };

  const restore = () => {
    if (!undo) return;
    refocus.current = "not-for-me";
    undoNotForMe(undo.id);
    setHiding(null);
  };

  return (
    <div className="today-page mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:py-12">
      <h1 className="today-title text-balance font-display text-[1.5rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.1rem] lg:text-[2.5rem]">
        Today&rsquo;s wash
      </h1>

      <PieceAnnouncer hiddenTitle={undo?.title ?? null} />

      <div className="today-grid mt-4 grid gap-10 sm:mt-5 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          {featured ? (
            <FeaturedPlate undo={undo} onHide={hide} onUndo={restore} refocus={refocus} />
          ) : (
            <>
              {/* Everything that matched is hidden now: the way back comes first. */}
              {undo ? <HiddenUndo title={undo.title} onUndo={restore} focusOnArrival /> : null}
              <EmptyState />
            </>
          )}

          {/*
            Phone and tablet: the controls sit directly under the piece, so
            changing one is visibly connected to the other. The desktop rail
            below carries the same hierarchy in a different container.
          */}
          <section aria-label="Narrow today's idea" className="mt-5 lg:hidden">
            <div className="flex flex-col gap-5 rounded-card border border-line bg-surface-raised p-4 shadow-lift">
              <PrimaryFilters idPrefix="today-m" />
              <SubjectSheet idPrefix="today-m" />
              <ClearFilters className="self-start" />
            </div>
          </section>

          {/*
            The palette follows the controls, not the piece. It is what you need
            once you have committed, so it must not sit between the action and
            the two questions that change the piece.
          */}
          {featured ? (
            <section className="mt-6 border-t border-line pt-5 lg:mt-8">
              <h3 className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                <Icon name="palette" size={15} /> Suggested palette
              </h3>
              <PaletteRow palette={featured.palette} variant="dabs" showNames />
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-card border border-line bg-surface-raised p-5 shadow-lift">
            <FilterControls idPrefix="today-d" />
          </div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length === 0 && hiddenMatching.length > 0
          ? "Every idea that matches your filters is hidden."
          : `${visible.length} ${visible.length === 1 ? "idea matches" : "ideas match"} your filters.`}
      </p>
    </div>
  );
}

/**
 * Announces the piece itself, not just how many matched. Without this the one
 * playful gesture in the product ("Deal me another") is silent: the heading
 * changes off-screen and nothing tells a screen reader, or a user scrolled past
 * the artwork, that anything happened.
 */
function PieceAnnouncer({ hiddenTitle }: { hiddenTitle: string | null }) {
  const { featured, hiddenMatching } = useApp();
  const [message, setMessage] = useState("");
  const first = useRef(true);
  // Read when the piece changes, not a reason to speak on their own.
  const context = useRef({ hiddenTitle, hiddenAny: hiddenMatching.length > 0 });
  context.current = { hiddenTitle, hiddenAny: hiddenMatching.length > 0 };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const { hiddenTitle: title, hiddenAny } = context.current;
    const hidden = title ? `${title} is hidden. ` : "";
    setMessage(
      featured
        ? `${hidden}Now showing ${featured.title}, ${featured.minutes} minutes, ${DIFFICULTY_LABEL[featured.difficulty]}.`
        : hiddenAny
          ? `${hidden}Every piece that matches your filters is hidden.`
          : "No pieces match your filters.",
    );
  }, [featured]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  );
}

function FeaturedPlate({
  undo,
  onHide,
  onUndo,
  refocus,
}: {
  undo: Hiding | null;
  onHide: () => void;
  onUndo: () => void;
  refocus: MutableRefObject<string | null>;
}) {
  const { featured, visible } = useApp();
  const { search } = useLocation();
  const actions = useRef<HTMLDivElement>(null);

  // Give focus back to the control that changed the piece (see Today).
  useEffect(() => {
    const action = refocus.current;
    if (!action) return;
    refocus.current = null;
    const root = actions.current;
    root?.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus({ preventScroll: true });
    /*
      After a hide, the way back is the next thing someone may want, and it
      appears under the row - below the fold on a phone propped sideways
      (measured 19/10/2026 at 667x375: 383-427 of 375). A control that changes
      something off-screen brings you to it (DESIGN.md).
    */
    if (action === "not-for-me") root?.querySelector(".hidden-undo")?.scrollIntoView({ block: "nearest" });
  }, [featured?.id, refocus]);

  if (!featured) return null;

  const onlyOne = visible.length <= 1;

  return (
    <article data-testid="featured" key={featured.id} className="featured-piece piece-settle">
      <div className="featured-plate relative rounded-card border border-line bg-surface-raised p-3 shadow-plate sm:p-4">
        <WashLink
          to={{ pathname: `/piece/${featured.id}`, search }}
          aria-label={`Open ${featured.title}`}
          className="group block"
        >
          {/*
            snug, not roomy: the mat was the largest object on the screen with
            the subject floating small inside it. The artwork is what the
            viewport is for.
          */}
          <RefArt
            reference={featured}
            priority
            inset="snug"
            transitionName={PIECE_ART}
            ownAspect
            className="art-cap aspect-[4/3] w-full rounded-[6px]"
          />
        </WashLink>
        <div className="absolute right-5 top-5 sm:right-6 sm:top-6">
          <SaveButton reference={featured} />
        </div>
      </div>

      <div className="featured-identity mt-3.5">
        <SubjectTag subject={featured.subject} rotate={-2} />
        <h2 className="featured-title mt-1.5 text-balance font-display text-[1.45rem] font-medium leading-tight tracking-tight text-ink sm:text-[1.9rem]">
          {featured.title}
        </h2>
        {featured.prompt ? (
          <p className="featured-prompt mt-1 max-w-reading text-pretty font-display text-[1.02rem] italic leading-relaxed text-ink-soft sm:text-[1.1rem]">
            {featured.prompt}
          </p>
        ) : null}

        <MetaRow reference={featured} className="mt-2.5" />
        <CreditLine reference={featured} className="mt-2" />
      </div>

      <div ref={actions} className="featured-actions mt-4">
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-3"
          // A deal replaces the piece, and with it this button (Not for me is set in hide).
          onClickCapture={(event) => {
            const action = (event.target as HTMLElement).closest("[data-action]")?.getAttribute("data-action");
            if (action === "deal") refocus.current = action;
          }}
        >
          <WashLink
            to={{ pathname: `/piece/${featured.id}`, search }}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-chip bg-accent px-6 text-[1.02rem] font-semibold text-accent-ink shadow-lift transition-transform hover:-translate-y-0.5 sm:flex-none"
          >
            Open this piece
            <Icon name="arrow-left" size={19} className="rotate-180" />
          </WashLink>
          <SaveButton reference={featured} variant="full" className="featured-save-full" />
          <SurpriseButton variant="quiet" describedBy="deal-note" action="deal" />
          <NotForMeButton reference={featured} onPress={onHide} />
        </div>
        {undo ? <HiddenUndo title={undo.title} onUndo={onUndo} /> : null}
        {onlyOne ? (
          <p id="deal-note" className="mt-2 text-[0.85rem] text-ink-soft">
            Only one piece matches right now, so there is nothing else to deal.
          </p>
        ) : null}
      </div>
    </article>
  );
}
