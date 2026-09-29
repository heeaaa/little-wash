# Curating the catalogue

A working reference for a curation session. The pipeline itself is documented
in the README; this is the bit you keep open while you work.

## The six subjects

These are fixed - they are what the app's subject filter offers, defined as
`Subject` in `src/lib/types.ts`. Use the exact string on the left in commands.

| Use this | Shown in the app as |
| --- | --- |
| `botanical` | Botanical |
| `creatures` | Creatures |
| `fruit` | Fruit |
| `landscape` | Landscape |
| `objects` | Objects |
| `still-life` | Still life |

Adding a seventh means changing the `Subject` type, `SUBJECT_LABEL` and
`SUBJECT_PIGMENT` in `src/lib/types.ts`, and adding queries for it to
`catalog/harvest-plan.json`. Not a curation-time decision.

## The session

```bash
# 1. Where are the gaps? Run this first and last, every time.
npm run catalog:coverage

# 2. Curate one subject at a time. The header shows progress to its target.
npm run catalog:review -- --source=pexels --subject=botanical
#    Then open http://localhost:4321 and Ctrl-C when you are done.

# 3. Build. Refuses anything missing a licence, a link back, or real alt text.
npm run catalog:build

# 4. Check the gap closed.
npm run catalog:coverage
```

Repeat 2-4 for each subject. `catalog:build` can be run as often as you like;
it only reads `catalog/approved/`.

## Reviewing proposals instead of starting cold

When someone has been through a subject ahead of you, their decisions sit in
`catalog/proposals/pexels.json`: approve or set aside, why, whether they are
unsure, and for every proposed approval the title, difficulty, minutes, prompt,
tip, alt text and palette already filled in.

**You review the proposed approvals only.** On the first subject done this way
(still life, 28/09/2026) you agreed with all 71 decisions, set-asides included,
and asked not to be shown the set-asides again. So they are recorded without
review, and the queue holds only what would go into the catalogue.

```bash
# 1. Record the proposed set-asides. Shows what is waiting first; running it
#    twice changes nothing.
npm run catalog:proposals -- --source=pexels --apply-set-asides

# 2. Review the proposed approvals.
npm run catalog:review -- --source=pexels --subject=objects --proposals
```

- Confident approvals come first, then the unsure ones, marked **unsure**.
- **Agreeing is one press.** **Approve** saves the fields exactly as shown.
- **Changing it is the same form as always.** Edit any field before
  approving, or press **Set aside instead** and give your reason.
- The grey list under each proposal says what came from the eye rather than
  from the pixels, usually a pigment the palette reader missed. Check those.
- The header counts how often you have agreed, across every subject. Each
  decision records what was proposed, so agreement is measured from what you
  actually did. Set-asides recorded without review are marked
  `"decidedBy": "Claude"` in `catalog/curation-vocabulary.json` and never
  count as agreement, since nobody looked at them.
- To look at a set-aside anyway, run the review without `--proposals`. That
  queue shows every candidate in the subject, decided or not, so you can
  approve one from there; the build only reads `catalog/approved/`.

