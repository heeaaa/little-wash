import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { WashLink } from "@/components/WashLink";
import { useApp } from "@/state/AppContext";
import { findReference } from "@/lib/catalog";
import { RefArt } from "@/components/RefArt";
import { PaletteRow } from "@/components/PaletteRow";
import { MetaRow } from "@/components/MetaRow";
import { SaveButton } from "@/components/SaveButton";
import { EnlargeDialog } from "@/components/EnlargeDialog";
import { SubjectTag } from "@/components/SubjectTag";
import { WashiTag } from "@/components/studio/WashiTag";
import { Icon } from "@/components/Icon";
import { pigment } from "@/lib/types";
import { PIECE_ART, move } from "@/lib/wash";

export function Detail() {
  const { id } = useParams();
  const { references } = useApp();
  const { search, state } = useLocation();
  const [enlarged, setEnlarged] = useState(false);

  /*
    Back goes where you came from. It always returned to Today, so arriving
    from Browse or the studio and going back lost your place in the catalogue -
    and it made a third link to `/` on a page that already had two.
  */
  const from = typeof (state as { from?: unknown } | null)?.from === "string"
    ? (state as { from: string }).from
    : null;
  const back = from?.startsWith("/browse")
    ? { to: from, label: "Browse" }
    : from?.startsWith("/studio")
      ? { to: from, label: "Your studio" }
      : { to: { pathname: "/", search }, label: "Today’s wash" };
  const reference = findReference(references, id);

  if (!reference) {
    return (
      <div className="mx-auto max-w-reading px-4 py-16 sm:px-6">
        <p className="font-display text-2xl text-ink">That piece isn&rsquo;t here</p>
        <p className="mt-2 text-ink-soft">It may have been renamed. Head back to today&rsquo;s ideas.</p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-chip bg-accent px-5 font-semibold text-accent-ink"
        >
          <Icon name="arrow-left" size={19} /> Back to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="detail-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <WashLink
        to={back.to}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-chip pr-3 text-[0.95rem] font-semibold text-ink-soft hover:text-ink"
      >
        <Icon name="arrow-left" size={19} /> {back.label}
      </WashLink>

      <div className="detail-grid mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <div
            className="detail-art relative rounded-card border border-line bg-surface-raised p-3 shadow-plate sm:p-4"
            style={{
              boxShadow: `0 0 0 4px ${pigment(reference.subject, 0.28)}, var(--shadow-plate)`,
            }}
          >
            <RefArt
              reference={reference}
              priority
              inset="roomy"
              transitionName={enlarged ? undefined : PIECE_ART}
              className="aspect-square w-full rounded-[6px]"
            />
            <button
              type="button"
              onClick={() => move(() => setEnlarged(true))}
              className="detail-enlarge absolute bottom-5 right-5 inline-flex min-h-[44px] items-center gap-2 rounded-chip border border-line bg-[rgb(var(--surface-raised)/0.92)] px-3.5 text-[0.9rem] font-semibold text-ink shadow-lift backdrop-blur hover:border-[rgb(var(--ink)/0.35)] sm:bottom-6 sm:right-6"
            >
              <Icon name="expand" size={18} /> Enlarge
            </button>
          </div>
          <p className="mt-3 text-[0.8rem] text-ink-faint">
            Shown uncropped on a neutral mat so the colours read true. Source:{" "}
            {reference.source}.
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-2.5">
            <SubjectTag subject={reference.subject} />
          </div>
          <h1 className="text-balance font-display text-[2.1rem] font-medium leading-tight tracking-tight text-ink">
            {reference.title}
          </h1>
          <p className="mt-2 max-w-reading text-pretty font-display text-[1.15rem] italic leading-relaxed text-ink-soft">
            {reference.prompt}
          </p>
          <MetaRow reference={reference} className="mt-4" />

          <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-faint">
              <Icon name="palette" size={15} /> Suggested palette
            </h2>
            <PaletteRow palette={reference.palette} variant="dabs" showNames />
          </section>

          <section
            className="mt-7 rounded-card p-4"
            style={{ background: pigment(reference.subject, 0.12) }}
          >
            <h2 className="flex items-center gap-2 font-display text-[1.05rem] font-semibold text-ink">
              <WashiTag pigmentVar="--pig-landscape" rotate={-3}>
                <Icon name="brush" size={15} /> Tip
              </WashiTag>
            </h2>
            <p className="mt-2 text-pretty text-[0.98rem] leading-relaxed text-ink-soft">
              {reference.tip}
            </p>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SaveButton reference={reference} variant="full" />
            <button
              type="button"
              onClick={() => move(() => setEnlarged(true))}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-chip border border-line bg-surface-raised px-4 text-[0.95rem] font-semibold text-ink hover:border-[rgb(var(--ink)/0.35)]"
            >
              <Icon name="expand" size={18} /> Paint beside it
            </button>
          </div>
        </div>
      </div>

      <EnlargeDialog reference={reference} open={enlarged} onClose={() => move(() => setEnlarged(false))} />
    </div>
  );
}
