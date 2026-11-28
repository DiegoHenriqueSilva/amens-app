import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP17_BASE_URL || "http://127.0.0.1:8089";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const openRoute = async (path) => {
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: "commit", timeout: 30000 });
  await page.waitForTimeout(3500);
  return response;
};

try {
  for (const path of ["/old", "/terco", "/profile", "/altar"]) {
    const response = await openRoute(path);
    assert.equal(response?.status(), 200, `${path} should be served`);
    assert.match(page.url(), new RegExp(`${path.replace("/", "\\/")}`));
  }

  const profileEditResponse = await openRoute("/profile/edit");
  assert.equal(profileEditResponse?.status(), 200, "/profile/edit should be served");
  assert.match(page.url(), /\/auth$/);

  const invalidResponse = await openRoute("/rota-inexistente-app17");
  assert.equal(invalidResponse?.status(), 200, "SPA fallback should serve the invalid route");
  await page.getByRole("heading", { name: "Página indisponível" }).waitFor({ state: "visible", timeout: 15000 });
  assert.match(await page.locator("body").innerText(), /Caminho não encontrado/i);
  assert.match(await page.locator("body").innerText(), /Ir para o início/);
  assert.equal(await page.getByRole("button", { name: "Voltar" }).isVisible(), true);
  await page.screenshot({ path: "artifacts/app17-notfound-390.png", fullPage: true });

  await page.getByRole("button", { name: "Ir para o início" }).click();
  await page.waitForURL("**/", { waitUntil: "commit", timeout: 15000 });
  assert.match(page.url(), /\/$/);

  console.log("APP17 smoke passed: active legacy routes, SPA fallback, Portuguese recovery and home CTA.");
} finally {
  await browser.close();
}
