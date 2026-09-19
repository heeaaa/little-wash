import { SUBJECT_LABEL, SUBJECT_PIGMENT, type Subject } from "@/lib/types";
import { WashiTag } from "@/components/studio/WashiTag";

interface SubjectTagProps {
  subject: Subject;
  className?: string;
  rotate?: number;
}

/** Colour-coded subject label: a washi-taped tag in the subject's pigment. */
export function SubjectTag({ subject, className = "", rotate = -2 }: SubjectTagProps) {
  return (
    <WashiTag pigmentVar={SUBJECT_PIGMENT[subject]} rotate={rotate} className={className}>
      {SUBJECT_LABEL[subject]}
    </WashiTag>
  );
}
