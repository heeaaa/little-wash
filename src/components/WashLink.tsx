import type { ComponentProps, MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { move, rewet } from "@/lib/wash";

type WashLinkProps = ComponentProps<typeof Link> & {
  /**
   * Runs immediately before the browser snapshots the outgoing page, for a
   * surface that has to claim the shared transition name first. It must touch
   * the DOM directly: React has no chance to commit between here and the
   * snapshot.
   */
  onBeforeMove?: () => void;
  /**
   * Which of the two moments this navigation is. A move by default: the
   * artwork changes place. A re-wet for a link that puts a different piece in
   * the same place - the next piece in a series - which is a deal, not a
   * journey.
   */
  moment?: "move" | "rewet";
};

/**
 * A link whose navigation is a move: the artwork keeps its identity and the
 * browser morphs it into its new place rather than cutting to a new page.
 *
 * It stays a real anchor with a real href, so middle-click, modifier-click,
 * "open in new tab" and the status bar all behave normally - the transition is
 * only taken for the plain left-click that would have navigated in place
 * anyway. Where View Transitions are unavailable, `move` and `rewet` fall
 * through to an ordinary navigation.
 */
export function WashLink({
  to,
  state,
  replace,
  preventScrollReset,
  relative,
  onBeforeMove,
  moment = "move",
  onClick,
  ...rest
}: WashLinkProps) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    const opensElsewhere =
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (rest.target && rest.target !== "_self");
    if (opensElsewhere) return;

    event.preventDefault();
    // Forwarded, not just spread onto the anchor: this navigation is ours,
    // so anything the caller set on the link has to reach `navigate` too.
    const go = () => navigate(to, { state, replace, preventScrollReset, relative });
    if (moment === "rewet") rewet(go, onBeforeMove);
    else move(go, onBeforeMove);
  }

  return (
    <Link
      to={to}
      state={state}
      replace={replace}
      preventScrollReset={preventScrollReset}
      relative={relative}
      onClick={handleClick}
      {...rest}
    />
  );
}
