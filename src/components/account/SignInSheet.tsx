import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "@/state/AccountContext";
import { useModal } from "@/hooks/useModal";
import { inAppBrowser } from "@/lib/account/callback";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";
import { noticeText } from "@/components/account/AccountNotice";
import { Icon } from "@/components/Icon";

/**
 * What signing in does, said before Google's screen appears.
 *
 * One sheet, rendered once in AppShell and opened from the studio or the
 * footer. It exists because Google's own screen will name the Supabase host
 * rather than little wash (docs/plans/google-sign-in.md), and a person who has
 * been told that first is not alarmed by it. It also says the two things a
 * cautious person wants to know: nothing is needed to keep using the app, and
 * what is already here is not lost.
 */
export function SignInSheet() {
  const { status, sheetOpen, sheetNotice, closeSignIn, signIn, busy, host } = useAccount();
  const { ref, onNativeClose } = useModal(sheetOpen, closeSignIn);
  // Google refuses sign-in inside some apps' built-in browsers; say so first.
  const blockedIn = useMemo(
    () => (typeof navigator === "undefined" ? null : inAppBrowser(navigator.userAgent)),
    [],
  );

  if (status === "unavailable") return null;
  const leaving = busy === "signing-in";

  return (
    <dialog
      ref={ref}
      onClose={onNativeClose}
      aria-labelledby="sign-in-title"
      className="sign-in-sheet"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 id="sign-in-title" className="font-display text-lg font-medium text-ink">
          Keep your studio with you
        </h2>
        <button
          type="button"
          onClick={closeSignIn}
          aria-label="Close"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="space-y-3 px-5 pb-6 pt-4 text-pretty text-[0.95rem] leading-relaxed text-ink-soft">
        <p>
          Sign in with Google and the pieces you save and mark painted are kept with your account,
          ready on your phone, tablet or computer.
        </p>
        <p>
          You don&rsquo;t need an account to use little wash. Anything already in this browser
          moves into your account when you sign in.
        </p>

        {blockedIn ? (
          <p className="rounded-chip border border-line bg-surface-sunken px-3 py-2 text-ink">
            Google won&rsquo;t sign anyone in from inside {blockedIn}. Open little wash in Safari or
            Chrome, then sign in there.
          </p>
        ) : null}

        <div className="pt-1">
          <GoogleSignInButton onClick={() => void signIn()} busy={leaving} />
          {/*
            Also where a sign-in that could not start says so: the notice under
            the header is behind this sheet, inert, and maybe off-screen.
          */}
          <p role="status" className="mt-2 min-h-[1.25rem] text-[0.9rem]">
            {leaving ? "Opening Google…" : sheetNotice ? noticeText(sheetNotice) : ""}
          </p>
        </div>

        <p className="text-[0.85rem] text-ink-faint">
          Google will say you&rsquo;re continuing to{" "}
          <span className="break-all font-semibold text-ink-soft">{host}</span>, the service little
          wash keeps accounts with. Your account holds your email address, the name and picture
          Google shares, and your studio.{" "}
          <Link
            to="/privacy"
            onClick={closeSignIn}
            className="underline decoration-[rgb(var(--ink)/0.3)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]"
          >
            What&rsquo;s kept, and where
          </Link>
        </p>

        <button
          type="button"
          onClick={closeSignIn}
          className="inline-flex min-h-[44px] items-center rounded-chip px-1 text-[0.95rem] font-semibold text-accent underline decoration-2 underline-offset-4 hover:opacity-80"
        >
          Not now
        </button>
      </div>
    </dialog>
  );
}
