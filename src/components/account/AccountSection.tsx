import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "@/state/AccountContext";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { noticeText } from "@/components/account/AccountNotice";

function pieces(count: number, kind: string): string {
  return `${count} ${kind} ${count === 1 ? "piece" : "pieces"}`;
}

/**
 * The studio's last section when signed in: what the account keeps, and the
 * way to delete it. At the foot of the page on purpose - leaving is always
 * available, and never the first thing anyone sees.
 */
export function AccountSection() {
  const account = useAccount();
  // While the question is open: the id of the notice showing when it was
  // asked, so a failure after that is said inside the dialog.
  const [askedSince, setAskedSince] = useState<number | null>(null);
  const { status, user, record, busy, notice } = account;
  if (status !== "signed-in") return null;
  const failed =
    askedSince !== null && notice?.kind === "delete-failed" && notice.id > askedSince ? noticeText(notice) : null;

  const saved = record?.saved.length ?? 0;
  const painted = record?.painted.length ?? 0;

  return (
    <>
      {/*
        The dialog is a sibling of this block, not inside it: `space-y-3` gives
        every child after the first a top margin, a utility that outranks the
        sheet's own `margin: auto 0 0`, and pinned the question to the top of a
        phone's screen instead of its foot. Found in the screenshot review.
      */}
      <div className="max-w-reading space-y-3 text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
        <p>
          Your studio is kept with{" "}
          <span className="break-all font-semibold text-ink">{user?.email ?? "your Google account"}</span>,
          so what you save and paint is there on any device you sign in on. Signing out takes it off
          this browser; signing in again brings it back.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => setAskedSince(notice?.id ?? 0)}
            className="inline-flex min-h-[44px] items-center rounded-chip border border-line bg-surface-raised px-4 text-[0.95rem] font-semibold text-ink hover:border-[rgb(var(--ink)/0.35)]"
          >
            Delete my account
          </button>
          <Link
            to="/privacy"
            className="inline-flex min-h-[44px] items-center text-[0.95rem] underline decoration-[rgb(var(--ink)/0.3)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]"
          >
            What&rsquo;s kept, and where
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={askedSince !== null}
        title="Delete your account?"
        confirmLabel="Delete my account"
        cancelLabel="Keep my account"
        onConfirm={() => void account.deleteAccount()}
        onCancel={() => setAskedSince(null)}
        busyLabel={busy === "deleting" ? "Deleting your account…" : null}
        failure={failed}
      >
        <p>
          This deletes your account and everything in it: {pieces(saved, "saved")} and{" "}
          {pieces(painted, "painted")}, on every device. It can&rsquo;t be undone.
        </p>
        <p>You can keep using little wash without an account afterwards.</p>
      </ConfirmDialog>
    </>
  );
}