A proposal file that would fail the build (alt text under 40 characters, the
provider's caption pasted through, an unknown subject) stops the tool at start
up with the list of problems, rather than surfacing twenty approvals later.

## Museum sources (the Met)

Pexels and Unsplash photos are shown straight from their own sites. Museum
pieces are different: the Met allows neither hotlinking nor resizing, so each
approved piece is downloaded once and saved as our own images in
`public/references/met/` (400, 800 and 1600px WebP), with a record in
`catalog/derived.json`. CC0 is the licence that allows this.

- **You do not need an extra step.** Approving a Met piece in the review tool
  saves its images there and then; the terminal says `derived ... at 400,
  800, 1600px`. `catalog:build` then works as always.
- If an approval could not be saved as images (the terminal says `could not
  derive`), `catalog:build` names the piece and asks you to run
  `npm run catalog:derive`. That retries anything missing and nothing else.
- The Met has its own search plan, `catalog/harvest-plan-met.json`:
  `npm run catalog:harvest -- --plan=catalog/harvest-plan-met.json --source=met --subject=objects`.
  Harvest one subject at a time. The Met's firewall refuses everything after
  roughly a hundred requests in a row (found 28/09/2026), even when they are
  paced; the harvest now stops at the first refusal and keeps what it had.
- A plain Met search is dominated by paintings of people. Narrow each search
  to a department with `"department": <id>` in the plan; see
  `catalog/harvest-plan-met-collections.json` for animal sculpture, ancient
  vessels, and Asian flower and fruit paintings. The ids: 3 Ancient West
  Asian, 6 Asian, 9 Drawings and Prints, 10 Egyptian, 11 European Paintings,
  12 European Sculpture and Decorative Arts, 13 Greek and Roman.
- Before 28/09/2026 the adapter put the search words first, which the Met
  silently ignores, so the first Met harvest returned unrelated works. It
  was judged on its images like any other, so those decisions stand.
- These images are hosted with the site. About 30 pieces come to a few
  megabytes; they are ordinary files, so removing a piece means deleting its
  files and its line in `catalog/derived.json`.

## When a subject runs thin

```bash
# Fetch more for one subject, using the queries in catalog/harvest-plan.json
npm run catalog:harvest -- --plan --subject=landscape

# Re-rank, taking in whatever you have approved and set aside since
npm run catalog:shortlist -- --source=pexels
```

Harvesting downloads and measures every image and drops near-identical ones,
so it is slow: the full plan of 444 candidates took over ten minutes. Anything
already approved is skipped and measurements are cached by image URL, so
re-running is cheap.

A planned harvest (`--plan`) adds to the queue already on disk; harvesting one
subject keeps every other subject's candidates. Before 28/09/2026 it replaced
the whole file.

To widen a subject, add queries to `catalog/harvest-plan.json` rather than
passing one-off searches. That way the next person can reproduce the catalogue.

## One-off searches

```bash
npm run catalog:harvest -- --source=pexels --query="single fig on linen"
npm run catalog:harvest -- --source=pexels --collection=sroaotf
npm run catalog:collections            # list Pexels' featured themes
```

Note these overwrite `catalog/candidates/pexels.json`, so anything you have not
reviewed yet is replaced. Finish a queue before starting a different harvest.

## The targets

12 approved per subject, 72 overall. The app keeps showing its placeholder
illustrations until the catalogue clears this floor, because switching earlier
would leave most filters empty:

- at least 8 per subject
- at least 12 in each time band (under 10 min, 10-20, over 20)
- at least 12 at each difficulty
- no subject empty in more than one time band

`catalog:coverage` prints "Ready to replace the placeholders in the app" and
lists whatever is still short.

**Watch the time bands.** After the first session every reference was over 20
minutes and the "Under 10 min" filter had nothing in it at all - which is the
quickest way into a warm-up and the thing the product is built around. Gentle
subjects on plain backdrops are what fill that band.

## What the review tool gives you

- **Prompt, tip** - both optional. Leave either blank and the app leaves the
  line out: Today drops the italic prompt under the title, and Detail drops
  the whole Tip panel. Only alt text, a title and the credit are required.
- **Prompt and tip suggestions** - three finished sentences each, from the
  image's measured value range, lightness, chroma, colour count and border.
  Click one to use it. Every line offered is true of the image in front of
  you - a flat image is never told to build a shadow side - and which of the
  eligible lines you are shown is rotated by the candidate's own id, so the
  queue does not repeat itself. The same candidate always shows the same
  three, so reopening the tool does not reshuffle what you were reading.
- **Palette** - four named watercolour pigments read from the centre of the
  image, with "Use these".
- **Alt text** - a scaffold with `[blanks]`, never a finished sentence. Nothing
  in the pipeline can see the subject, so the bracketed parts are yours. The
  build rejects alt text under 40 characters, alt text that just repeats the
  title, and the provider's own caption pasted through.
- **Why it is here / What the pixels say** - the reasoning behind its place in
  the queue.
- **Set aside** asks why. Both approvals and rejections teach the shortlist,
  scoped to the subject you are working in.

## When a plate will not load

Every image is fetched through the tool rather than hotlinked, and if the
provider's resize service fails the tool falls back to the untouched original
and downscales it locally, so a plate appears either way. The terminal says so
when it happens:

```
21575207: pexels would not resize it, served the original downscaled to 1400px
```

If both fail, the plate says so and offers **Try again** rather than showing a
broken image. On 21/09/2026 Pexels' resize service returned HTTP 500 for about
three quarters of the shortlist for the best part of an hour while the
originals were fine throughout; it recovered on its own. Press Try again if
you hit that - there is nothing to fix at this end.

## Known rough edge: the palette misses small subjects

The palette is read from the central 60% of the image and weighted by area, so
a small coloured subject on a big plain ground loses to the ground. On the
still-life queue a red rose read as "Sap Green, Warm Grey", and a red gerbera,
a purple tulip and a yellow ranunculus each read as "Cool Grey" alone. Check the
palette against the subject, not only against the swatches.

## Known rough edge: landscape

Landscape ranks worst of the six - 4 of 70 candidates score 8 or above, against
34 of 90 for botanical. This is expected rather than broken. The subject-area
and region measurements work by separating a subject from its background, and a
misty hillside has no figure-ground separation at all, so they read it as
having no clear subject.

Nothing is hidden from you, so this costs you time rather than material: the
queue always contains every candidate, best-scoring first, with the low
scorers at the end labelled "set aside by the heuristics". For landscape,
expect to page further down than for other subjects and judge on the image
rather than the score. Thresholds should be calibrated per subject once there
are enough landscape decisions to calibrate against.
