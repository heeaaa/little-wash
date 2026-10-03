import { useAccount } from "@/state/AccountContext";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";

const quiet =
  "inline-flex min-h-[44px] items-center rounded-chip px-1 text-[0.95rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80";

function changes(count: number): string {
  return count === 1 ? "1 change" : `${count} changes`;
}

/**
 * The studio's one line about accounts, under its lede.
 *
 * Signed out it is the whole offer - a sentence and a quiet link - and says
 * nothing more: no badge, no banner, nothing that returns or follows anyone
 * around (DESIGN.md, "Accounts"). Signed in it says who, offers a way out, and
 * speaks up about the connection only when a change is actually waiting.
 */
export function AccountLine() {
  const account = useAccount();
  const { status, user, sync, pending, busy, confirmSignOut } = account;

  if (status === "unavailable") return null;

  if (status === "starting") {
    return (
      <p role="status" className="mt-3 text-[0.95rem] text-ink-soft">
        Opening your studio&hellip;
      </p>
    );
  }

  if (status === "signed-out") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[0.95rem] text-ink-soft">
        <p>Your studio is kept in this browser.</p>
        <button type="button" onClick={account.openSignIn} className={quiet}>
          Sign in to keep it on every device
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 text-[0.95rem] text-ink-soft">
      <div className="flex flex-wrap items-center gap-x-2">
        <p className="min-w-0">
          Signed in as <span className="break-all font-semibold text-ink">{user?.email ?? "your Google account"}</span>.
        </p>
        <button
          type="button"
          onClick={() => void account.signOut()}
          aria-disabled={busy === "signing-out" || undefined}
          className={`${quiet} aria-disabled:cursor-progress aria-disabled:opacity-70`}
        >
          {busy === "signing-out" ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/*
        Silent while things are fine: "sending" and "idle" say nothing. Only a
        change that is stuck gets a sentence, and only then the way to nudge it.
      */}
      <div role="status" className="text-[0.9rem]">
        {sync === "offline" && pending > 0 ? (
          <p className="mt-1">
            You&rsquo;re offline. {changes(pending)} will reach your account when you&rsquo;re back
            online.
          </p>
        ) : null}
        {sync === "failed" ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2">
            <span>
              Can&rsquo;t reach your account just now.{" "}
              {pending === 0
                ? "Your studio is safe here."
                : `${changes(pending)} ${pending === 1 ? "is" : "are"} kept here until it’s back.`}
            </span>
            <button type="button" onClick={account.retry} className={quiet}>
              Try again
            </button>
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out with changes unsent?"
        confirmLabel="Sign out anyway"
        cancelLabel="Stay signed in"
        onConfirm={() => void account.signOut({ discardUnsent: true })}
        onCancel={account.keepSignedIn}
        busyLabel={busy === "signing-out" ? "Signing out…" : null}
      >
        <p>
          {pending === 1 ? "1 change hasn't" : `${pending} changes haven't`} reached your account yet,
          and can&rsquo;t be sent right now. Signing out removes {pending === 1 ? "it" : "them"} from this
          browser.
        </p>
        <p>Stay signed in and they&rsquo;ll be sent when your account can be reached.</p>
      </ConfirmDialog>
    </div>
  );
}
