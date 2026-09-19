import { useEffect, useRef } from "react";
import type { PaintReference } from "@/lib/types";
import { RefArt } from "@/components/RefArt";
import { Icon } from "@/components/Icon";
import { PIECE_ART } from "@/lib/wash";

interface EnlargeDialogProps {
  reference: PaintReference;
  open: boolean;
  onClose: () => void;
}

/**
 * A large, uncropped view of the reference for use beside a physical sketchbook.
 * Uses the native <dialog> so focus is trapped and Escape closes it for free.
 *
 * The dialog is sized to the viewport, never to a fixed aspect ratio: a phone
 * propped on a stand beside a sketchbook is usually on its side, and a 4:3 box
 * in a 390px-tall viewport cropped the subject. The mat is the dialog's own
 * background, so every pixel that is not the title bar belongs to the artwork.
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
      className="enlarge art-mat text-ink backdrop:bg-[rgb(20_28_34/0.55)]"
    >
      <div className="enlarge-shell">
        <div className="enlarge-bar">
          <p className="min-w-0 text-pretty font-display text-lg font-medium leading-snug">
            {reference.title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enlarged view"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-[rgb(var(--ink)/0.07)] hover:text-ink"
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <RefArt
          reference={reference}
          priority
          mat={false}
          inset="none"
          transitionName={open ? PIECE_ART : undefined}
          className="enlarge-art"
        />
      </div>
    </dialog>
  );
}
