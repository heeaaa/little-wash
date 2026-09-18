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

interface FilterControlsProps {
  /** stack = sidebar column (Direction A); row = horizontal groups (Direction B). */
  layout?: "stack" | "row";
  idPrefix: string;
}

const TIME_OPTIONS: TimeBand[] = ["5", "15", "30"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["gentle", "steady", "stretch"];
const SUBJECT_OPTIONS: Subject[] = [
  "fruit",
  "botanical",
  "still-life",
  "creatures",
  "landscape",
  "objects",
];

export function FilterControls({ layout = "stack", idPrefix }: FilterControlsProps) {
  const { filters, setFilter, resetFilters, activeFilters } = useApp();

  return (
    <div
      className={
        layout === "stack" ? "flex flex-col gap-6" : "flex flex-col gap-5"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Refine
        </h2>
        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[32px] rounded-chip px-2 text-[0.82rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80"
          >
            Clear {activeFilters}
          </button>
        ) : null}
      </div>

      <FilterGroup
        label="How long have you got?"
        icon="clock"
        layout={layout}
        idPrefix={`${idPrefix}-time`}
        allLabel="Any time"
        selected={filters.time}
        options={TIME_OPTIONS.map((v) => ({ value: v, label: TIME_LABEL[v] }))}
        onSelect={(value) => setFilter({ time: value as TimeBand | "all" })}
      />

      <FilterGroup
        label="How much energy?"
        layout={layout}
        idPrefix={`${idPrefix}-difficulty`}
        allLabel="Any"
        selected={filters.difficulty}
        options={DIFFICULTY_OPTIONS.map((v) => ({
          value: v,
          label: DIFFICULTY_LABEL[v],
        }))}
        onSelect={(value) => setFilter({ difficulty: value as Difficulty | "all" })}
      />

      <FilterGroup
        label="What kind of subject?"
        layout={layout}
        idPrefix={`${idPrefix}-subject`}
        allLabel="Anything"
        selected={filters.subject}
        options={SUBJECT_OPTIONS.map((v) => ({ value: v, label: SUBJECT_LABEL[v] }))}
        onSelect={(value) => setFilter({ subject: value as Subject | "all" })}
      />
    </div>
  );
}

interface Option {
  value: string;
  label: string;
}

interface FilterGroupProps {
  label: string;
  icon?: "clock";
  layout: "stack" | "row";
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
  const all: Option = { value: "all", label: allLabel };
  return (
    <div role="group" aria-labelledby={labelId}>
      <div
        id={labelId}
        className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.09em] text-ink-faint"
      >
        {icon ? <Icon name={icon} size={15} /> : null}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {[all, ...options].map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.value)}
              className={`min-h-[44px] rounded-chip border px-3.5 text-[0.9rem] font-medium transition-colors ${
                isSelected
                  ? "border-transparent bg-accent text-accent-ink shadow-lift"
                  : "border-line bg-surface-raised text-ink-soft hover:border-[rgb(var(--ink)/0.35)] hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
