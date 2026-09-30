/*
  The brand fonts, self-hosted (DESIGN.md, "Typography").

  Libre Baskerville (display / editorial) and Source Sans 3 (body / UI), both
  SIL Open Font License 1.1, from the Fontsource packages. Vite bundles the
  font files with the app, so nothing is fetched from a third party, and the
  fonts work wherever the app does.

  Only the faces the app draws with are imported. Each file declares every
  character subset with a unicode-range, so a browser downloads only the
  subsets a page needs: Latin for the UI, Latin Extended for credits such as
  "Kandiāro" or Māori place names.

  Libre Baskerville is imported at 400 and 700 although the package now has
  500 and 600. The approved screens were drawn from a Google Fonts link that
  asked for 400 and 700 only, so every `font-medium` heading has always
  rendered at 400. Importing 500 would thicken every heading: a design change,
  not a hosting one, and DESIGN.md's to decide.

  Not imported, because nothing uses them yet (checked 29/09/2026):
  - Caveat, the brand's handwritten accent. `font-hand` is defined but no
    element sets it. Give it a job, then `npm i @fontsource/caveat` and import
    the weights that job uses here.
  - Source Sans 3 italic. Every italic in the app is Libre Baskerville's.
*/

import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/400-italic.css";
import "@fontsource/libre-baskerville/700.css";

import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
