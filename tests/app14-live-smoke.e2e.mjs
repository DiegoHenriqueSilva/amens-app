import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP14_BASE_URL || "http://127.0.0.1:8086";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 844 } });

try {
  await page.goto(`${baseURL}/prayer-chain`, { waitUntil: "commit", timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log("APP14 initial", page.url(), (await page.locator("body").innerText()).slice(0, 300));
  await page.getByText(/Corrente de/).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  assert.doesNotMatch(body, /entrou na oração/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
  await page.screenshot({ path: "artifacts/app14-prayer-chain-320.png", fullPage: true });
  console.log("APP14 smoke passed: live prayer route, no synthetic contributors and 320px overflow check.");
} finally {
  await browser.close();
}
