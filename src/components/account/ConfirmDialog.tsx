import { useId, type ReactNode } from "react";
import { useModal } from "@/hooks/useModal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** The serious choice, e.g. "Delete my account". */
  confirmLabel: string;
  /** The safe choice, e.g. "Keep my account". It has focus when the dialog opens. */
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** While the serious choice is under way, as words for the status line. */
  busyLabel?: string | null;
  /**
   * Why the serious choice did not work, for the same line. The notice under
   * the header says it too, but behind this dialog, where nobody can reach it.
   */
  failure?: string | null;
}

/**
 * A question that must be answered before something cannot be taken back:
 * deleting the account, or signing out with changes that would be lost.
 *
 * The safe answer has focus and comes first, so Enter or a stray tap keeps
 * things as they are. Escape is the safe answer too. The serious answer is
 * ink, the strongest the palette has: this app has no red, and rose fails AA
 * for text (DESIGN.md, contrast rules).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busyLabel = null,
  failure = null,
}: ConfirmDialogProps) {
  const { ref, onNativeClose } = useModal(open, onCancel);
  const busy = Boolean(busyLabel);
  // Unique per dialog: the studio holds two of these at once (sign out and
  // delete), and a shared id named both dialogs after the first one's title.
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      onClose={onNativeClose}
      aria-labelledby={titleId}
      className="sign-in-sheet"
    >
      <div className="px-5 pb-6 pt-5">
        <h2 id={titleId} className="text-balance font-display text-xl font-medium text-ink">
          {title}
        </h2>
        <div className="mt-2 space-y-2 text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
          {children}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {/*
            First in the dialog, so showModal() gives it focus: the platform
            focuses a modal's first focusable element.
          */}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center rounded-chip border border-line bg-surface-raised px-4 text-[0.95rem] font-semibold text-ink hover:border-[rgb(var(--ink)/0.35)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) onConfirm();
            }}
            className="inline-flex min-h-[44px] items-center rounded-chip bg-ink px-4 text-[0.95rem] font-semibold text-paper transition-colors hover:bg-[rgb(var(--ink)/0.86)] aria-disabled:cursor-progress aria-disabled:opacity-70"
          >
            {confirmLabel}
          </button>
        </div>
        <p role="status" className="mt-3 min-h-[1.25rem] text-[0.9rem] text-ink-soft">
          {busyLabel ?? failure ?? ""}
        </p>
      </div>
    </dialog>
  );
}
