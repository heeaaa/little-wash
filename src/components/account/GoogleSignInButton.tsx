import gLogo from "@/assets/google/g-logo.svg";

interface GoogleSignInButtonProps {
  onClick: () => void;
  /** On its way to Google. The button keeps focus and its words; it just stops answering. */
  busy?: boolean;
}

/**
 * Google's sign-in button, built to its branding guidelines rather than in
 * this app's own style - the one deliberate exception to the palette and the
 * type (DESIGN.md, "Accounts"). The words are one of the three Google allows,
 * and the logo is Google's own file (src/assets/google/README.md).
 *
 * While busy it is `aria-disabled` rather than `disabled`, so keyboard focus
 * stays on it instead of falling to the page as the browser leaves.
 */
export function GoogleSignInButton({ onClick, busy = false }: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      className="google-signin"
      aria-disabled={busy || undefined}
      onClick={() => {
        if (!busy) onClick();
      }}
    >
      <img src={gLogo} alt="" aria-hidden="true" width={20} height={20} draggable={false} />
      <span>Sign in with Google</span>
    </button>
  );
}
