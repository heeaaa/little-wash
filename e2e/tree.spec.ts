import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { pieceIdsFrom, ready, seedFavourites, seedPainted } from "./support";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

/**
 * The painted tree, in a real browser.
 *
 * A leaf for every piece marked painted, in that piece's colours (DESIGN.md,
 * "The painted tree"). The component tests cover its rules; these cover what
 * only a browser can show - a tap finding the nearest leaf, the focus ring,
 * the arrival playing once across a reload, and a layout that fits every
 * posture the app is used in.
 */

const SEEN_KEY = "little-wash:leaves-seen:v1";

/** Mark these as already seen, so the tree is simply there with nothing arriving. */
async function seenAlready(context: BrowserContext, ids: string[]) {
  await context.addInitScript(
    ([key, seen]) => {
      try {
        localStorage.setItem(key as string, JSON.stringify({ ids: seen }));
      } catch {
        /* private mode */
      }
    },
    [SEEN_KEY, ids] as const,
  );
}

/**
 * Every phase the tree passes through, from before the app boots.
 *
 * A retrying assertion can only say a state was reached, never that another
 * was not: a tree that grew and settled within the wait would still end up
 * "still". Recording each phase as it is set can say "it never arrived".
 */
async function recordPhases(context: BrowserContext) {
  await context.addInitScript(() => {
    const phases: string[] = [];
    (window as unknown as { treePhases: string[] }).treePhases = phases;
    const note = (el: Element) => phases.push(el.getAttribute("data-phase") ?? "");
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          if ((record.target as Element).hasAttribute("data-tree")) note(record.target as Element);
          continue;
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.hasAttribute("data-tree")) note(node);
          node.querySelectorAll("[data-tree]").forEach(note);
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-phase"] });
  });
}

function phasesSeen(page: Page) {
  return page.evaluate(() => (window as unknown as { treePhases: string[] }).treePhases);
}

const tree = (page: Page) => page.locator("[data-tree]");
const leaves = (page: Page) => page.getByRole("listbox", { name: /leaves on your tree/i });
const chosen = (page: Page) => leaves(page).getByRole("option", { selected: true });
const card = (page: Page) => tree(page).locator(".tree-card");

/** Animations running anywhere in the drawing. */
function running(page: Page) {
  return tree(page).evaluate((el) => el.getAnimations({ subtree: true }).length);
}

