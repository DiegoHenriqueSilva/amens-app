import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP10_BASE_URL || "http://127.0.0.1:8082";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const longMessage = `Uma mensagem de teste muito longa para confirmar que a caixa de mensagens preserva todo o conteúdo sem criar cortes, sobreposição ou rolagem horizontal. `.repeat(4);
const rows = Array.from({ length: 21 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  user_id: "81cdc63e-5418-4f67-b7a9-b77fd35622bd",
  sender_id: null,
  prayer_request_id: null,
  type: index === 0 ? "daily_gospel" : null,
  message: index === 0 ? longMessage : `Mensagem controlada ${index + 1}`,
  is_read: false,
  created_at: new Date(Date.now() - index * 60000).toISOString(),
}));

async function login() {
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.getByLabel("Email").first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByLabel("Email").first().fill("teste-a@amens.test");
  await page.getByLabel("Senha").first().fill("testeteste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 15000 });
  await page.waitForTimeout(2500);
}

try {
  await login();
  await page.route("**/rest/v1/notifications**", async (route, request) => {
    if (request.method() === "GET") {
      console.log("notification GET", request.url(), request.headers().range || "no-range");
      const requestUrl = new URL(request.url());
      const start = Number(requestUrl.searchParams.get("offset") || 0);
      const end = start + Number(requestUrl.searchParams.get("limit") || 20) - 1;
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": `${start}-${Math.min(end, rows.length - 1)}/${rows.length}` }, body: JSON.stringify(rows.slice(start, end + 1)) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 10000 });
  await page.getByRole("heading", { name: "Mensagens" }).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("controlled page", page.url(), await page.evaluate(() => Object.keys(localStorage)), (await page.locator("body").innerText()).slice(0, 300));
  assert.equal(await page.locator('[role="button"][aria-label^="Abrir mensagem:"]').count(), 20);
  await page.getByRole("button", { name: "Carregar mensagens antigas" }).click();
  await page.getByRole("button", { name: /Mensagem controlada 21/ }).waitFor({ state: "visible" });
  assert.equal(await page.locator('[role="button"][aria-label^="Abrir mensagem:"]').count(), 21);
  await page.screenshot({ path: "artifacts/app10-history-21-390.png", fullPage: true });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload({ waitUntil: "commit", timeout: 10000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
  await page.screenshot({ path: "artifacts/app10-messages-landscape-844x390.png", fullPage: true });
  console.log("APP10 controlled data passed: 21-message pagination, long text and landscape overflow.");

  await page.unroute("**/rest/v1/notifications**");
  await page.route("**/rest/v1/notifications**", async (route, request) => {
    if (request.method() === "GET") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "forced SELECT failure" }) });
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "forced UPDATE failure" }) });
  });
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 10000 });
  await page.getByText("Não foi possível carregar suas mensagens. Tente novamente.").waitFor({ state: "visible", timeout: 10000 });
  await page.screenshot({ path: "artifacts/app10-messages-error-390.png", fullPage: true });
  console.log("APP10 controlled errors passed: SELECT failure remains visible with retry state.");
} finally {
  await browser.close();
}
