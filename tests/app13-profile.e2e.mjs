import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP13_BASE_URL || "http://127.0.0.1:8085";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.goto(`${baseURL}/auth`, { waitUntil: "commit", timeout: 30000 });
  await page.locator("#login-email").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#login-email").fill("teste-a@amens.test");
  await page.locator("#login-password").fill("testeteste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForTimeout(2500);
  await page.waitForTimeout(1500);

  await page.goto(`${baseURL}/profile/edit`, { waitUntil: "commit", timeout: 30000 });
  await page.getByText("Configurações").waitFor({ state: "visible", timeout: 15000 });
  const nameInput = page.locator('input:visible').first();
  const originalName = await nameInput.inputValue();
  assert.ok(await page.getByText(/Santo\(a\) de devoção/).count() > 0);
  assert.ok(await page.locator("#is-public-parish-profile").count() === 1);
  await page.screenshot({ path: "artifacts/app13-profile-edit-390.png", fullPage: true });

  await page.locator("#avatar-upload").setInputFiles({ name: "avatar.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await page.getByText("Selecione uma imagem válida.").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#avatar-upload").setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await page.getByText("A imagem deve ter no máximo 5 MB.").waitFor({ state: "visible", timeout: 10000 });

  await nameInput.fill(`${originalName} alteração temporária`);
  await page.getByRole("button", { name: "Cancelar edição do perfil" }).click();
  await page.waitForURL(/\/profile$/);
  await page.goto(`${baseURL}/profile/edit`, { waitUntil: "commit", timeout: 30000 });
  await page.getByText("Configurações").waitFor({ state: "visible", timeout: 15000 });
  assert.equal(await page.locator('input').first().inputValue(), originalName, "cancelar não deveria persistir a alteração");
  console.log("APP13 profile E2E passed: edit route, devotion/privacy fields, screenshot and cancel-without-save.");
} finally {
  await browser.close();
}
