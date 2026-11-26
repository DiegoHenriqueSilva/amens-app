import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP10_BASE_URL || "http://127.0.0.1:8082";
const notificationId = "00000000-0000-4000-8000-000000000099";
const senderId = "628f5a88-0875-4a38-a832-ba6ee2e6809a";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (message) => console.log("browser", message.type(), message.text()));
let thankInsertCount = 0;

try {
  await page.goto(`${baseURL}/messages`, { waitUntil: "commit", timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.getByLabel("Email").first().fill("teste-a@amens.test");
  await page.getByLabel("Senha").first().fill("testeteste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.route("**/rest/v1/notifications**", async (route, request) => {
    const url = new URL(request.url());
    console.log("intercession notification", request.method(), request.url());
    if (request.method() === "GET" && url.searchParams.get("id")?.includes(notificationId)) {
      const body = { sender_id: senderId, prayer_request_id: null };
      return route.fulfill({ status: 200, contentType: "application/json", body: request.headers().accept?.includes("vnd.pgrst.object") ? JSON.stringify(body) : JSON.stringify([body]) });
    }
    if (request.method() === "POST") {
      thankInsertCount += 1;
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    if (request.method() === "PATCH") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/profiles**", (route) => { console.log("profile request", route.request().url()); const body = { id: senderId, avatar_url: null, show_real_name: true, display_name: "Intercessor de teste", full_name: "Intercessor de teste", parish: "Comunidade Améns", created_at: new Date().toISOString(), user_xp: [{ total_xp: 10 }] }; return route.fulfill({ status: 200, contentType: "application/json", body: route.request().headers().accept?.includes("vnd.pgrst.object") ? JSON.stringify(body) : JSON.stringify([body]) }); });
  await page.route("**/rest/v1/rpc/add_xp", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

  await page.goto(`${baseURL}/?intercession_id=${notificationId}`, { waitUntil: "commit", timeout: 10000 });
  await page.waitForTimeout(4000);
  console.log("intercession page", page.url(), (await page.locator("body").innerText()).slice(0, 500));
  await page.locator('button[aria-label="Fechar aviso de intercessão"]').waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: "artifacts/app10-intercession-modal-390.png", fullPage: true });
  const thank = page.locator("button").filter({ hasText: "Agradecer" }).first();
  await thank.evaluate((element) => element.click());
  await thank.evaluate((element) => element.click()).catch(() => {});
  await page.getByText(/Gratidão enviada com sucesso/).waitFor({ state: "visible", timeout: 10000 });
  assert.equal(thankInsertCount, 1, "agradecimento não deve ser enviado duas vezes");
  console.log("APP10 intercession passed: modal, accessible close control, successful thank-you and duplicate-click protection.");
} finally {
  await browser.close();
}
