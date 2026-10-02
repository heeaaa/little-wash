import { useEffect, useRef } from "react";
import { useAccount } from "@/state/AccountContext";
import type { AccountNotice as Notice, NoticeReason } from "@/lib/account/service";
import { Icon } from "@/components/Icon";

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const FAILED: Record<NoticeReason, string> = {
  cancelled: "Sign-in was cancelled. little wash works just the same without an account.",
  "not-finished":
    "Sign-in didn’t finish in this browser. If you started it somewhere else, start again here.",
  unavailable: "Sign-in isn’t working right now. Please try again a little later.",
  offline: "You’re offline. Sign in when you’re back online.",
  other: "Sign-in didn’t work. Please try again.",
};

/** The words for each notice. Exported so the tests read the same sentences. */
export function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case "signed-in": {
      const who = notice.email ? `Signed in as ${notice.email}.` : "Signed in.";
      const { saved, painted } = notice.added;
      if (saved === 0 && painted === 0) return who;
      const moved = [
        saved > 0 ? count(saved, "saved piece", "saved pieces") : null,
        painted > 0 ? count(painted, "painted piece", "painted pieces") : null,
      ]
        .filter(Boolean)
        .join(" and ");
      const one = saved + painted === 1;
      // Only say they are in the account once the account has them.
      return notice.sent
        ? `${who} ${moved} from this browser ${one ? "is" : "are"} now in your account.`
        : `${who} ${moved} from this browser will move into your account as soon as it can be reached.`;
    }
    case "sign-in-failed":
      return FAILED[notice.reason];
    case "sign-in-unfinished":
      return "Sign-in didn’t finish. You can try again whenever you like.";
    case "signed-out":
      return "Signed out. Your studio is kept with your account for next time.";
    case "session-ended":
      return "You’ve been signed out. Sign in again to see your studio.";
    case "deleted":
      return "Your account and everything in it has been deleted.";
    case "delete-failed":
      return "Your account couldn’t be deleted just now. Nothing was removed. Please try again.";
    case "changes-refused":
      return `${count(notice.count, "change", "changes")} couldn’t be saved to your account, so your account’s version has been kept.`;
  }
}

/**
 * One message about the account, under the header, on whatever page the
 * person is on - a sign-in that went well or did not, a session that ended.
 *
 * Quiet by design: paper and ink, no colour, no icon shouting, no motion. It
 * stays until dismissed rather than vanishing on a timer someone might not
 * have read it in.
 *
 * The words are said through a live region that is always on the page, empty
 * or not - a region created together with its text is often not announced -
 * the same pattern the studio uses for its counts. The visible card repeats
 * them for sight and hides its copy from assistive technology, so nothing is
 * read twice; its dismiss button stays reachable.
 */
export function AccountNotice() {
  const { status, notice, dismissNotice } = useAccount();
  const dismiss = useRef<HTMLButtonElement>(null);

  /*
    Signing out and deleting the account remove the button that did it,
    with the signed-in view it sat in, and focus falls to nothing. It
    carries on from here, by the words saying what happened. Only for
    those two, and only when focus really was lost: any other notice
    arriving must not pull someone away from where they are.
  */
  useEffect(() => {
    if (notice?.kind !== "signed-out" && notice?.kind !== "deleted") return;
    const active = document.activeElement;
    if (active === null || active === document.body) dismiss.current?.focus();
  }, [notice]);

  if (status === "unavailable") return null;
  const text = notice ? noticeText(notice) : "";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <p role="status" aria-live="polite" className="sr-only">
        {text}
      </p>
      {notice ? (
        <div
          key={notice.id}
          className="mt-4 flex items-start justify-between gap-3 rounded-card border border-line bg-surface-raised py-1 pl-4 pr-1 shadow-lift"
        >
          <p aria-hidden="true" className="min-w-0 py-2.5 text-pretty text-[0.95rem] leading-snug text-ink">
            {text}
          </p>
          <button
            ref={dismiss}
            type="button"
            onClick={dismissNotice}
            aria-label="Dismiss this message"
            // The ring hugs the button: with the usual 2px offset it crossed
            // the card's edge, 4px away, once focus was moved here.
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink focus-visible:outline-offset-0"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
