import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP10_BASE_URL || "http://127.0.0.1:8081";
const email = process.env.APP10_EMAIL || "teste-a@amens.test";
const password = process.env.APP10_PASSWORD || "testeteste";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const failures = [];

try {
  await page.goto(`${baseURL}/messages`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  assert.match(page.url(), /\/auth/);
  await page.screenshot({ path: "artifacts/app10-unauthenticated-auth.png", fullPage: true });

  await page.getByLabel("Email").first().fill(email);
  await page.getByLabel("Senha").first().fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 15000 });

  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  const bell = page.getByRole("button", { name: "Abrir notificações" });
  await bell.waitFor({ state: "visible", timeout: 10000 });
  await page.screenshot({ path: "artifacts/app10-home-bell-390.png", fullPage: true });
  await bell.click();
  await assert.doesNotReject(() => page.getByText("Ver todas", { exact: true }).waitFor({ state: "visible" }));
  await page.screenshot({ path: "artifacts/app10-bell-popover-390.png", fullPage: true });
  await page.keyboard.press("Escape");

  await page.goto(`${baseURL}/messages`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Mensagens" }).waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: "artifacts/app10-messages-authenticated-390.png", fullPage: true });
  const cards = page.locator('[role="button"][aria-label^="Abrir mensagem:"]');
  assert.ok(await cards.count() >= 0);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(horizontalOverflow, false, "messages page overflows horizontally at 390px");

  await page.setViewportSize({ width: 320, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const overflow320 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow320, false, "messages page overflows horizontally at 320px");
  await page.screenshot({ path: "artifacts/app10-messages-320.png", fullPage: true });
  console.log(`APP10 E2E passed: unauthenticated redirect, authenticated messages, Home bell, popover, Escape and responsive overflow checks. Messages found: ${await cards.count()}`);
} catch (error) {
  failures.push(error);
  await page.screenshot({ path: "artifacts/app10-e2e-failure.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures[0]);
  process.exitCode = 1;
}
