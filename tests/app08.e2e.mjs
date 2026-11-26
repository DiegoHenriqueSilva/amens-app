import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.APP08_BASE_URL || "http://127.0.0.1:8083";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (message) => console.log("browser", message.type(), message.text()));
page.on("pageerror", (error) => console.log("pageerror", error.message));

try {
  await page.goto(`${baseURL}/novenas`, { waitUntil: "commit", timeout: 10000 });
  await page.waitForTimeout(2000);
  console.log("APP08 initial", page.url(), (await page.locator("body").innerText()).slice(0, 400));
  await page.getByRole("heading", { name: "Novenas" }).waitFor({ state: "visible", timeout: 15000 });
  const cards = page.locator('[role="button"][aria-label*="novena" i]');
  assert.equal(await cards.count(), 7, "catálogo deveria apresentar sete novenas");
  await page.screenshot({ path: "artifacts/app08-novenas-390.png", fullPage: true });

  const firstCard = page.locator('[role="button"]').filter({ hasText: "Desatadora" }).first();
  await firstCard.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/novena\/ns-desatadora$/);
  await page.getByText(/Dia 1/).first().waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => localStorage.getItem("novena_state_ns-desatadora")), null);
  await page.screenshot({ path: "artifacts/app08-novena-day1-390.png", fullPage: true });

  const next = () => page.locator("button").filter({ hasText: "Próxima" }).first();
  for (let step = 0; step < 6; step += 1) await next().click();
  await page.locator("button").filter({ hasText: "Concluir Dia" }).first().click();
  await page.getByText(/Dia Conclu/).first().waitFor({ state: "visible" });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("novena_state_ns-desatadora")));
  assert.deepEqual(saved.completedDays, [1]);
  assert.equal(saved.currentDay, 2);
  await page.getByRole("button", { name: /Definir Lembrete/ }).click();
  await page.getByRole("button", { name: "Confirmar Lembrete" }).click();
  await page.getByText(/Horário salvo/).waitFor({ state: "visible", timeout: 10000 });

  await page.goto(`${baseURL}/novenas`, { waitUntil: "commit", timeout: 10000 });
  await page.getByRole("heading", { name: "Novenas" }).waitFor({ state: "visible" });
  const resumedCard = page.locator('[role="button"]').filter({ hasText: "Desatadora" }).first();
  await resumedCard.click();
  await page.getByRole("button", { name: /Continuar no Dia 2/ }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /Continuar no Dia 2/ }).click();
  await page.waitForURL(/\/novena\/ns-desatadora$/);
  await page.getByText(/Dia 2/).first().waitFor({ state: "visible" });

  await page.goto(`${baseURL}/novena/divina-misericordia`, { waitUntil: "commit", timeout: 10000 });
  await page.getByText(/Dia 1/).first().waitFor({ state: "visible" });
  for (let step = 0; step < 4; step += 1) await next().click();
  await page.getByText(/Próxima Conta/).waitFor({ state: "visible" });
  console.log("mercy step", (await page.locator("body").innerText()).slice(0, 350));
  await page.getByText(/Dezena 1/).waitFor({ state: "visible" });

  await page.evaluate(() => localStorage.setItem("novena_state_ns-desatadora", JSON.stringify({ currentDay: 9, completedDays: [1, 2, 3, 4, 5, 6, 7, 8], lastPrayerDate: null, reminderTime: null, isCompleted: false })));
  await page.goto(`${baseURL}/novena/ns-desatadora`, { waitUntil: "commit", timeout: 10000 });
  await page.getByText(/Dia 9/).first().waitFor({ state: "visible" });
  for (let step = 0; step < 6; step += 1) await next().click();
  await page.locator("button").filter({ hasText: "Concluir Dia" }).first().click();
  await page.getByText(/Novena Conclu/).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Finalizar Novena" }).click();
  await page.waitForURL(/\/novenas$/);

  await page.goto(`${baseURL}/novena/invalida`, { waitUntil: "commit", timeout: 10000 });
  await page.getByText("Novena não encontrada").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Voltar para a lista de novenas" }).click();
  await page.waitForURL(/\/novenas$/);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.reload({ waitUntil: "commit" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
  await page.screenshot({ path: "artifacts/app08-novenas-320.png", fullPage: true });
  console.log("APP08 E2E passed: catalog, keyboard opening, day progress, reminder state, resume, invalid route and 320px overflow.");
} finally {
  await browser.close();
}
