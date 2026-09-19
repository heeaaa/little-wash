import { useMemo, useState } from "react";
import { EXERCISES, type Exercise, type ExerciseKind } from "@/data/exercises";
import { ExerciseArt } from "@/components/ExerciseArt";
import { PaletteRow } from "@/components/PaletteRow";
import { WashiTag } from "@/components/studio/WashiTag";
import { Icon } from "@/components/Icon";

type KindFilter = ExerciseKind | "all";

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "brushwork", label: "Brushwork" },
  { value: "colour", label: "Colour" },
];

const KIND_LABEL: Record<ExerciseKind, string> = {
  brushwork: "Brushwork",
  colour: "Colour",
};

export function Exercises() {
  const [kind, setKind] = useState<KindFilter>("all");
  const list = useMemo(
    () => (kind === "all" ? EXERCISES : EXERCISES.filter((e) => e.kind === kind)),
    [kind],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Warm-ups
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          Short, low-stakes practices to loosen the hand and train the eye. No
          scores, no streaks - do one when you feel like it.
        </p>
      </div>

      <div role="group" aria-label="Filter warm-ups by kind" className="mb-8 flex flex-wrap gap-2">
        {KIND_TABS.map((tab) => {
          const active = kind === tab.value;
          /*
            The same chip rules the filters use, which this group was breaking:
            teal is reserved for a chip that is actually narrowing, "All" is the
            default and reads in the quiet sunken style, and every selected chip
            carries a check so selection never depends on colour alone.
          */
          const narrowing = active && tab.value !== "all";
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => setKind(tab.value)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border px-4 text-[0.9rem] font-medium transition-colors ${
                narrowing
                  ? "border-transparent bg-accent text-accent-ink shadow-lift"
                  : active
                    ? "border-[rgb(var(--ink)/0.28)] bg-surface-sunken text-ink"
                    : "border-line bg-surface-raised text-ink-soft hover:border-[rgb(var(--ink)/0.35)] hover:text-ink"
              }`}
            >
              {active ? <Icon name="check" size={15} /> : null}
              {tab.label}
            </button>
          );
        })}
      </div>

      <ul className="grid gap-6 md:grid-cols-2">
        {list.map((exercise) => (
          <li key={exercise.id}>
            <ExerciseCard exercise={exercise} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-raised shadow-lift">
      <div
        className="art-mat flex items-center justify-center p-4"
        style={{ background: `rgb(var(${exercise.pigmentVar}) / 0.1)` }}
      >
        <ExerciseArt visual={exercise.visual} className="h-36 w-full max-w-[18rem]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <WashiTag pigmentVar={exercise.pigmentVar} rotate={-3}>
            {KIND_LABEL[exercise.kind]}
          </WashiTag>
          <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-ink-soft">
            <Icon name="clock" size={15} />
            <span className="tnum">{exercise.minutes}</span>&nbsp;min
          </span>
        </div>

        <h2 className="font-display text-[1.35rem] font-medium leading-tight tracking-tight text-ink">
          {exercise.title}
        </h2>
        <p className="text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
          {exercise.summary}
        </p>

        {exercise.palette ? (
          <PaletteRow palette={exercise.palette} variant="dots" showNames />
        ) : null}

        <details className="group mt-auto pt-1">
          <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[0.95rem] font-semibold text-accent underline decoration-2 underline-offset-4 marker:content-none">
            <Icon name="brush" size={17} />
            <span className="group-open:hidden">Show the steps</span>
            <span className="hidden group-open:inline">Hide the steps</span>
          </summary>
          <ol className="mt-3 flex list-none flex-col gap-2.5">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-soft">
                <span
                  aria-hidden="true"
                  className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold"
                  style={{
                    background: `rgb(var(${exercise.pigmentVar}) / 0.16)`,
                    color: "rgb(var(--ink))",
                  }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </article>
  );
}
