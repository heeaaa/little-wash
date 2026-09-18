import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";

/** Shown when the active filters match nothing - offers a way back, no dead end. */
export function EmptyState() {
  const { resetFilters } = useApp();
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
        <Icon name="brush" size={26} />
      </span>
      <div className="max-w-sm space-y-1.5">
        <p className="font-display text-xl text-ink">Nothing matches just yet</p>
        <p className="text-pretty text-[0.95rem] text-ink-soft">
          That combination is a little too narrow. Loosen a filter and a subject
          will turn up.
        </p>
      </div>
      <button
        type="button"
        onClick={resetFilters}
        className="min-h-[44px] rounded-chip bg-accent px-5 text-[0.95rem] font-semibold text-accent-ink"
      >
        Clear the filters
      </button>
    </div>
  );
}
