import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { savedReferences } from "@/lib/catalog";

/** How many swatches fit the header before the count carries the rest. */
const VISIBLE = 5;

/**
 * The colours you have collected.
 *
 * Saving a piece lays a swatch of its own first pigment onto the studio table.
 * It replaces an abstract counter that told you a number and led nowhere, in a
 * product whose tagline is "a little colour, every day" and which otherwise
 * never accumulated any.
 *
 * This is a record, not a score. It rises and falls with what is saved, has no
 * target and no streak, and never uses achievement language - PRODUCT.md rules
 * those out, and the roadmap asks instead for "a quiet record to enjoy".
 *
 * The colour is real: every reference carries a named palette, and the first
 * swatch is the piece's primary wash. Nothing here tints artwork or invents a
 * hue.
 */
export function SavedPalette() {
  const { favorites, references } = useApp();

  const saved = savedReferences(references, favorites);

  const shown = saved.slice(0, VISIBLE);
  const overflow = saved.length - shown.length;

  /*
    Only a swatch added during this session settles in. Without this, every
    page load would replay an entrance for the whole palette, which DESIGN.md
    rules out and which would make a quiet record feel like a fanfare.
  */
  const seen = useRef<Set<string> | null>(null);
  const settled = new Set(seen.current ?? shown.map((r) => r.id));
  useEffect(() => {
    seen.current = new Set(saved.map((r) => r.id));
  });

  /*
    A link's name says where it goes and what is waiting there. It used to read
    out pigment names, which described the swatches rather than the pieces and
    told a screen-reader user nothing they could act on.
  */
  const label =
    saved.length === 0
      ? "Your studio: nothing set aside yet"
      : `Your studio: ${saved.length} saved ${saved.length === 1 ? "piece" : "pieces"}`;

  return (
    /*
      The destination for every save in the app. It was a non-interactive span:
      the swatches appeared, and there was nowhere to go and no way to reach
      them by keyboard. Sized to the 44px floor like every other header control.
    */
    <Link
      to="/studio"
      aria-label={label}
      title={label}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-chip px-2 py-1.5 hover:bg-[rgb(var(--ink)/0.05)]"
    >
      {saved.length === 0 ? (
        /*
          An empty well, not a zero. It is the invitation - the first save
          replaces it with a real colour - and it holds the header's right-hand
          slot so the nav does not slide over when nothing is saved yet.
        */
        <span
          aria-hidden="true"
          className="dab block h-[13px] w-[13px] border border-line bg-surface-sunken"
        />
      ) : (
        <span aria-hidden="true" className="flex items-center">
          {shown.map((reference, i) => (
            <span
              key={reference.id}
              /*
                Swatches overlap the way they would if you had laid them down
                one after another, and alternate their tilt so the row reads as
                hand-placed rather than generated.

                Two rings hold that up: paper on the inside so overlapping
                swatches stay separable, then a faint ink edge so a pale pigment
                keeps a boundary against the pale header. Some first swatches
                sit at 1.3:1 against Paper - readable by hue, but edgeless
                without it. The content is carried by the label and the count,
                not by the swatches themselves.
              */
              className={`dab block h-[13px] w-[13px] shrink-0 shadow-[0_0_0_1.5px_rgb(var(--surface-raised)),0_0_0_2.5px_rgb(var(--ink)/0.18)] ${
                i === 0 ? "" : "-ml-[6px]"
              } ${settled.has(reference.id) ? "" : "dab-settle"}`}
              style={{
                backgroundColor: reference.palette[0]?.hex,
                transform: `rotate(${i % 2 === 0 ? 4 : -5}deg)`,
                zIndex: shown.length - i,
              }}
            />
          ))}
        </span>
      )}
      <span className="tnum text-[0.85rem] font-semibold text-ink-soft">
        {overflow > 0 ? `+${overflow}` : saved.length || ""}
      </span>
    </Link>
  );
}
