import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { findReference } from "@/lib/catalog";
import { RefArt } from "@/components/RefArt";
import { SaveButton } from "@/components/SaveButton";
import { EnlargeDialog } from "@/components/EnlargeDialog";
import { Icon } from "@/components/Icon";
import { DifficultyMark } from "@/components/DifficultyMark";
import { DIFFICULTY_LABEL, SUBJECT_LABEL } from "@/lib/types";

/** Direction B reference detail: enlarged uncropped art, palette, brush tip. */
export function DetailB() {
  const { id } = useParams();
  const { references } = useApp();
  const { search } = useLocation();
  const [enlarged, setEnlarged] = useState(false);
  const reference = findReference(references, id);

  if (!reference) {
    return (
      <div className="mx-auto max-w-reading px-4 py-16 sm:px-6">
        <p className="font-display text-2xl font-bold text-ink">
          That piece isn&rsquo;t here
        </p>
        <p className="mt-2 text-ink-soft">Head back and pick another.</p>
        <Link
          to="/b"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-chip bg-accent px-5 font-bold text-accent-ink"
        >
          <Icon name="arrow-left" size={19} /> Back to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <Link
        to={{ pathname: "/b", search }}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-chip pr-3 text-[0.95rem] font-bold text-ink-soft hover:text-ink"
      >
        <Icon name="arrow-left" size={19} /> Today
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-card bg-surface-raised shadow-plate">
            <RefArt
              reference={reference}
              priority
              inset="roomy"
              className="aspect-square w-full"
            />
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              className="absolute bottom-4 right-4 inline-flex min-h-[44px] items-center gap-2 rounded-chip bg-ink px-4 text-[0.9rem] font-bold text-surface-raised shadow-lift hover:opacity-90"
            >
              <Icon name="expand" size={18} /> Enlarge
            </button>
          </div>
          <p className="mt-3 text-[0.8rem] font-medium text-ink-faint">
            Shown uncropped on a neutral mat so the colours read true. Source:{" "}
            {reference.source}.
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
              <Icon name="clock" size={15} style={{ color: "rgb(var(--pig-teal))" }} />
              <span className="tnum">{reference.minutes}</span>&nbsp;min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
              <span style={{ color: "rgb(var(--pig-ochre))" }}>
                <DifficultyMark difficulty={reference.difficulty} />
              </span>
              {DIFFICULTY_LABEL[reference.difficulty]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-[0.82rem] font-bold text-ink">
              <span
                aria-hidden="true"
                className="block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "rgb(var(--pig-rose))" }}
              />
              {SUBJECT_LABEL[reference.subject]}
            </span>
          </div>

          <h1 className="text-balance font-display text-[2.4rem] font-extrabold leading-[1.0] tracking-tight text-ink">
            {reference.title}
          </h1>
          <p className="mt-2.5 text-pretty text-[1.1rem] font-medium leading-relaxed text-ink-soft">
            {reference.prompt}
          </p>

          <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-1.5 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink-faint">
              <Icon name="palette" size={16} /> Mix from
            </h2>
            <ul className="flex flex-wrap gap-2.5">
              {reference.palette.map((swatch) => (
                <li
                  key={swatch.name}
                  className="inline-flex items-center gap-2 rounded-chip bg-surface-sunken py-1.5 pl-2 pr-3.5 text-[0.88rem] font-semibold text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="block h-6 w-6 rounded-full shadow-lift"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  {swatch.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-7 rounded-card bg-[rgb(var(--pig-teal)/0.1)] p-4">
            <h2 className="flex items-center gap-2 font-display text-[1.1rem] font-bold text-ink">
              <Icon name="brush" size={19} /> One small tip
            </h2>
            <p className="mt-1.5 text-pretty text-[1rem] font-medium leading-relaxed text-ink-soft">
              {reference.tip}
            </p>
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SaveButton reference={reference} variant="full" />
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-chip border-2 border-ink px-4 text-[0.95rem] font-bold text-ink hover:bg-ink hover:text-surface-raised"
            >
              <Icon name="expand" size={18} /> Paint beside it
            </button>
          </div>
        </div>
      </div>

      <EnlargeDialog
        reference={reference}
        open={enlarged}
        onClose={() => setEnlarged(false)}
      />
    </div>
  );
}
