import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP15_BASE_URL || "http://127.0.0.1:8087";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 320, height: 844 },
  reducedMotion: "reduce",
});

try {
  await page.goto(`${baseURL}/tree`, { waitUntil: "commit", timeout: 30000 });
  await page.getByRole("heading", { name: "Fluxo de Orações" }).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(5000);

  const body = await page.locator("body").innerText();
  assert.match(body, /Uma rede formada por oração/);
  assert.match(body, /Pontos de Fé Coletivos/);
  assert.match(body, /Orar por uma causa/);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
    false,
  );

  await page.screenshot({ path: "artifacts/app15-tree-320.png", fullPage: true });
  await page.getByRole("button", { name: "Orar por uma causa" }).click();
  await page.waitForURL("**/pray", { waitUntil: "commit", timeout: 15000 });
  assert.match(page.url(), /\/pray$/);

  console.log("APP15 smoke passed: public tree, accessible explanation, reduced motion, 320px layout and /pray CTA.");
} finally {
  await browser.close();
}
