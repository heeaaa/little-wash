import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { SOURCE_ORDER, sourceInfo } from "@/lib/sources/registry";
import { Icon } from "@/components/Icon";

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
          saved stay in your studio either way.
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

      <p className="mt-8">
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
