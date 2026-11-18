// Utilitários dos testes de tela com contas de teste (login por e-mail).
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.APP_URL || 'http://localhost:8080';
// Credenciais fora do repositório: JSON { mod: {email, senha}, autor: {email, senha} }
const CONTAS = require(path.resolve(process.env.CONTAS_TESTE || 'contas_teste.json'));
const OUT = path.resolve(process.env.SAIDA || 'teste_tela');
fs.mkdirSync(OUT, { recursive: true });

async function abrirBrowser() {
  return chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
}

async function novoContexto(browser, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  // Evita o splash de boas-vindas e o pedido de push atrapalharem os cliques
  await ctx.addInitScript(() => { try { localStorage.setItem('amens_welcome_seen', '1'); } catch {} });
  return ctx;
}

async function esperar(page, ms = 800) {
  // Splash de boas-vindas (7 s a cada carregamento completo): fecha para não cobrir a tela
  await page.evaluate(() => document.documentElement.classList.remove('amens-welcome')).catch(() => {});
  await page.waitForFunction(
    () => !/Carregando|Verificando permissões|Preparando seu altar/.test(document.body.innerText),
    null, { timeout: 45000 },
  ).catch(() => {});
  await page.waitForTimeout(ms);
}

async function login(page, conta) {
  await page.goto(BASE + '/auth', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').waitFor({ timeout: 30000 });
  await page.fill('#login-email', CONTAS[conta].email);
  await page.fill('#login-password', CONTAS[conta].senha);
  await page.locator('#login-password').press('Enter');
  await page.waitForFunction(() => !location.pathname.startsWith('/auth'), null, { timeout: 30000 }).catch(() => {});
  await esperar(page);
}

async function shot(page, nome) {
  const f = path.join(OUT, nome + '.png');
  await page.screenshot({ path: f, fullPage: false });
  return f;
}

function log(...a) { console.log(...a); fs.appendFileSync(path.join(OUT, 'registro.txt'), a.join(' ') + '\n'); }

module.exports = { BASE, CONTAS, OUT, abrirBrowser, novoContexto, esperar, login, shot, log };
