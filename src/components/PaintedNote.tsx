/*
  Made once. `toLocaleDateString` builds a new formatter on every call, and a
  studio with a painted tree calls this a few hundred times a render: measured
  as most of the script time of choosing a leaf on a throttled phone.

  In UTC, and fed a UTC date, so the stored calendar day is the day shown
  whatever the device's zone - including after the zone changes while the app
  is open, which a formatter made in the old zone would otherwise carry on
  using, a day out.
*/
const DAY_AND_MONTH = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const WITH_YEAR = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The day a piece was painted, as a date and never as a duration.
 *
 * "14 September" and not "six days ago". A date measured against *now* implies
 * a clock you are falling behind, which is the pressure PRODUCT.md:38 rules
 * out - and it is the one place a list of pieces could slip into it without
 * anyone noticing. Shared by the studio and the series pages so the rule is
 * kept in one place rather than remembered in two.
 */
export function paintedOn(on: string): string {
  const [year, month, day] = on.split("-").map(Number);
  if (!year || !month || !day) return "";
  const sameYear = year === new Date().getFullYear();
  return (sameYear ? DAY_AND_MONTH : WITH_YEAR).format(new Date(Date.UTC(year, month - 1, day)));
}

/** The quiet line a card carries once its piece has been painted. */
export function PaintedNote({ on }: { on: string }) {
  return <p className="text-[0.8rem] text-ink-faint">Painted {paintedOn(on)}</p>;
}
