import type { ReactNode, Ref } from "react";
import { Icon, type IconName } from "@/components/Icon";

interface EmptyPanelProps {
  /** The mark in the badge. Pick one that names the situation, not the app. */
  icon: IconName;
  title: string;
  /** The explanation. Sits with the title, inside the reading measure. */
  description: ReactNode;
  /** The way out, if there is one. Sits below the measure, full width. */
  children?: ReactNode;
  /** The panel element, for a caller that needs to bring it into view. */
  containerRef?: Ref<HTMLDivElement>;
}

/**
 * The shell every "there is nothing here" moment shares: a dashed plate, a
 * quiet badge, a display-type title, the explanation held to a readable
 * measure, and room underneath for the way out.
 *
 * It holds no opinion about *why* the thing is empty, which is the point - a
 * filtered catalogue and an untouched studio are different situations needing
 * different words, but they should look like the same product.
 */
export function EmptyPanel({
  icon,
  title,
  description,
  children,
  containerRef,
}: EmptyPanelProps) {
  return (
    <div
      ref={containerRef}
      className="jump-target flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-12 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
        <Icon name={icon} size={26} />
      </span>

      <div className="max-w-sm space-y-1.5">
        <p className="font-display text-xl text-ink">{title}</p>
        {description}
      </div>

      {children}
    </div>
  );
}
