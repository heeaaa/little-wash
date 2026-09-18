import { useApp } from "@/state/AppContext";
import { Icon } from "@/components/Icon";
import type { PaintReference } from "@/lib/types";

interface SurpriseButtonProps {
  variant?: "quiet" | "solid";
  className?: string;
  onSurprised?: (reference: PaintReference | null) => void;
}

/** "Surprise me" - swaps the featured piece for a random one within the filter. */
export function SurpriseButton({
  variant = "solid",
  className = "",
  onSurprised,
}: SurpriseButtonProps) {
  const { surprise, visible } = useApp();
  const disabled = visible.length <= 1;

  const handleClick = () => {
    const next = surprise();
    onSurprised?.(next);
  };

  if (variant === "quiet") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-chip px-3 text-[0.95rem] font-semibold text-accent underline decoration-2 underline-offset-4 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline disabled:opacity-60 ${className}`}
      >
        <Icon name="dice" size={19} />
        Deal me another
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-chip bg-accent px-6 text-[1.02rem] font-bold text-accent-ink shadow-lift transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${className}`}
    >
      <Icon name="dice" size={22} />
      Surprise me
    </button>
  );
}
