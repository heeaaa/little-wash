import { useEffect, useRef } from "react";
import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import { EmptyPanel } from "@/components/EmptyPanel";
import {
  DIFFICULTY_LABEL,
  SUBJECT_LABEL,
  TIME_LABEL,
  type Difficulty,
  type Filters,
  type Subject,
  type TimeBand,
} from "@/lib/types";

interface ActiveFilter {
  key: keyof Filters;
  label: string;
}

/** The filters currently narrowing the catalogue, named the way the user set them. */
function activeList(filters: Filters): ActiveFilter[] {
  const list: ActiveFilter[] = [];
  if (filters.time !== "all") {
    list.push({ key: "time", label: TIME_LABEL[filters.time as TimeBand] });
  }
  if (filters.difficulty !== "all") {
    list.push({
      key: "difficulty",
      label: DIFFICULTY_LABEL[filters.difficulty as Difficulty],
    });
  }
  if (filters.subject !== "all") {
    list.push({ key: "subject", label: SUBJECT_LABEL[filters.subject as Subject] });
  }
  return list;
}

/**
 * Shown when the active filters match nothing. Names the combination that is
 * excluding everything and lets each part be dropped on its own, so the way
 * out is one tap and the user is never told only that they were "too narrow".
 */
export function EmptyState() {
  const { filters, setFilter, resetFilters } = useApp();
  const active = activeList(filters);
  const panel = useRef<HTMLDivElement>(null);

  /*
    Emptying the catalogue shortens the page, and the browser clamps the scroll
    wherever it lands. Measured at 390x844 after tapping a chip: this panel's
    explanation sat at y=31 behind a 121px sticky header, so the user saw three
    unlabelled buttons in a dashed box and none of the sentence naming what
    excluded everything.

    Focus deliberately stays where it is: the control that emptied the results
    is the one they are most likely to reach for next, and it is the way out.
  */
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;

    const still =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <EmptyPanel
      containerRef={panel}
      icon="brush"
      title="Nothing matches just yet"
      description={
        active.length > 0 ? (
          <p className="text-pretty text-[0.95rem] text-ink-soft">
            Nothing in the catalogue is{" "}
            <strong className="font-semibold text-ink">
              {active.map((f) => f.label).join(" + ")}
            </strong>
            . Drop one and a subject will turn up.
          </p>
        ) : (
          <p className="text-pretty text-[0.95rem] text-ink-soft">
            There is nothing here to show right now.
          </p>
        )
      }
    >
      {active.length > 0 ? (
        <>
          <ul className="flex flex-wrap justify-center gap-2">
            {active.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => setFilter({ [f.key]: "all" } as Partial<Filters>)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border border-line bg-surface-raised px-3.5 text-[0.9rem] font-medium text-ink hover:border-[rgb(var(--ink)/0.35)]"
                >
                  <Icon name="close" size={15} />
                  Drop {f.label}
                </button>
              </li>
            ))}
          </ul>

          {active.length > 1 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[44px] rounded-chip px-3 text-[0.9rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80"
            >
              Clear them all
            </button>
          ) : null}
        </>
      ) : null}
    </EmptyPanel>
  );
}
