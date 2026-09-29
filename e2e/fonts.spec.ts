import { expect, test } from "@playwright/test";
import { ready } from "./support";

/*
  The brand fonts are self-hosted (src/fonts.ts). They used to load from
  Google Fonts, which the README flagged as a must-fix before production: a
  third-party request on every visit, and no type at all offline.
*/

test.describe("fonts", () => {
  test("load from the app itself, never from a font CDN", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/fonts\.(googleapis|gstatic)\.com/.test(url)) external.push(url);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    expect(external).toEqual([]);
  });

  test("Today draws with the brand faces, not their fallbacks", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    /*
      Only faces the page itself asked for, so nothing here is forced by the
      test. A family that is declared in CSS but has no font file behind it
      never reaches "loaded", and the text quietly falls back to Georgia or
      the system sans - which a computed font-family check cannot see.
    */
    const drawn = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts]
        .filter((face) => face.status === "loaded")
        .map((face) => `${face.family.replace(/["']/g, "")} ${face.weight} ${face.style}`);
    });

    for (const face of [
      "Libre Baskerville 400 normal", // wordmark and headings
      "Libre Baskerville 400 italic", // the featured prompt
      "Source Sans 3 400 normal", // body
      "Source Sans 3 600 normal", // buttons and chips
    ]) {
      expect(drawn, `${face} should be drawn from a bundled file`).toContain(face);
    }
  });
});
