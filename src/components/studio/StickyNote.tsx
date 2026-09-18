import type { CSSProperties, ReactNode } from "react";

interface StickyNoteProps {
  children: ReactNode;
  /** Note colour as an "r g b" triple; defaults to a warm paper yellow. */
  colorRgb?: string;
  rotate?: number;
  className?: string;
}

/** A small sticky note carrying a short prompt. Decorative but readable. */
export function StickyNote({
  children,
  colorRgb = "246 216 122",
  rotate = 1.5,
  className = "",
}: StickyNoteProps) {
  const style = {
    "--note": colorRgb,
    transform: `rotate(${rotate}deg)`,
  } as CSSProperties;
  return (
    <div
      className={`sticky rounded-[3px] px-4 py-3 text-[0.95rem] leading-snug text-ink ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
