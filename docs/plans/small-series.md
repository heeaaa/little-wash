# Small themed series - plan and outcome

_Planned and built 30/09/2026. The rules the build follows live in DESIGN.md
("Small series", "A new page opens at its top", "Browse draws a page at a
time"); this file records what was agreed and why, so it is not re-litigated._

## Scope

Roadmap item 1: finite, ordered collections - "Seven tiny skies", "Five cafe
treats", "A week of leaves".

## Decisions taken with the user

| Question | Answer | Why it came up |
| --- | --- | --- |
| The cafe series | "Cross-section fruits" instead | The catalogue holds one cafe treat, the muffin; a teapot and a chair are not treats |
| Painted state in a series | Each piece's own date, nothing added up | A finite run with no memory makes you remember where you were; a count or "next up" would make it a queue |
| The scroll bug found on the way | Fix it app-wide | Series Next would inherit it: a phone opened a piece at scrollY 579 with its plate off screen |
| Skies and leaves lists | Build with the proposed lists | Judged from contact sheets of the photos, not their alt text |
| Browse loading the whole catalogue (asked mid-build) | "Show more", not infinite scroll or pages | Measured: 1,113ms of blocked main thread and a 1,792ms filter tap on a slowed phone; see DESIGN.md |

Decided without asking, with the reason recorded in DESIGN.md: series live on
Browse and their own page, not on Today or in the nav; numbered, never "x of
y"; a series is offered whole or withdrawn; series are not filtered; Previous
and Next are a re-wet.

## The series as built

- **Seven tiny skies** (Pexels): Gradient Sky, Sailboat Under a Sunset,
  Seascape, Sunrise with Mountain, Ocean Scene, Grassy Field Under a Cloudy
  Sky, Roller Against a Sunset. Calm Ocean, Oranges and Blues and Mountain
  Ridges were set aside: the sea or the hills lead, not the sky.
- **A week of leaves** (Unsplash, Pexels, The Met): Pale Heart-Shaped Leaf,
  Striped Calathea Leaf, Pink Leaf on Teal, Fern leaf, Fern, Green Maple Leaf,
  Woodland Plant Study.
- **Six fruit cross-sections** (Pexels): Grapefruit and Lemon Half, Orange
  Slices and Leaves, Grapefruit and Orange Slices, Citrus and Kiwi Slices,
  Orange Slices on Green, Citrus Halves - the two rated "a stretch" last, as
  the finish review pointed out. Proposed after the user named the theme;
  Lemon, Lime and Orange and Lemons and Mandarins were set aside as whole
  fruit. Titles, blurbs and this list are for the curator to review on the
  rendered pages.

## Acceptance criteria

1. Browse offers a card per whole series, opening `#/series/<id>`.
2. A series page lists its pieces in order, numbered, with time, difficulty,
   credit, Save and each piece's own painted date; no counts or progress.
3. A piece opened from a series keeps it in the URL: the back link names it,
   Previous/Next step through it, the last piece offers the way back, and a
   reload keeps all of it.
4. A series with a source switched off leaves Browse, and its page says which
   source it needs; unknown ids are "not here".
5. The register holds: no "x of y", achievement or schedule language, or
   relative dates - asserted in tests.
6. Axe-clean, 44px targets and no sideways scroll on the new routes, on phone,
   propped phone and desktop.
7. Next on a phone opens the next piece at its top without the artwork flying
   in; a new page opens at its top everywhere; Back still restores your place.
8. The shipped content passes its integrity tests.
9. Browse draws 24 at a time; the length survives Back and reload; a filter
   starts a fresh first page.

## Not done here

- The collection covers on Browse pass no `sizes`, so a 96px cover downloads
  the 1600px image: most of the 1,685 KB a phone fetches on arriving at Browse.
  A one-line fix, left for its own change.
- A filter tap on a 4x-slowed phone is 830ms, down from 1,792ms but above the
  200ms responsiveness target.
- Real-device check of the series and paging on a phone.
