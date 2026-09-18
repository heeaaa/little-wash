import type { Difficulty } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

const LEVEL: Record<Difficulty, number> = { gentle: 1, steady: 2, stretch: 3 };

interface DifficultyMarkProps {
  difficulty: Difficulty;
  className?: string;
}

/**
 * Three brush dabs, filled to the level. Decorative; the visible or adjacent
 * text label always carries the meaning for assistive tech.
 */
export function DifficultyMark({ difficulty, className = "" }: DifficultyMarkProps) {
  const level = LEVEL[difficulty];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`Difficulty: ${DIFFICULTY_LABEL[difficulty]}`}
    >
      {[1, 2, 3].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M7 1.4c2 1.4 4 3 4 6.2 0 2.6-1.8 4.6-4 4.6S3 10.2 3 7.6c0-3.2 2-4.8 4-6.2Z"
            fill={n <= level ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.2"
            opacity={n <= level ? 1 : 0.4}
          />
        </svg>
      ))}
    </span>
  );
}
