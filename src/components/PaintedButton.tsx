import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import type { PaintReference } from "@/lib/types";

interface PaintedButtonProps {
  reference: PaintReference;
  /** icon = compact round button; full = labelled button for the detail view. */
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Marks a reference as painted. `aria-pressed` so assistive tech announces the
 * state; the label names the action and the subject, as SaveButton's does.
 *
 * Two deliberate choices about register, because PRODUCT.md:94 rules out
 * achievement language entirely:
 *
 * - **A brush, not a tick.** A tick reads as a task ticked off a list. This is
 *   a record of having painted something, not a chore completed.
 * - **"Painted", never "Done" or "Complete".** The word says what happened,
 *   not that an obligation has been discharged.
 *
 * Sage carries the mark. DESIGN.md reserves it for supportive fills, and it is
 * neither the rose of Saved nor the teal of a primary action - marking
 * something painted is a quiet note to yourself, not the loudest thing on the
 * screen. The glyph is ink rather than sage: sage is a light fill and a 20px
 * stroke in it does not reach AA on paper.
 */
export function PaintedButton({
  reference,
  variant = "icon",
  className = "",
}: PaintedButtonProps) {
  const { isPainted, togglePainted } = useApp();
  const painted = isPainted(reference.id);
  const label = painted
    ? `Painted. Remove ${reference.title} from what you have painted`
    : `Mark ${reference.title} as painted`;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => togglePainted(reference.id)}
        aria-pressed={painted}
        aria-label={label}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-chip border px-4 text-[0.95rem] font-semibold text-ink transition-colors ${
          painted
            ? "border-transparent bg-[rgb(var(--sage)/0.38)]"
            : "border-line bg-surface-raised hover:border-[rgb(var(--ink)/0.35)]"
        } ${className}`}
      >
        <Icon name="brush" size={20} />
        <span>{painted ? "Painted" : "Mark as painted"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => togglePainted(reference.id)}
      aria-pressed={painted}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-ink transition-colors ${
        painted
          ? "border-transparent bg-[rgb(var(--sage)/0.38)]"
          : "border-line bg-[rgb(var(--surface-raised)/0.92)] hover:border-[rgb(var(--ink)/0.35)]"
      } ${className}`}
    >
      <Icon name="brush" size={20} />
    </button>
  );
}