test.describe("the painted tree", () => {
  test("a piece marked painted grows its leaf in the studio, in the piece's own colours", async ({
    page,
    context,
  }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);
    const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
    const palette = await page
      .getByRole("heading", { name: /suggested palette/i })
      .locator("xpath=following-sibling::ul[1]//li")
      .allTextContents();
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();

    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();

    await expect(leaves(page).getByRole("option")).toHaveCount(1);
    await expect(chosen(page)).toContainText(title);
    await expect(card(page).getByRole("link", { name: title })).toBeVisible();
    // Only colours the piece itself names - and some, wherever it names any,
    // so a card that showed no colour at all could not pass by saying nothing.
    const named = (await card(page).locator("p").last().locator("span:not([aria-hidden])").allTextContents())
      .map((name) => name.trim())
      .filter(Boolean);
    if (palette.length > 0) expect(named.length).toBeGreaterThan(0);
    for (const name of named) expect(palette.map((p) => p.trim())).toContain(name);

    await card(page).getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(new RegExp(`#/piece/${id}$`));
  });

  test("a tap near a leaf chooses that leaf", async ({ page, context }) => {
    const ids = await pieceIdsFrom(context, 40);
    await seedPainted(context, ids);
    await seenAlready(context, ids);
    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();

    // Find the oldest leaf by choosing it, and read where its ring is drawn.
    await leaves(page).focus();
    await page.keyboard.press("Home");
    const oldest = (await chosen(page).textContent())!;
    const ring = await tree(page).locator("circle.tree-ring:not(.tree-ring-hover)").boundingBox();
    await page.keyboard.press("End");
    await expect(chosen(page)).not.toHaveText(oldest);

    // A finger lands a little off the leaf's centre, and still finds it.
    await page.mouse.click(ring!.x + ring!.width / 2 + 3, ring!.y + ring!.height / 2 - 2);
    await expect(chosen(page)).toHaveText(oldest);
  });

  test("is one tab stop with a visible focus ring, and the arrow keys step through it", async ({
    page,
    context,
  }) => {
    const ids = await pieceIdsFrom(context, 5);
    await seedPainted(context, ids);
    await seenAlready(context, ids);
    await page.goto("/#/studio");
    await ready(page);

    let reached = false;
    for (let i = 0; i < 60 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.getAttribute("role") === "listbox");
    }
    expect(reached, "Tab never reached the tree").toBe(true);
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);

    const newest = (await chosen(page).textContent())!;
    await page.keyboard.press("ArrowLeft");
    await expect(chosen(page)).not.toHaveText(newest);
    // The card follows the chosen leaf. (Titles can hold commas, so the card
    // is read rather than the option text split.)
    const link = card(page).locator("a").first();
    const title = (await link.textContent())!.trim();
    expect(await chosen(page).textContent()).toContain(title);

    // One stop: the next Tab leaves the tree for its card.
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
  });

  test("a new leaf arrives on first sight, and not again after a reload", async ({
    page,
    context,
  }) => {
    const ids = await pieceIdsFrom(context, 3);
    await seedPainted(context, ids);
    await recordPhases(context);
    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();

    await expect(tree(page)).toHaveAttribute("data-phase", "arriving");
    expect(await running(page)).toBeGreaterThan(0);
    await expect(tree(page)).toHaveAttribute("data-phase", "still", { timeout: 6000 });

    await page.reload();
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();
    await expect(tree(page)).toHaveAttribute("data-phase", "still");
    expect(await running(page)).toBe(0);
    // Not "arrived again and settled" - never arrived at all.
    expect(new Set(await phasesSeen(page))).toEqual(new Set(["still"]));
    await expect(leaves(page).getByRole("option")).toHaveCount(3);
  });

  test("waits to be looked at: nothing grows while the tree is below the fold", async ({
    page,
    context,
  }) => {
    const ids = await pieceIdsFrom(context, 12);
    // A shelf of saved pieces above pushes the tree well down the page.
    await seedFavourites(context, ids);
    await seedPainted(context, ids.slice(0, 2));
    await page.goto("/#/studio");
    await ready(page);

    await expect(tree(page)).toHaveAttribute("data-phase", "waiting");
    expect(await running(page)).toBe(0);

    await tree(page).scrollIntoViewIfNeeded();
    await expect(tree(page)).toHaveAttribute("data-phase", "arriving");
  });

  test("leaving part-way through leaves every leaf dry on return", async ({ page, context }) => {
    const ids = await pieceIdsFrom(context, 3);
    await seedPainted(context, ids);
    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();
    await expect(tree(page)).toHaveAttribute("data-phase", "arriving");

    await page.getByRole("link", { name: "Today" }).first().click();
    // A fresh page, so the recorder only hears the return visit.
    await recordPhases(context);
    await page.goto("/#/studio");
    await page.reload();
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();
    await expect(tree(page)).toHaveAttribute("data-phase", "still");
    expect(new Set(await phasesSeen(page))).toEqual(new Set(["still"]));
    await expect(tree(page).locator("[data-arriving]")).toHaveCount(0);
    await expect(leaves(page).getByRole("option")).toHaveCount(3);
  });

  test("under reduced motion every leaf is simply there", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const ids = await pieceIdsFrom(context, 3);
    await seedPainted(context, ids);
    await recordPhases(context);
    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();

    await expect(tree(page)).toHaveAttribute("data-phase", "still");
    expect(await running(page)).toBe(0);
    expect(new Set(await phasesSeen(page))).toEqual(new Set(["still"]));
    await expect(tree(page).locator("[data-arriving]")).toHaveCount(0);
    await expect(leaves(page).getByRole("option")).toHaveCount(3);
    await context.close();
  });

  test("fits every posture with a full tree: no sideways scroll, the drawing inside the screen", async ({
    page,
    context,
  }) => {
    const ids = await pieceIdsFrom(context, 60);
    await seedPainted(context, ids);
    await seenAlready(context, ids);
    await page.goto("/#/studio");
    await ready(page);
    await tree(page).scrollIntoViewIfNeeded();

    const layout = await page.evaluate(() => {
      const stage = document.querySelector(".tree-stage")!.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        height: innerHeight,
        stage: { width: stage.width, height: stage.height, right: stage.right },
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.stage.right).toBeLessThanOrEqual(layout.width);
    expect(layout.stage.height).toBeLessThan(layout.height);
    expect(layout.stage.width).toBeGreaterThan(200);
  });

  test("has no axe violations with a full tree", async ({ page, context }) => {
    const ids = await pieceIdsFrom(context, 60);
    await seedPainted(context, ids);
    await seenAlready(context, ids);
    await page.goto("/#/studio");
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

  test("keeps the record out of the app's furniture", async ({ page, context }) => {
    const ids = await pieceIdsFrom(context, 3);
    await seedPainted(context, ids);
    await page.goto("/#/studio");
    await ready(page);
    // The tree belongs to the studio's Painted section and nowhere else.
    await expect(page.locator("header [data-tree]")).toHaveCount(0);
    const painted = page.getByRole("heading", { name: "Painted" }).locator("xpath=ancestor::section[1]");
    await expect(painted.locator("[data-tree]")).toHaveCount(1);
  });
});
