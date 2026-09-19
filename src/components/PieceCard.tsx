import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { RefArt } from "@/components/RefArt";
import { MetaRow } from "@/components/MetaRow";
import { SaveButton } from "@/components/SaveButton";
import { SubjectTag } from "@/components/SubjectTag";
import { WashLink } from "@/components/WashLink";
import { type PaintReference, pigment } from "@/lib/types";
import { PIECE_ART } from "@/lib/wash";

interface PieceCardProps {
  reference: PaintReference;
  /** Where the card leads, without the query string - it appends the current one. */
  to: string;
}

/**
 * One piece in a grid. Shared by Browse and the studio, because the three
 * things it carries are easy to re-implement subtly wrong:
 *
 * - the `.card-link` overlay, which makes the title the card's *only* link
 *   while the whole card stays tappable;
 * - the save button raised above that overlay, so it saves rather than opens;
 * - the imperative claim on the shared transition name, which is how a grid
 *   takes part in the artwork morph when only one element may hold the name.
 */
export function PieceCard({ reference, to }: PieceCardProps) {
  const { pathname, search } = useLocation();
  const art = useRef<HTMLDivElement>(null);

  /*
    Many cards, one name. The card being left claims it in the instant before
    the browser takes its snapshot, so the name stays unique and the browser is
    never asked to snapshot the other cards' layers, which would pair with
    nothing. Written to the DOM directly because React gets no commit between
    here and the snapshot; the incoming Detail page carries the name afterwards.
  */
  const claimArtwork = () => {
    /*
      Release whatever a previous card claimed first. Nothing clears these -
      React never set them, so it will not remove them - and clicking one card
      then another before the first transition captures would leave two live
      elements holding the name, which the browser rejects by skipping the
      transition outright. Only imperatively claimed elements are touched; the
      ones Today and Detail set through React are left alone.
    */
    for (const claimed of document.querySelectorAll<HTMLElement>("[data-claimed-art]")) {
      claimed.style.viewTransitionName = "";
      claimed.removeAttribute("data-claimed-art");
    }
    const el = art.current;
    if (!el) return;
    el.style.viewTransitionName = PIECE_ART;
    el.setAttribute("data-claimed-art", "");
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-raised shadow-lift transition-transform hover:-translate-y-1">
      <div className="relative">
        <div style={{ boxShadow: `inset 0 -4px 0 ${pigment(reference.subject, 0.55)}` }}>
          <RefArt
            reference={reference}
            containerRef={art}
            className="aspect-[5/4] w-full"
          />
        </div>
        {/*
          Above the title link's full-card overlay, so Save stays reachable and
          does not open the piece.
        */}
        <div className="absolute right-3 top-3 z-[2]">
          <SaveButton reference={reference} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <SubjectTag subject={reference.subject} rotate={-3} />
        </div>
        {/*
          The card's only link. `.card-link` spreads its hit area over the whole
          card, so the artwork is still tappable without putting a second,
          identically-destined link in the tab order (see index.css).
        */}
        <WashLink
          to={{ pathname: to, search }}
          // So Detail can offer a way back to where you actually came from.
          state={{ from: pathname + search }}
          onBeforeMove={claimArtwork}
          className="card-link font-display text-lg font-medium leading-tight text-ink underline-offset-4 group-hover:underline"
        >
          {reference.title}
        </WashLink>
        <MetaRow reference={reference} className="mt-auto pt-1" />
      </div>
    </div>
  );
}
