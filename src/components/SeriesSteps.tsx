import { Icon } from "@/components/Icon";
import { RefArt } from "@/components/RefArt";
import { WashLink } from "@/components/WashLink";
import { SERIES_PARAM, type Series } from "@/data/series";
import type { SeriesPlace, SeriesStep } from "@/lib/series";

interface SeriesStepsProps {
  series: Series;
  place: SeriesPlace;
  /**
   * Runs before the browser snapshots the outgoing piece, as a WashLink's
   * `onBeforeMove` does. Detail uses it to let go of the artwork's shared name
   * when the plate has scrolled away, so the next piece re-wets where it will
   * sit instead of flying in from above the screen.
   */
  onBeforeStep?: () => void;
}

const stepClass =
  "flex min-h-[44px] items-center gap-3 rounded-card border border-line bg-surface-raised p-2 pr-3 text-left shadow-lift transition-colors hover:border-[rgb(var(--ink)/0.35)]";

/**
 * The way through a series from Detail: where this piece sits, and the pieces
 * either side.
 *
 * Below the action row, never above the title: the first screen of Detail is
 * budgeted to the rem (see `.detail-art` in index.css) so the plate, Enlarge
 * and the title all fit, and the back link at the top already names the
 * series. By the time someone has marked a piece painted, this is the next
 * thing under their thumb.
 *
 * The heading states a position - "No. 3" - and never how far through anyone
 * is. The last piece offers the way back to the series in place of Next, and
 * says nothing about having reached the end.
 */
export function SeriesSteps({ series, place, onBeforeStep }: SeriesStepsProps) {
  const headingId = `series-steps-${series.id}`;

  return (
    <nav aria-labelledby={headingId} className="mt-10 border-t border-line pt-5">
      <h2
        id={headingId}
        className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-faint"
      >
        {series.title} &middot; No. {place.number}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {place.previous ? (
          <li>
            <Step
              series={series}
              step={place.previous}
              label="Previous"
              onBeforeStep={onBeforeStep}
            />
          </li>
        ) : null}
        <li className={place.previous ? undefined : "sm:col-start-2"}>
          {place.next ? (
            <Step series={series} step={place.next} label="Next" onBeforeStep={onBeforeStep} />
          ) : (
            <WashLink to={`/series/${series.id}`} className={stepClass}>
              {/*
                The series' own pigment where a plate would be, not a second
                left arrow: two left-pointing cards read as two ways back.
              */}
              <span aria-hidden="true" className="flex w-16 shrink-0 justify-center">
                <span
                  className="block h-1.5 w-8 rounded-full"
                  style={{ background: `rgb(var(${series.pigmentVar}))` }}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.78rem] font-semibold text-ink-soft">
                  Back to the series
                </span>
                <span className="block text-[0.95rem] text-ink">{series.title}</span>
              </span>
            </WashLink>
          )}
        </li>
      </ul>
    </nav>
  );
}

function Step({
  series,
  step,
  label,
  onBeforeStep,
}: {
  series: Series;
  step: SeriesStep;
  label: "Previous" | "Next";
  onBeforeStep?: () => void;
}) {
  return (
    <WashLink
      to={{
        pathname: `/piece/${step.reference.id}`,
        search: `?${new URLSearchParams({ [SERIES_PARAM]: series.id })}`,
      }}
      moment="rewet"
      onBeforeMove={onBeforeStep}
      className={stepClass}
    >
      {/* The words name the piece; the picture is there to be recognised. */}
      <span aria-hidden="true" className="w-16 shrink-0">
        <RefArt reference={step.reference} sizes="64px" className="aspect-[5/4] w-full rounded-[4px]" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[0.78rem] font-semibold text-ink-soft">
          {label === "Previous" ? <Icon name="arrow-left" size={14} /> : null}
          {label}
          {label === "Next" ? <Icon name="arrow-left" size={14} className="rotate-180" /> : null}
        </span>
        <span className="block text-[0.95rem] leading-snug text-ink">
          <span className="tnum">No. {step.number}</span> {step.reference.title}
        </span>
      </span>
    </WashLink>
  );
}
