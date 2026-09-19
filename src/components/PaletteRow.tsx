import type { Swatch } from "@/lib/types";

interface PaletteRowProps {
  palette: Swatch[];
  /** dabs = painted blobs (detail view); dots = compact chips (cards). */
  variant?: "dabs" | "dots";
  showNames?: boolean;
}

/**
 * The suggested limited palette. Swatch colours are display-only reference
 * dots; they are never applied to the artwork or its mat.
 */
export function PaletteRow({
  palette,
  variant = "dots",
  showNames = false,
}: PaletteRowProps) {
  return (
    <ul
      className={`flex flex-wrap items-center ${
        variant === "dabs" ? "gap-x-5 gap-y-3" : "gap-x-3 gap-y-2"
      }`}
    >
      {palette.map((swatch) => (
        <li key={swatch.name} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`dab block rotate-3 ${
              variant === "dabs" ? "h-7 w-7 shadow-lift" : "h-4 w-4"
            }`}
            style={{ backgroundColor: swatch.hex }}
          />
          <span
            className={
              showNames
                ? "text-[0.82rem] font-medium text-ink-soft"
                : "sr-only"
            }
          >
            {swatch.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
