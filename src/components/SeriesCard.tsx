import { Link } from "react-router-dom";
import { RefArt } from "@/components/RefArt";
import { minutesEach } from "@/lib/series";
import type { Series } from "@/data/series";
import type { PaintReference } from "@/lib/types";

interface SeriesCardProps {
  series: Series;
  /** The whole series, in order: a card is only ever offered for a whole one. */
  pieces: readonly PaintReference[];
}

/**
 * A series on Browse: its name, what it is, and the run itself.
 *
 * The strip of plates is what sets it apart from a collection. A collection
 * is a lens with a cover; a series is a short run you can see the whole of
 * before you start, in the order you would paint it - which is most of what
 * someone deciding whether to begin needs to know. The strip is decorative
 * to assistive technology: the series page names every piece, and seven
 * descriptions read out on a card would bury its title.
 *
 * One link, the title, whose overlay makes the whole card the target - the
 * same `.card-link` rule every card in the app follows.
 */
export function SeriesCard({ series, pieces }: SeriesCardProps) {
  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-card border border-line bg-surface-raised p-4 shadow-lift transition-transform hover:-translate-y-1">
      <div>
        <span
          className="mb-2 block h-1.5 w-8 rounded-full"
          style={{ background: `rgb(var(${series.pigmentVar}))` }}
          aria-hidden="true"
        />
        <h3 className="text-balance font-display text-lg font-medium leading-tight text-ink">
          <Link
            to={`/series/${series.id}`}
            className="card-link underline-offset-4 group-hover:underline"
          >
            {series.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-pretty text-[0.85rem] leading-snug text-ink-soft">
          {series.blurb}
        </p>
      </div>

      <ol aria-hidden="true" className="mt-auto flex gap-1.5">
        {pieces.map((reference) => (
          <li key={reference.id} className="min-w-0 max-w-[3.25rem] flex-1">
            {/* 5:4 like every small plate: square cells left a wide sky a sliver. */}
            <RefArt
              reference={reference}
              sizes="52px"
              className="aspect-[5/4] w-full rounded-[4px]"
            />
          </li>
        ))}
      </ol>

      <p className="tnum text-[0.78rem] text-ink-faint">
        {pieces.length} pieces &middot; {minutesEach(pieces)}
      </p>
    </div>
  );
}
