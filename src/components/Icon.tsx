import type { SVGProps } from "react";

export type IconName =
  | "clock"
  | "dice"
  | "heart"
  | "heart-filled"
  | "arrow-left"
  | "close"
  | "check"
  | "brush"
  | "expand"
  | "palette"
  | "grid"
  | "today"
  | "tag";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

/**
 * Authored icon set - a single consistent stroke weight, drawn as SVG (never
 * emoji or unicode glyphs). Decorative by default; give a title via aria-label
 * on the control that wraps it.
 */
export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

const PATHS: Record<IconName, JSX.Element> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="9" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.6-7-9.7A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7 3.3C19 15.4 12 20 12 20Z" />
  ),
  "heart-filled": (
    <path
      d="M12 20s-7-4.6-7-9.7A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7 3.3C19 15.4 12 20 12 20Z"
      fill="currentColor"
    />
  ),
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  tag: (
    <>
      <path d="M11.2 4H5a1 1 0 0 0-1 1v6.2a2 2 0 0 0 .6 1.4l7 7a1.6 1.6 0 0 0 2.3 0l5.3-5.3a1.6 1.6 0 0 0 0-2.3l-7-7A2 2 0 0 0 11.2 4Z" />
      <circle cx="8.4" cy="8.4" r="1.3" />
    </>
  ),
  brush: (
    <>
      <path d="M15.5 4.5 20 9l-8 8" />
      <path d="M12 17c0 2.2-1.8 4-4 4-1.6 0-3-.9-3-2.5 0-1.6 1.2-2 1.2-3.5" />
      <path d="M8.5 15.5 15.5 4.5" />
    </>
  ),
  expand: (
    <>
      <path d="M9 4H5a1 1 0 0 0-1 1v4" />
      <path d="M15 4h4a1 1 0 0 1 1 1v4" />
      <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
      <path d="M15 20h4a1 1 0 0 0 1-1v-4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.9 2-2 0-1.4 1-2 2.2-2H18a3.5 3.5 0 0 0 3.5-3.5C21.5 6.7 17.6 3.5 12 3.5Z" />
      <circle cx="8" cy="11" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 9h16" />
      <path d="M9 3v3M15 3v3" />
    </>
  ),
};
