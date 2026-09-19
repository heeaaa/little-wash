import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import type { PaintReference } from "@/lib/types";

interface SaveButtonProps {
  reference: PaintReference;
  /** icon = compact round button; full = labelled button for the detail view. */
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Toggles a reference in the local favourites. Uses aria-pressed so assistive
 * tech announces the saved state; the label names the action and the subject.
 */
export function SaveButton({
  reference,
  variant = "icon",
  className = "",
}: SaveButtonProps) {
  const { isSaved, toggleSave } = useApp();
  const saved = isSaved(reference.id);
  const label = saved
    ? `Saved. Remove ${reference.title} from your saved pieces`
    : `Save ${reference.title} to your saved pieces`;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggleSave(reference.id)}
        aria-pressed={saved}
        aria-label={label}
        /*
          Rose carries the mark, never the word. DESIGN.md reserves it for the
          heart, tags and marks because it fails AA for small text - as the
          label did here, at 2.57:1 on its own rose tint.
        */
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-chip border px-4 text-[0.95rem] font-semibold text-ink transition-colors ${
          saved
            ? "border-transparent bg-[rgb(var(--save)/0.14)]"
            : "border-line bg-surface-raised hover:border-[rgb(var(--ink)/0.35)]"
        } ${className}`}
      >
        <Icon
          name={saved ? "heart-filled" : "heart"}
          size={20}
          className={saved ? "text-[rgb(var(--save))]" : undefined}
        />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleSave(reference.id)}
      aria-pressed={saved}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
        saved
          ? "border-transparent bg-[rgb(var(--save)/0.16)] text-[rgb(var(--save))]"
          : "border-line bg-[rgb(var(--surface-raised)/0.9)] text-ink-soft hover:text-ink"
      } ${className}`}
    >
      <Icon name={saved ? "heart-filled" : "heart"} size={20} />
    </button>
  );
}
