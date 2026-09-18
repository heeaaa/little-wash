import type { PaintReference } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { DifficultyMark } from "@/components/DifficultyMark";

interface MetaRowProps {
  reference: PaintReference;
  className?: string;
}

/** Compact time + difficulty summary used on cards and headers. */
export function MetaRow({ reference, className = "" }: MetaRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-ink-soft">
        <Icon name="clock" size={16} />
        <span className="tnum">{reference.minutes}</span>&nbsp;min
      </span>
      <span className="inline-flex items-center gap-1.5 text-ink-soft">
        <DifficultyMark difficulty={reference.difficulty} />
        <span className="text-[0.9rem] font-medium">
          {DIFFICULTY_LABEL[reference.difficulty]}
        </span>
      </span>
    </div>
  );
}
