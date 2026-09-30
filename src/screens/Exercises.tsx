import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  EXERCISES,
  type Exercise,
  type ExerciseKind,
  type ExerciseVariation,
} from "@/data/exercises";
import {
  PARAM,
  durationLabel,
  filterByKind,
  readKind,
  resolveSelection,
  variationCountLabel,
  withKind,
  withOpen,
  withVariation,
  type KindFilter,
} from "@/lib/exercises";
import { useApp } from "@/state/AppContext";
import { useWakeLock, type WakeLockApi } from "@/hooks/useWakeLock";
import { ExerciseArt, ExerciseArtDefs } from "@/components/ExerciseArt";
import { PaletteRow } from "@/components/PaletteRow";
import { RefArt } from "@/components/RefArt";
import { CreditLine } from "@/components/CreditLine";
import { WashiTag } from "@/components/studio/WashiTag";
import { Icon } from "@/components/Icon";

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "brushwork", label: "Brushwork" },
  { value: "colour", label: "Colour" },
];

const KIND_LABEL: Record<ExerciseKind, string> = {
  brushwork: "Brushwork",
  colour: "Colour",
};

/*
  Phone columns for the variation picker, by how many there are: four sit in
  one row, and five break three-and-two rather than four-and-one.
*/
const PICKER_COLUMNS: Record<number, string> = {
  3: "grid-cols-3",
  // Below 380px a row of four leaves each name about 60px; two by two reads better.
  4: "grid-cols-2 min-[380px]:grid-cols-4",
  5: "grid-cols-3",
};

const toggleId = (id: string) => `warmup-${id}`;
const titleId = (id: string) => `warmup-${id}-title`;
const focusId = (id: string) => `warmup-${id}-focus`;
const metaId = (id: string) => `warmup-${id}-meta`;
const sheetId = (id: string) => `warmup-${id}-guide`;

/**
 * Warm-ups: five exercises, each with a few ways to paint it.
 *
 * The list stays five rows long so it can be scanned in a glance; variations
 * live inside the warm-up they belong to rather than as cards of their own.
 * Opening one expands it in place into a practice sheet - choices, an
 * illustrated example and a guide - and only one is open at a time. The
 * filter, the open warm-up and the variation all live in the URL, written with
 * `replace` like Today's dealt piece, so a reload lands back on the same step.
 */
