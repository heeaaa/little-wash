import { useEffect, useRef } from "react";
import type { PaintReference } from "@/lib/types";
import { RefArt } from "@/components/RefArt";
import { Icon } from "@/components/Icon";

interface EnlargeDialogProps {
  reference: PaintReference;
  open: boolean;
  onClose: () => void;
}

/**
 * A large, uncropped view of the reference for use beside a physical sketchbook.
 * Uses the native <dialog> so focus is trapped and Escape closes it for free.
 */
export function EnlargeDialog({ reference, open, onClose }: EnlargeDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Backdrop click closes as a progressive enhancement; Escape and the
    // explicit Close button already provide full keyboard access.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={`Enlarged view of ${reference.title}`}
      className="m-auto w-[min(94vw,900px)] max-w-none rounded-card bg-surface-raised p-0 text-ink backdrop:bg-[rgb(20_28_34/0.55)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="font-display text-lg font-medium">{reference.title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close enlarged view"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
        >
          <Icon name="close" size={22} />
        </button>
      </div>
      <RefArt
        reference={reference}
        priority
        inset="roomy"
        className="aspect-[4/3] w-full"
      />
    </dialog>
  );
}
