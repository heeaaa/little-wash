import type { CSSProperties, ReactNode } from "react";

interface StickyNoteProps {
  children: ReactNode;
  /** Override the note paper as an "r g b" triple; defaults to the --note token. */
  colorRgb?: string;
  rotate?: number;
  className?: string;
}

/** A small note slip carrying a short prompt. Decorative but readable. */
export function StickyNote({
  children,
  colorRgb,
  rotate = 1.5,
  className = "",
}: StickyNoteProps) {
  const style = {
    ...(colorRgb ? { "--note": colorRgb } : null),
    transform: `rotate(${rotate}deg)`,
  } as CSSProperties;
  return (
    <div
      className={`note-paper rounded-[3px] px-4 py-3 text-[0.95rem] leading-snug text-ink ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
