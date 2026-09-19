import { useRef } from "react";
import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import {
  DIFFICULTY_LABEL,
  SUBJECT_LABEL,
  TIME_LABEL,
  type Difficulty,
  type Subject,
  type TimeBand,
} from "@/lib/types";

const TIME_OPTIONS: TimeBand[] = ["short", "medium", "long"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["gentle", "steady", "stretch"];
const SUBJECT_OPTIONS: Subject[] = [
  "fruit",
  "botanical",
  "still-life",
  "creatures",
  "landscape",
  "objects",
];

/**
 * Time and energy: the two questions the product is positioned on ("how long
 * have I got, how much energy do I have today"). These lead everywhere they
 * appear, and on Today they sit directly under the piece so changing one
 * visibly changes the other. Subject is deliberately not here - it is the
 * conventional axis and carries seven options, so it demotes to SubjectSheet
 * on small screens and below a rule in the desktop rail.
 */
export function PrimaryFilters({ idPrefix }: { idPrefix: string }) {
  const { filters, setFilter } = useApp();

  return (
    <div className="flex flex-col gap-5">
      <FilterGroup
        label="How long have you got?"
        icon="clock"
        idPrefix={`${idPrefix}-time`}
        allLabel="Any time"
        selected={filters.time}
        options={TIME_OPTIONS.map((v) => ({ value: v, label: TIME_LABEL[v] }))}
        onSelect={(value) => setFilter({ time: value as TimeBand | "all" })}
      />

      <FilterGroup
        label="How much energy?"
        icon="brush"
        idPrefix={`${idPrefix}-difficulty`}
        allLabel="Any"
        selected={filters.difficulty}
        options={DIFFICULTY_OPTIONS.map((v) => ({
          value: v,
          label: DIFFICULTY_LABEL[v],
        }))}
        onSelect={(value) => setFilter({ difficulty: value as Difficulty | "all" })}
      />
    </div>
  );
}

/** The subject group on its own, for the desktop rail where there is room. */
export function SubjectGroup({ idPrefix }: { idPrefix: string }) {
  const { filters, setFilter } = useApp();
  return (
    <FilterGroup
      label="What kind of subject?"
      icon="tag"
      idPrefix={`${idPrefix}-subject`}
      allLabel="Anything"
      selected={filters.subject}
      options={SUBJECT_OPTIONS.map((v) => ({ value: v, label: SUBJECT_LABEL[v] }))}
      onSelect={(value) => setFilter({ subject: value as Subject | "all" })}
    />
  );
}

/**
 * Subject on small screens: a trigger that always states the current value
 * (a filter is never active and invisible) opening a bottom sheet. Uses the
 * native <dialog> so focus trapping, Escape and inertness come from the
 * platform rather than being re-implemented.
 */
export function SubjectSheet({ idPrefix }: { idPrefix: string }) {
  const { filters, setFilter } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const active = filters.subject !== "all";

  const close = () => ref.current?.close();

  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={`inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-chip border px-4 text-[0.95rem] font-semibold transition-colors ${
          active
            ? "border-transparent bg-[rgb(var(--accent)/0.12)] text-ink"
            : "border-line bg-surface-raised text-ink-soft hover:border-[rgb(var(--ink)/0.35)] hover:text-ink"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tag" size={17} />
          Subject
        </span>
        <span className="font-normal text-ink-soft">
          {active ? SUBJECT_LABEL[filters.subject as Subject] : "Anything"}
        </span>
      </button>

      <dialog
        ref={ref}
        aria-label="Choose a subject"
        className="sheet m-0 mt-auto w-full max-w-none rounded-b-none rounded-t-card border-t border-line bg-surface-raised p-0 text-ink backdrop:bg-[rgb(20_28_34/0.5)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-medium">What kind of subject?</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close subject picker"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="px-4 pb-6 pt-4">
          <OptionChips
            idPrefix={`${idPrefix}-subject-sheet`}
            selected={filters.subject}
            options={[
              { value: "all", label: "Anything" },
              ...SUBJECT_OPTIONS.map((v) => ({ value: v, label: SUBJECT_LABEL[v] })),
            ]}
            onSelect={(value) => {
              setFilter({ subject: value as Subject | "all" });
              close();
            }}
          />
        </div>
      </dialog>
    </div>
  );
}

/** Clears every filter; only rendered when something is actually narrowing. */
export function ClearFilters({ className = "" }: { className?: string }) {
  const { resetFilters, activeFilters } = useApp();
  if (activeFilters === 0) return null;
  return (
    <button
      type="button"
      onClick={resetFilters}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-chip px-3 text-[0.9rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80 ${className}`}
    >
      <Icon name="close" size={16} />
      Clear {activeFilters === 1 ? "filter" : `all ${activeFilters}`}
    </button>
  );
}

/** The full stack, used in the desktop rail: time and energy, then subject. */
export function FilterControls({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">Refine</h2>
        <ClearFilters />
      </div>
      <PrimaryFilters idPrefix={idPrefix} />
      <div className="border-t border-line pt-5">
        <SubjectGroup idPrefix={idPrefix} />
      </div>
    </div>
  );
}

interface Option {
  value: string;
  label: string;
}

interface FilterGroupProps {
  label: string;
  icon?: "clock" | "brush" | "tag";
  idPrefix: string;
  allLabel: string;
  selected: string;
  options: Option[];
  onSelect: (value: string) => void;
}

function FilterGroup({
  label,
  icon,
  idPrefix,
  allLabel,
  selected,
  options,
  onSelect,
}: FilterGroupProps) {
  const labelId = `${idPrefix}-label`;
  return (
    <div role="group" aria-labelledby={labelId}>
      {/*
        These labels are primary UI now, not meta, so they take ink-soft
        (6.3:1 on Paper) rather than ink-faint. ink-faint since cleared AA
        (5.1:1), so this is a hierarchy decision, not a contrast one.
      */}
      <div
        id={labelId}
        className="mb-2 flex items-center gap-1.5 text-[0.82rem] font-semibold uppercase tracking-[0.09em] text-ink-soft"
      >
        {icon ? <Icon name={icon} size={15} /> : null}
        {label}
      </div>
      <OptionChips
        idPrefix={idPrefix}
        selected={selected}
        options={[{ value: "all", label: allLabel }, ...options]}
        onSelect={onSelect}
      />
    </div>
  );
}

function OptionChips({
  idPrefix,
  selected,
  options,
  onSelect,
}: {
  idPrefix: string;
  selected: string;
  options: Option[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option.value;
        // Pigment marks a real constraint. Selecting "Any" is the default, not
        // a choice, so it reads as selected without becoming the loudest thing
        // on the screen - and an active filter stays visible at a glance.
        const isNarrowing = isSelected && option.value !== "all";
        return (
          <button
            key={`${idPrefix}-${option.value}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.value)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-chip border px-3.5 text-[0.9rem] font-medium transition-colors ${
              isNarrowing
                ? "border-transparent bg-accent text-accent-ink shadow-lift"
                : isSelected
                  ? "border-[rgb(var(--ink)/0.28)] bg-surface-sunken text-ink"
                  : "border-line bg-surface-raised text-ink-soft hover:border-[rgb(var(--ink)/0.35)] hover:text-ink"
            }`}
          >
            {/* A mark, not just a fill, so selection does not rely on colour. */}
            {isSelected ? <Icon name="check" size={15} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