export function Exercises() {
  const [params, setParams] = useSearchParams();
  const { isSourceEnabled } = useApp();

  const kind = readKind(params.get(PARAM.kind));
  const list = useMemo(() => filterByKind(EXERCISES, kind), [kind]);
  const selection = resolveSelection(list, params.get(PARAM.warmup), params.get(PARAM.variation));
  const openId = selection?.exercise.id ?? null;

  const wakeLock = useWakeLock(openId !== null);

  const cards = useRef(new Map<string, HTMLElement>());
  const toggles = useRef(new Map<string, HTMLButtonElement>());
  // Set only by a tap on a warm-up, so a shared link or a reload never jumps.
  const jumpTo = useRef<string | null>(null);

  const update = useCallback(
    (write: (prev: URLSearchParams) => URLSearchParams) =>
      setParams((prev) => write(prev), { replace: true }),
    [setParams],
  );

  const setKind = (next: KindFilter) => update((prev) => withKind(prev, next, EXERCISES));

  const toggle = (id: string) => {
    if (openId === id) {
      update((prev) => withOpen(prev, null));
      return;
    }
    jumpTo.current = id;
    update((prev) => withOpen(prev, id));
  };

  /*
    Closing from inside the sheet removes the control that had focus, so focus
    goes back to the warm-up's own row - which is also where the eye is, once
    the sheet folds away above it.
  */
  const closeFromSheet = (id: string) => {
    toggles.current.get(id)?.focus();
    update((prev) => withOpen(prev, null));
  };

  /*
    A warm-up opened below the fold, or one whose guide runs past it, comes up
    to meet you: its row settles under the header with the guide beneath. One
    that is already wholly in view stays put - moving the page under someone
    who can see the change is the ruder option.
  */
  useEffect(() => {
    if (!openId || jumpTo.current !== openId) return;
    jumpTo.current = null;
    const card = cards.current.get(openId);
    if (!card) return;
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const box = card.getBoundingClientRect();
    if (box.top >= headerBottom && box.bottom <= window.innerHeight) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [openId]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <ExerciseArtDefs />

      <div className="mb-6 max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Warm-ups
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          Short, low-stakes practices to loosen the hand and train the eye. Pick
          one, choose how you&rsquo;d like to paint it, and follow along. No
          scores, no streaks - do one when you feel like it.
        </p>
      </div>

      <div role="group" aria-label="Filter warm-ups by kind" className="mb-6 flex flex-wrap gap-2">
        {KIND_TABS.map((tab) => {
          const active = kind === tab.value;
          /*
            The same chip rules the filters use: teal is reserved for a chip
            that is actually narrowing, "All" is the default and reads in the
            quiet sunken style, and every selected chip carries a check so
            selection never depends on colour alone.
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

      <ul className="flex flex-col gap-4">
        {list.map((exercise) => {
          const open = selection?.exercise.id === exercise.id;
          return (
            <li key={exercise.id}>
              <article
                ref={(el) => {
                  if (el) cards.current.set(exercise.id, el);
                  else cards.current.delete(exercise.id);
                }}
                className={`jump-target rounded-card border bg-surface-raised shadow-lift transition-colors ${
                  open ? "border-[rgb(var(--ink)/0.22)]" : "border-line"
                }`}
              >
                <h2 className="m-0">
                  <button
                    ref={(el) => {
                      if (el) toggles.current.set(exercise.id, el);
                      else toggles.current.delete(exercise.id);
                    }}
                    id={toggleId(exercise.id)}
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? sheetId(exercise.id) : undefined}
                    /*
                      Named by the title alone, so the heading list reads
                      "Graded wash" rather than fifteen words of metadata; the
                      focus, time and count follow as its description.
                    */
                    aria-labelledby={titleId(exercise.id)}
                    aria-describedby={`${focusId(exercise.id)} ${metaId(exercise.id)}`}
                    onClick={() => toggle(exercise.id)}
                    className="group relative flex min-h-[44px] w-full flex-wrap items-center gap-3 rounded-card p-3 text-left sm:flex-nowrap sm:gap-5 sm:p-4"
                  >
                    {open ? null : (
                      <span className="art-mat flex h-16 w-[5.75rem] shrink-0 items-center justify-center overflow-hidden rounded-[6px] p-1 sm:h-[6.5rem] sm:w-[9.75rem]">
                        <ExerciseArt art={exercise.variations[0].art} className="h-full w-full" />
                      </span>
                    )}
                    {/*
                      At a large text size the thumbnail's rem width leaves the
                      words no room, so below `sm` the text wraps under it
                      rather than pushing the page sideways.
                    */}
                    <span className={`min-w-[9rem] flex-1 sm:min-w-0 ${open ? "pr-24" : "pr-9 lg:pr-0"}`}>
                      <span
                        id={titleId(exercise.id)}
                        className="block text-balance font-display text-[1.18rem] leading-tight tracking-tight text-ink sm:text-[1.4rem]"
                      >
                        {exercise.title}
                      </span>
                      <span
                        id={focusId(exercise.id)}
                        className="mt-1 block text-pretty text-[0.9rem] leading-snug text-ink-soft sm:text-[0.95rem]"
                      >
                        {exercise.focus}
                      </span>
                      <span
                        id={metaId(exercise.id)}
                        className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.85rem] font-medium text-ink-soft"
                      >
                        <WashiTag pigmentVar={exercise.pigmentVar} rotate={-2} className="mr-0.5">
                          {KIND_LABEL[exercise.kind]}
                        </WashiTag>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="clock" size={15} />
                          <span className="tnum">{durationLabel(exercise)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="grid" size={15} />
                          <span className="tnum">{variationCountLabel(exercise)}</span>
                        </span>
                      </span>
                    </span>
                    {/*
                      On a wide screen the row has room to show what the
                      variations are before anyone opens it. Decorative: the
                      count beside it carries the information.
                    */}
                    {open ? null : (
                      <span aria-hidden="true" className="mr-14 hidden shrink-0 gap-1.5 lg:flex">
                        {exercise.variations.slice(1).map((v) => (
                          <span key={v.id} className="art-mat block h-[3.1rem] w-[4.65rem] overflow-hidden rounded-[5px]">
                            <ExerciseArt art={v.art} className="h-full w-full" />
                          </span>
                        ))}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full text-[0.88rem] font-semibold transition-colors sm:right-4 sm:top-1/2 sm:-translate-y-1/2 ${
                        open
                          ? "px-3 py-2 text-accent group-hover:bg-[rgb(var(--accent)/0.08)]"
                          : "h-9 w-9 justify-center border border-line text-ink-soft group-hover:border-[rgb(var(--ink)/0.35)] group-hover:text-ink"
                      }`}
                    >
                      {open ? "Close" : null}
                      <Icon
                        name="chevron-down"
                        size={18}
                        className={`transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                </h2>

                {open && selection ? (
                  <PracticeSheet
                    exercise={exercise}
                    variation={selection.variation}
                    onChoose={(variationId) =>
                      update((prev) => withVariation(prev, exercise, variationId))
                    }
                    onClose={() => closeFromSheet(exercise.id)}
                    wakeLock={wakeLock}
                    showPhoto={(v) => !!v.photo && isSourceEnabled(v.photo.credit.sourceId)}
                  />
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PracticeSheet({
  exercise,
  variation,
  onChoose,
  onClose,
  wakeLock,
  showPhoto,
}: {
  exercise: Exercise;
  variation: ExerciseVariation;
  onChoose: (variationId: string) => void;
  onClose: () => void;
  wakeLock: WakeLockApi;
  showPhoto: (variation: ExerciseVariation) => boolean;
}) {
  const photo = showPhoto(variation) ? variation.photo : undefined;

  // Escape folds the sheet from anywhere inside it, as it would a dialog.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape is a shortcut; every action also has a button.
    <div
      id={sheetId(exercise.id)}
      role="region"
      aria-labelledby={titleId(exercise.id)}
      onKeyDown={onKeyDown}
      className="border-t border-line px-3 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5"
    >
      <fieldset>
        <legend className="mb-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
          Choose a variation
        </legend>
        <div
          className={`grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7.75rem,1fr))] sm:gap-3 ${
            PICKER_COLUMNS[exercise.variations.length] ?? "grid-cols-3"
          }`}
        >
          {exercise.variations.map((v) => {
            const checked = v.id === variation.id;
            return (
              <label
                key={v.id}
                className={`relative flex cursor-pointer flex-col gap-1.5 rounded-card border p-1.5 pb-2 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  checked
                    ? "border-accent bg-[rgb(var(--accent)/0.07)] shadow-lift"
                    : "border-line bg-surface-raised hover:border-[rgb(var(--ink)/0.35)]"
                }`}
              >
                <input
                  type="radio"
                  name={`variation-${exercise.id}`}
                  value={v.id}
                  checked={checked}
                  onChange={() => onChoose(v.id)}
                  className="sr-only"
                />
                <span className="art-mat block overflow-hidden rounded-[5px]">
                  <ExerciseArt art={v.art} className="block h-auto w-full" />
                </span>
                <span
                  className={`flex items-start gap-1 px-0.5 text-[0.85rem] leading-tight ${
                    checked ? "font-semibold text-ink" : "font-medium text-ink-soft"
                  }`}
                >
                  {checked ? (
                    <Icon name="check" size={14} className="mt-px shrink-0 text-accent" />
                  ) : null}
                  {v.name}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="warmup-body mt-5">
        {/*
          The example and the guide share a parent so a sticky example ends
          where the guide does, rather than riding over the photo below.
        */}
        <div className="warmup-main">
          <figure className="warmup-example">
            <div className="art-mat flex justify-center rounded-card p-2 sm:p-4">
              <ExerciseArt art={variation.art} label={variation.artAlt} className="warmup-example-art block h-auto w-full" />
            </div>
            <figcaption className="mt-1.5 text-[0.78rem] leading-snug text-ink-faint">
              A Little Wash illustration. Yours will look different, and that&rsquo;s fine.
            </figcaption>
          </figure>

          <div className="warmup-guide">
            <h3 className="text-balance font-display text-[1.35rem] leading-tight tracking-tight text-ink sm:text-[1.55rem]">
              {variation.name}
            </h3>
            <p className="mt-1.5 text-pretty text-[1rem] leading-relaxed text-ink-soft">{variation.summary}</p>
            <p className="mt-2 flex items-center gap-1.5 text-[0.88rem] font-medium text-ink-soft">
              <Icon name="clock" size={15} />
              <span>
                About <span className="tnum">{variation.minutes}</span> min
              </span>
            </p>

            <KeepScreenOn api={wakeLock} />

            <section className="mt-5">
              <h4 className="mb-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                You&rsquo;ll need
              </h4>
              <div className="grid gap-3 lg:grid-cols-2 lg:gap-6">
                <div>
                  <PaletteRow palette={variation.colours} variant="dots" showNames />
                  <p className="mt-2 text-pretty text-[0.92rem] leading-relaxed text-ink-soft">
                    {variation.colourNote}
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {variation.materials.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.92rem] leading-snug text-ink-soft">
                      <span aria-hidden="true" className="dab mt-[0.42rem] h-1.5 w-1.5 shrink-0 bg-[rgb(var(--ink)/0.35)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-6">
              <h4 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                Steps
              </h4>
              <ol className="flex list-none flex-col gap-3">
                {variation.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[1rem] leading-relaxed text-ink">
                    <span
                      aria-hidden="true"
                      className="tnum mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold"
                      style={{ background: `rgb(var(${exercise.pigmentVar}) / 0.18)` }}
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="mt-6 rounded-card p-4"
              style={{ background: `rgb(var(${exercise.pigmentVar}) / 0.12)` }}
            >
              <h4 className="flex font-display text-[1.02rem] text-ink">
                <WashiTag pigmentVar="--pig-landscape" rotate={-3}>
                  <Icon name="brush" size={15} /> What to notice
                </WashiTag>
              </h4>
              <p className="mt-2 text-pretty text-[0.98rem] leading-relaxed text-ink-soft">{variation.notice}</p>
            </section>
          </div>
        </div>

        {photo ? (
          // Unnamed on purpose: a named section is a landmark, and one photo is not a place to jump to.
          <section className="warmup-photo">
            <h4 className="mb-2 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
              Photo inspiration
            </h4>
            <figure>
              <RefArt
                // A fresh image per photo: a failed or loaded state must not carry over.
                key={photo.credit.externalId}
                reference={photo}
                ownAspect
                inset="none"
                sizes="(min-width: 768px) 32rem, 100vw"
                className="rounded-card"
              />
              <figcaption className="mt-1.5 space-y-0.5">
                <p className="text-[0.85rem] leading-snug text-ink-soft">
                  A real photograph to look at while you paint, not a painting to copy.
                </p>
                <CreditLine reference={photo} variant="inline" />
              </figcaption>
            </figure>
          </section>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end border-t border-line pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-chip border border-line bg-surface-raised px-4 text-[0.92rem] font-semibold text-ink transition-colors hover:border-[rgb(var(--ink)/0.35)]"
        >
          <Icon name="close" size={16} />
          Close warm-up
        </button>
      </div>
    </div>
  );
}

/**
 * Asks the browser to keep the screen awake while a warm-up is open. Hidden
 * where the browser cannot do it, rather than offering a switch that fails.
 */
function KeepScreenOn({ api }: { api: WakeLockApi }) {
  if (api.status === "unsupported") return null;
  const on = api.wanted && api.status !== "refused";
  const message =
    api.status === "refused"
      ? "Your browser didn't keep the screen on. It may be saving battery."
      : api.status === "on"
        ? "Your screen will stay on while this warm-up is open."
        : "";

  return (
    <div className="mt-3 flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={api.toggle}
        className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-chip pr-2 text-[0.92rem] font-semibold text-ink"
      >
        <span
          aria-hidden="true"
          className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors ${
            on ? "border-transparent bg-accent" : "border-[rgb(var(--ink)/0.3)] bg-surface-sunken"
          }`}
        >
          <span
            className={`absolute left-0.5 h-[1.1rem] w-[1.1rem] rounded-full bg-surface-raised shadow-lift transition-transform ${
              on ? "translate-x-4" : ""
            }`}
          />
        </span>
        <Icon name="screen" size={17} />
        Keep screen on
      </button>
      {/* Always rendered, so the message is announced when it arrives; empty, it has no height. */}
      <p role="status" className="text-[0.82rem] leading-snug text-ink-soft">
        {message}
      </p>
    </div>
  );
}
