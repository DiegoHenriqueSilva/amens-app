import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP18_BASE_URL || "http://127.0.0.1:8092";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.goto(`${baseURL}/auth`, { waitUntil: "commit", timeout: 30000 });
  await page.locator("#login-email").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#login-email").fill("teste-a@amens.test");
  await page.locator("#login-password").fill("testeteste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: "Enviar sugestão ou feedback" }).click();
  await page.getByRole("heading", { name: "Enviar sugestão ou problema" }).waitFor({ state: "visible", timeout: 15000 });
  assert.match(await page.locator("body").innerText(), /não é uma denúncia/i);
  assert.equal(await page.locator("#feedback-category").isVisible(), true);
  assert.equal(await page.locator("#feedback-message").isVisible(), true);
  await page.screenshot({ path: "artifacts/app18-feedback-dialog.png", fullPage: true });

  await page.locator("#feedback-category").click();
  await page.getByRole("option", { name: "Sugestão" }).click();
  await page.locator("#feedback-message").fill("Texto de teste do APP18");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Enviar sugestão ou feedback" }).click();
  assert.equal(await page.locator("#feedback-message").inputValue(), "");
  assert.equal(await page.locator("#feedback-category").getAttribute("data-state"), "closed");

  console.log("APP18 smoke passed: authenticated dialog, labels, category, cancellation and draft reset.");
} finally {
  await browser.close();
}
