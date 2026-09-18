import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:4173";
const OUT = process.env.OUT_DIR ?? "/mnt/user-data/outputs/screens";
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
mkdirSync(OUT, { recursive: true });

const WIDTHS = { phone: 390, tablet: 768, desktop: 1440 };

/** [name, hash-route, width-key, {action}] */
const SHOTS = [
  ["chooser-phone", "#/", "phone"],
  ["chooser-desktop", "#/", "desktop"],
  ["a-today-phone", "#/a", "phone"],
  ["a-today-tablet", "#/a", "tablet"],
  ["a-today-desktop", "#/a", "desktop"],
  ["a-detail-phone", "#/a/piece/ripe-pear", "phone"],
  ["a-detail-desktop", "#/a/piece/ripe-pear", "desktop"],
  ["b-today-phone", "#/b", "phone"],
  ["b-today-tablet", "#/b", "tablet"],
  ["b-today-desktop", "#/b", "desktop"],
  ["b-detail-phone", "#/b/piece/little-teapot", "phone"],
  ["b-detail-desktop", "#/b/piece/little-teapot", "desktop"],
  ["a-empty-desktop", "#/a?time=5&difficulty=stretch", "desktop"],
  ["a-filtered-desktop", "#/a?difficulty=gentle&time=5", "desktop"],
  ["b-filtered-desktop", "#/b?subject=fruit", "desktop"],
];

const browser = await chromium.launch({ executablePath: EXEC });

async function shoot(name, hash, widthKey, action) {
  const width = WIDTHS[widthKey];
  const context = await browser.newContext({
    viewport: { width, height: widthKey === "phone" ? 780 : 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/${hash}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  // Scroll through the page so below-the-fold lazy images load, then return
  // to the top before the full-page capture.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  if (action) await action(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await context.close();
  console.log("shot", name, `(${width}px)`);
}

for (const [name, hash, widthKey, action] of SHOTS) {
  await shoot(name, hash, widthKey, action);
}

// Keyboard focus walk on Direction A (Tab a few times, capture focus ring).
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/#/a`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  for (let i = 0; i < 8; i += 1) await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName}: ${(el.textContent || el.getAttribute("aria-label") || "").slice(0, 40)}` : "none";
  });
  console.log("focus after 8 tabs:", focused);
  await page.screenshot({ path: `${OUT}/a-focus-desktop.png` });
  await context.close();
}

// Enlarged dialog on Direction B detail.
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/#/b/piece/scallop-shell`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  await page.getByRole("button", { name: /enlarge/i }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/b-enlarged-desktop.png` });
  const dialogOpen = await page.evaluate(() => !!document.querySelector("dialog[open]"));
  console.log("dialog open:", dialogOpen);
  await context.close();
}

await browser.close();
console.log("done");
