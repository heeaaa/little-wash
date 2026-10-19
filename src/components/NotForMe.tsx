import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import type { PaintReference } from "@/lib/types";

/*
  "Not for me": saying a piece is not one you will paint, so Today, dealing and
  Browse stop offering it (docs/plans/not-for-me-reminders-curation.md,
  Phase 1; DESIGN.md, "Not for me").

  The quietest control wherever it appears: soft ink, a thin underline, after
  the actions that matter. It is a preference about the catalogue, not a verdict
  on the piece, so nothing here is red, struck through or final - there is
  always a way back, one tap away.
*/

const QUIET =
  "inline-flex min-h-[44px] items-center gap-2 rounded-chip px-3 text-[0.95rem] font-medium text-ink-soft underline decoration-[rgb(var(--ink)/0.3)] decoration-1 underline-offset-[5px] transition-colors hover:text-ink hover:decoration-[rgb(var(--ink)/0.6)]";

/** Today's control, beside "Deal me another". Hides the piece and deals another. */
export function NotForMeButton({
  reference,
  onPress,
  className = "",
}: {
  reference: PaintReference;
  onPress: () => void;
  className?: string;
}) {
  const note = useId();
  return (
    <>
      <button
        type="button"
        data-action="not-for-me"
        onClick={onPress}
        aria-describedby={note}
        className={`${QUIET} ${className}`}
      >
        <Icon name="eye-off" size={19} />
        Not for me
      </button>
      <span id={note} className="sr-only">
        Hides {reference.title} from Today and Browse. You can bring it back from Where ideas come from.
      </span>
    </>
  );
}

/**
 * What was just hidden, and the way back. It stays until the next deal, filter
 * change or page - no timer, like every notice in this app: someone painting
 * with wet hands should not have to race a countdown to undo a stray tap.
 */
export function HiddenUndo({
  title,
  onUndo,
  focusOnArrival = false,
}: {
  title: string;
  onUndo: () => void;
  /** When the control that hid the piece has gone with it, Undo takes focus. */
  focusOnArrival?: boolean;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusOnArrival) button.current?.focus({ preventScroll: true });
  }, [focusOnArrival]);

  return (
    <p className="hidden-undo mt-2 flex flex-wrap items-center gap-x-1 text-[0.92rem] text-ink-soft">
      <span>
        <span className="font-semibold text-ink">{title}</span> won&rsquo;t come up again.
      </span>
      <button
        ref={button}
        type="button"
        data-action="undo"
        onClick={onUndo}
        className="min-h-[44px] rounded-chip px-2 text-[0.92rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80"
      >
        Undo
      </button>
    </p>
  );
}

/**
 * On a piece's own page: below the action row, a quiet "Not for me" - or, once
 * hidden, a line that says so and "Bring it back". The page stays put either
 * way; hiding changes what is offered, not what can be opened.
 *
 * One button whose words change, so focus stays where it was pressed.
 */
export function DetailNotForMe({ reference }: { reference: PaintReference }) {
  const { isHidden, toggleHidden } = useApp();
  const hidden = isHidden(reference.id);
  const note = useId();
  // Said only after a press, never on arrival.
  const [said, setSaid] = useState("");

  const press = () => {
    toggleHidden(reference.id);
    setSaid(
      hidden
        ? `${reference.title} can come up again on Today and in Browse.`
        : `${reference.title} is hidden. It won’t come up on Today or in Browse.`,
    );
  };

  return (
    <div className="detail-not-for-me mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      {hidden ? (
        <p id={note} className="text-[0.92rem] text-ink-soft">
          Hidden from Today and Browse.
        </p>
      ) : (
        <span id={note} className="sr-only">
          Hides {reference.title} from Today and Browse.
        </span>
      )}
      <button
        type="button"
        data-action="not-for-me"
        onClick={press}
        aria-describedby={note}
        // Alone on its line, the label lines up with the row above.
        className={`${QUIET} ${hidden ? "" : "-ml-3"}`}
      >
        <Icon name={hidden ? "eye" : "eye-off"} size={19} />
        {hidden ? "Bring it back" : "Not for me"}
      </button>
      <p role="status" className="sr-only">
        {said}
      </p>
    </div>
  );
}
