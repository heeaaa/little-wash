/**
 * The day a piece was painted, as a date and never as a duration.
 *
 * "14 September" and not "six days ago". A date measured against *now* implies
 * a clock you are falling behind, which is the pressure PRODUCT.md:38 rules
 * out - and it is the one place a list of pieces could slip into it without
 * anyone noticing. Shared by the studio and the series pages so the rule is
 * kept in one place rather than remembered in two.
 */
function paintedOn(on: string): string {
  const [year, month, day] = on.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** The quiet line a card carries once its piece has been painted. */
export function PaintedNote({ on }: { on: string }) {
  return <p className="text-[0.8rem] text-ink-faint">Painted {paintedOn(on)}</p>;
}
