import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { ready, seedFavourites } from "./support";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const ROUTES = [
  ["Today", "#/"],
  ["Browse", "#/browse"],
  ["Detail", "#/piece/ripe-pear"],
  ["Exercises", "#/exercises"],
  ["Your studio", "#/studio"],
] as const;

/**
 * WCAG 2.2 AA is a stated product requirement, not a nice-to-have, and the
 * usage scene - bad light, wet hands, a phone at arm's length - makes it a
 * practical one. These run on every project, so each route is checked at phone,
 * propped-phone and desktop sizes.
 */
test.describe("accessibility", () => {
  for (const [name, route] of ROUTES) {
    test(`${name} has no axe violations`, async ({ page, context }) => {
      // The studio and the header palette only have anything to show with
      // saved pieces, so seed them rather than testing an empty shell.
      await seedFavourites(context, ["ripe-pear", "paper-boat", "two-toadstools"]);
      await page.goto(`/${route}`);
      await ready(page);
      await page.addScriptTag({ path: AXE_PATH });

      const violations = await page.evaluate(async () => {
        const res = await (window as unknown as { axe: { run: typeof import("axe-core").run } }).axe.run(
          document,
          { resultTypes: ["violations"] },
        );
        return res.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          target: v.nodes[0]?.target?.join(" ") ?? "",
        }));
      });

      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }

  test("every interactive target meets the 44px floor", async ({ page, context }) => {
    await seedFavourites(context, ["ripe-pear"]);
    await page.goto("/#/browse");
    await ready(page);

    const small = await page.evaluate(() => {
      const sel =
        'a[href], button, input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
      const out: string[] = [];
      for (const el of document.querySelectorAll(sel)) {
        if (el.closest("footer")) continue;
        const cls = (el.className || "").toString();
        // The skip link is a 1px clip until it is focused; it is measured there.
        if (cls.includes("sr-only")) continue;

        let box = el.getBoundingClientRect();
        if (box.width < 1) continue;
        // A full-card `::after` overlay is the real hit area.
        const after = getComputedStyle(el, "::after");
        if (after.content !== "none" && after.position === "absolute" && (el as HTMLElement).offsetParent) {
          const parent = (el as HTMLElement).offsetParent!.getBoundingClientRect();
          if (parent.width >= box.width && parent.height >= box.height) box = parent;
        }
        if (box.width < 43.5 || box.height < 43.5) {
          const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30);
          out.push(`${label} ${Math.round(box.width)}x${Math.round(box.height)}`);
        }
      }
      return out;
    });

    expect(small, small.join(" | ")).toEqual([]);
  });

  test("the skip link is reachable and full size once focused", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);
    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: /skip to content/i });
    await expect(skip).toBeFocused();

    const box = (await skip.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.width).toBeGreaterThanOrEqual(43.5);
  });

  test("keyboard focus is always visible and never trapped", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const seen: string[] = [];
    for (let i = 0; i < 18; i += 1) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return {
          ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2,
          name: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24),
        };
      });
      if (!stop) break; // focus left the document - no trap
      expect(stop.ring, `no visible focus ring on "${stop.name}"`).toBe(true);
      seen.push(stop.name);
    }
    expect(seen.length).toBeGreaterThan(4);
  });

  test("reduced motion is a clean cut, not a fast animation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/#/");
    await ready(page);

    await page.getByRole("button", { name: /deal me another/i }).click();
    // `wash.ts` skips the transition outright rather than shortening it, so the
    // marker it sets for the wash CSS must never appear.
    const washing = await page.evaluate(() => document.documentElement.hasAttribute("data-wash"));
    expect(washing).toBe(false);
    await context.close();
  });
});
