import type { CSSProperties, ReactNode } from "react";

interface WashiTagProps {
  children: ReactNode;
  /** A pigment CSS var name, e.g. "--pig-fruit". */
  pigmentVar?: string;
  rotate?: number;
  className?: string;
}

/** A label held down by a strip of translucent washi tape. */
export function WashiTag({
  children,
  pigmentVar = "--pig-fruit",
  rotate = -2,
  className = "",
}: WashiTagProps) {
  const style = {
    "--tape": `var(${pigmentVar})`,
    transform: `rotate(${rotate}deg)`,
  } as CSSProperties;
  return (
    <span className={`washi rounded-[2px] ${className}`} style={style}>
      {children}
    </span>
  );
}
