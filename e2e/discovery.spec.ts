import { test, expect } from "@playwright/test";
import { featuredTitle, pieceCards, ready, seedFavourites } from "./support";

/**
 * The journey the product exists for: arrive, find something to paint, open it,
 * look at it properly. CLAUDE.md names discovery -> detail -> save -> saved
 * list as the flow to protect, and this file covers it end to end.
 */
test.describe("discovery", () => {
  test("Today offers a piece with everything needed to commit to it", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const featured = page.getByTestId("featured");
    await expect(featured).toBeVisible();
    await expect(featured.getByRole("img").first()).toBeVisible();
    await expect(featured.getByRole("link", { name: /open this piece/i })).toBeVisible();

    // The difficulty note is the reassurance a nervous beginner reads; a bare
    // grade does not tell them what they are agreeing to.
    await expect(
      featured.getByText(
        /loose shapes, forgiving edges|a clear subject with some form|more shapes to hold together/i,
      ),
    ).toBeVisible();
  });

  test("dealing offers a different piece, and keeps it across a reload", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const before = (await featuredTitle(page).textContent())?.trim();
    await page.getByRole("button", { name: /deal me another/i }).click();
    await expect(featuredTitle(page)).not.toHaveText(before!);

    const dealt = (await featuredTitle(page).textContent())?.trim();
    // The piece lives in the URL, which is what makes it survive and be shared.
    await expect(page).toHaveURL(/piece=/);

    await page.reload();
    await ready(page);
    await expect(featuredTitle(page)).toHaveText(dealt!);
  });

  test("a filter always visibly acts", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    await page.getByRole("button", { name: /deal me another/i }).click();
    const dealt = (await featuredTitle(page).textContent())?.trim();

    await page.getByRole("button", { name: "Steady" }).first().click();
    // Changing a filter releases the dealt piece, so the tap cannot look like
    // a 520ms animation over an unchanged screen.
    await expect(featuredTitle(page)).not.toHaveText(dealt!);
    await expect(page).not.toHaveURL(/piece=/);
  });

  test("opening a piece reaches its detail, and back returns to Today", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const title = (await featuredTitle(page).textContent())?.trim();
    await page.getByRole("link", { name: /open this piece/i }).click();

    await expect(page.getByRole("heading", { level: 1, name: title! })).toBeVisible();
    await expect(page).toHaveURL(/#\/piece\//);

    await page.getByRole("link", { name: /today.s wash/i }).click();
    await expect(page.getByTestId("featured")).toBeVisible();
  });

  test("the enlarged view opens, fills the screen and gives focus back", async ({ page }) => {
    await page.goto("/#/piece/bowl-of-cherries");
    await ready(page);

    const enlarge = page.getByRole("button", { name: /^enlarge$/i });
    await enlarge.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The point of this view: the reference big enough to paint beside.
    const fill = await page.evaluate(() => {
      const img = document.querySelector("dialog[open] img") as HTMLImageElement;
      const box = img.getBoundingClientRect();
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
      const painted = Math.min(img.naturalWidth * scale, img.naturalHeight * scale);
      return painted / Math.min(window.innerWidth, window.innerHeight);
    });
    expect(fill).toBeGreaterThan(0.8);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(enlarge).toBeFocused();
  });

  test("Browse lists the catalogue and a card opens its piece", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);

    await expect(pieceCards(page)).toHaveCount(12);

    const first = pieceCards(page).first();
    const name = (await first.locator("a.card-link").textContent())?.trim();
    await first.locator("a.card-link").click();

    await expect(page.getByRole("heading", { level: 1, name: name! })).toBeVisible();
    // Back names where you came from rather than always saying Today.
    // Scoped to the page body: "Browse" is also a nav link in the header.
    await expect(page.locator("#main").getByRole("link", { name: /^Browse$/ })).toBeVisible();
  });

  test("every card offers exactly one link to its piece", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);

    const links = await pieceCards(page).evaluateAll((cards) =>
      cards.map((c) => c.querySelectorAll('a[href*="/piece/"]').length),
    );
    expect(links.length).toBe(12);
    expect(links.every((n) => n === 1)).toBe(true);
  });

  test("a saved piece reaches the studio and survives a reload", async ({ page, context }) => {
    await seedFavourites(context, ["ripe-pear", "paper-boat"]);
    await page.goto("/#/");
    await ready(page);

    // The palette is the way in, and it is a real link now.
    await page.getByRole("link", { name: /your studio/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your studio" })).toBeVisible();

    await expect(pieceCards(page)).toHaveCount(2);
    // Most recently saved sits at the front.
    await expect(pieceCards(page).first().locator("a.card-link")).toHaveText("Paper Boat");

    await page.reload();
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(2);
  });

  test("saving from a card puts the piece in the studio", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);

    const card = pieceCards(page).first();
    const name = (await card.locator("a.card-link").textContent())?.trim();
    await card.getByRole("button", { name: /^Save / }).click();

    await page.getByRole("link", { name: /your studio/i }).click();
    await expect(pieceCards(page).first().locator("a.card-link")).toHaveText(name!);
  });

  test("unsaving removes the piece from the studio", async ({ page, context }) => {
    await seedFavourites(context, ["ripe-pear", "paper-boat"]);
    await page.goto("/#/studio");
    await ready(page);

    await expect(pieceCards(page)).toHaveCount(2);
    await pieceCards(page).first().getByRole("button", { name: /^Saved\. Remove/ }).click();
    await expect(pieceCards(page)).toHaveCount(1);
  });

  test("an empty studio explains itself and offers a way out", async ({ page }) => {
    await page.goto("/#/studio");
    await ready(page);

    await expect(page.getByText(/nothing set aside yet/i)).toBeVisible();
    await page.getByRole("link", { name: /find a piece to paint/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /browse the studio/i })).toBeVisible();
  });
});
