import { useApp } from "@/state/AppContext";
import { SUBJECT_LABEL, SUBJECT_PIGMENT, type Subject } from "@/lib/types";
import { WashiTag } from "@/components/studio/WashiTag";

interface SubjectTagProps {
  subject: Subject;
  className?: string;
  rotate?: number;
}

/**
 * Colour-coded subject label. In "Organised Chaos" it is a washi-taped tag in
 * the subject's pigment; in "Scattered Accents" it is a quiet pigment dot with
 * the label, keeping the structure calm.
 */
export function SubjectTag({ subject, className = "", rotate = -2 }: SubjectTagProps) {
  const { treatment } = useApp();
  const pig = SUBJECT_PIGMENT[subject];

  if (treatment === "chaos") {
    return (
      <WashiTag pigmentVar={pig} rotate={rotate} className={className}>
        {SUBJECT_LABEL[subject]}
      </WashiTag>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-ink-soft ${className}`}>
      <span
        aria-hidden="true"
        className="dab block h-3 w-3"
        style={{ background: `rgb(var(${pig}))` }}
      />
      {SUBJECT_LABEL[subject]}
    </span>
  );
}
