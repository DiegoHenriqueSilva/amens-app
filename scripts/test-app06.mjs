import { chromium } from "playwright";
import { preview } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(projectRoot, "artifacts", "app06");

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const mockWeekdayLiturgy = {
  data: "23/11/2026",
  liturgia: "Segunda-feira da 34ª Semana do Tempo Comum",
  cor: "Verde",
  dia: "São Clemente I",
  primeiraLeitura: {
    referencia: "Ap 14, 1-3. 4b-5",
    titulo: "Traziam na fronte o nome dele e o nome de seu Pai",
    texto: "Eu, João, olhei e vi o Cordeiro de pé sobre o monte Sião, e com ele cento e quarenta e quatro mil pessoas..."
  },
  salmo: {
    referencia: "Sl 23 (24), 1-2. 3-4ab. 5-6 (R. 6)",
    refrao: "É assim a geração dos que procuram o Senhor!",
    texto: "Ao Senhor pertence a terra e tudo o que ela contém, o mundo inteiro e os que nele habitam."
  },
  segundaLeitura: null,
  evangelho: {
    referencia: "Lc 21, 1-4",
    titulo: "Jesus viu uma viúva pobre colocar duas pequenas moedas",
    texto: "Naquele tempo, Jesus ergueu os olhos e viu as pessoas ricas depositando suas ofertas no tesouro do templo. Viu também uma viúva pobre colocar ali duas pequenas moedas. Então Jesus disse: 'Em verdade vos digo que esta viúva pobre colocou mais do que todos os outros. Pois todos eles depositaram do que lhes sobrava; ela, porém, na sua pobreza, ofereceu tudo o que possuía para viver.'"
  }
};

const mockSundayLiturgy = {
  data: "29/11/2026",
  liturgia: "1º Domingo do Advento - Ano C",
  cor: "Roxo",
  dia: "Domingo de Esperança",
  primeiraLeitura: {
    referencia: "Jr 33, 14-16",
    titulo: "Farei brotar para Davi um rebento de justiça",
    texto: "Dias virão, diz o Senhor, em que cumprirei a promessa de bem que fiz à casa de Israel e de Judá. Naqueles dias e naquele tempo, farei brotar para Davi um rebento de justiça."
  },
  salmo: {
    referencia: "Sl 24 (25), 4-5ab. 8-9. 10. 14 (R. 1b)",
    refrao: "Senhor meu Deus, a vós elevo a minha alma!",
    texto: "Mostrai-me, ó Senhor, vossos caminhos,\ne fazei-me conhecer a vossa estrada!\nVossa verdade me oriente e me conduza,\nporque sois o Deus da minha salvação."
  },
  segundaLeitura: {
    referencia: "1Ts 3, 12 - 4, 2",
    titulo: "O Senhor confirme os vossos corações no dia de sua vinda",
    texto: "Irmãos: O Senhor vos faça crescer e transbordar de amor uns para com os outros e para com todos... Assim ele confirmará vossos corações numa santidade irrepreensível."
  },
  evangelho: {
    referencia: "Lc 21, 25-28. 34-36",
    titulo: "A vossa libertação está próxima",
    texto: "Naquele tempo, disse Jesus aos seus discípulos: 'Haverá sinais no sol, na lua e nas estrelas... Quando estas coisas começarem a acontecer, levantai-vos e erguei a cabeça, porque a vossa libertação está próxima.'"
  }
};

async function runTests() {
  console.log("=== INICIANDO TESTES DO APP06 (Playwright) ===");

  let server;
  try {
    server = await preview({
      root: projectRoot,
      preview: { port: 4180, host: "127.0.0.1" },
    });
  } catch (err) {
    console.error("Falha ao iniciar servidor preview do Vite:", err);
    process.exit(1);
  }

  const baseUrl = "http://127.0.0.1:4180";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
  });

  const recordedRpcEvents = [];

  // Intercepta e registra todas as chamadas de RPC do Altar para o Supabase
  await context.route("**/rest/v1/rpc/altar_record_event*", (route) => {
    try {
      const data = route.request().postDataJSON();
      recordedRpcEvents.push(data);
    } catch {}
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });

  const futureExpiresAt = Math.floor(Date.now() / 1000) + 86400 * 30;
  const mockUser = {
    id: "11111111-2222-3333-4444-555555555555",
    aud: "authenticated",
    role: "authenticated",
    email: "devotee@amens.com.br",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: "Devoto Teste" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  };

  await context.route("**/auth/v1/user*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockUser),
    });
  });

  await context.route("**/auth/v1/token*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 86400,
        expires_at: futureExpiresAt,
        refresh_token: "mock-refresh-token",
        user: mockUser,
      }),
    });
  });

  await context.addInitScript(() => {
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30;
    const session = {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 86400 * 30,
      expires_at: expiresAt,
      refresh_token: "mock-refresh-token",
      user: {
        id: "11111111-2222-3333-4444-555555555555",
        aud: "authenticated",
        role: "authenticated",
        email: "devotee@amens.com.br",
        email_confirmed_at: "2026-01-01T00:00:00.000Z",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { name: "Devoto Teste" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    };
    localStorage.setItem("sb-fszltwvhbdasqoznnors-auth-token", JSON.stringify(session));
  });

  const page = await context.newPage();
  const testResults = [];

  const clearLiturgyCache = async () => {
    await page.evaluate(() => {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("daily_")) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    });
  };

  try {
    // -------------------------------------------------------------
    // TESTE APP06-T02: Falha de origem e Fallback honesto
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T02 (Falha de API / Fallback Honesto)...");

    await page.route("**/liturgia.up.railway.app/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Serviço indisponível" }),
      });
    });

    await page.goto(`${baseUrl}/daily-gospel`);
    await clearLiturgyCache();
    await page.reload();

    await page.waitForSelector("[role='alert']", { timeout: 8000 });

    const alertText = await page.locator("[role='alert']").innerText();
    const isHonestContingencyBadgeVisible = await page.getByText("Texto de Apoio Espiritual (Contingência)").isVisible();
    const isRetryButtonVisible = await page.getByText("Tentar Novamente").isVisible();

    const hasReadOnFallback = recordedRpcEvents.some(e => e.p_kind === "gospel_read");

    const t02Passed =
      /indispon/i.test(alertText) &&
      isHonestContingencyBadgeVisible &&
      isRetryButtonVisible &&
      !hasReadOnFallback;

    await page.screenshot({ path: path.join(artifactsDir, "app06-fallback-unavailability.png") });
    testResults.push({ id: "APP06-T02", name: "Falha de origem e Fallback honesto", passed: !!t02Passed });
    console.log(`APP06-T02: ${t02Passed ? "PASSED ✅" : "FAILED ❌"}`);

    await page.unroute("**/liturgia.up.railway.app/**");

    // -------------------------------------------------------------
    // TESTE APP06-T03: Leituras opcionais (Dia de semana vs Domingo)
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T03 (Abas dinâmicas: 3 abas na semana vs 4 no domingo)...");

    // Mock Weekday
    await page.route("**/liturgia.up.railway.app/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockWeekdayLiturgy),
      });
    });

    await clearLiturgyCache();
    await page.goto(`${baseUrl}/daily-gospel`);
    await page.waitForSelector("button:has-text('Evangelho')", { timeout: 8000 });

    const tabsWeekday = await page.locator("[role='tab']").allInnerTexts();
    console.log("Abas no dia de semana:", tabsWeekday);
    const hasThreeTabsWeekday = tabsWeekday.length === 3 &&
      tabsWeekday.some(t => t.includes("1ª Leitura")) &&
      tabsWeekday.some(t => t.includes("Salmo")) &&
      tabsWeekday.some(t => t.includes("Evangelho")) &&
      !tabsWeekday.some(t => t.includes("2ª Leitura"));

    await page.locator("[role='tab']:has-text('Salmo')").click();
    await page.waitForTimeout(300);
    const psalmRefraoVisible = await page.getByText("É assim a geração dos que procuram o Senhor!").isVisible();
    await page.screenshot({ path: path.join(artifactsDir, "app06-liturgy-tabs-psalm.png") });

    // Mock Sunday (com 2ª Leitura)
    await page.unroute("**/liturgia.up.railway.app/**");
    await page.route("**/liturgia.up.railway.app/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSundayLiturgy),
      });
    });

    await clearLiturgyCache();
    await page.reload();
    await page.waitForSelector("button:has-text('Evangelho')", { timeout: 8000 });

    const tabsSunday = await page.locator("[role='tab']").allInnerTexts();
    console.log("Abas no domingo:", tabsSunday);
    const hasFourTabsSunday = tabsSunday.length === 4 &&
      tabsSunday.some(t => t.includes("1ª Leitura")) &&
      tabsSunday.some(t => t.includes("Salmo")) &&
      tabsSunday.some(t => t.includes("2ª Leitura")) &&
      tabsSunday.some(t => t.includes("Evangelho"));

    await page.screenshot({ path: path.join(artifactsDir, "app06-liturgy-sunday-4tabs.png") });

    const t03Passed = hasThreeTabsWeekday && psalmRefraoVisible && hasFourTabsSunday;
    testResults.push({ id: "APP06-T03", name: "Leituras opcionais e abas dinâmicas", passed: t03Passed });
    console.log(`APP06-T03: ${t03Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE APP06-T01: Datas e concorrência (Race condition test)
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T01 (Concorrência em troca rápida de datas)...");
    let requestCount = 0;
    await page.unroute("**/liturgia.up.railway.app/**");
    await page.route("**/liturgia.up.railway.app/**", async (route) => {
      const currentReq = ++requestCount;
      const url = route.request().url();
      const delay = currentReq === 1 ? 800 : 100;
      await new Promise(r => setTimeout(r, delay));

      const isSubsequent = url.includes("/") && !url.endsWith(".app/");
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockWeekdayLiturgy,
          evangelho: {
            referencia: isSubsequent ? "Mt 5, 1-12 (Data Selecionada)" : "Lc 21, 1-4",
            titulo: "Evangelho Vencedor",
            texto: isSubsequent ? "Texto correto da última data selecionada." : "Texto antigo descartado."
          }
        }),
      });
    });

    await clearLiturgyCache();
    await page.goto(`${baseUrl}/daily-gospel`);
    await page.waitForSelector("button[aria-label='Dia anterior']", { timeout: 8000 });

    await page.click("button[aria-label='Dia anterior']");
    await page.waitForTimeout(50);
    await page.click("button[aria-label='Dia anterior']");

    await page.waitForTimeout(1200);
    const currentGospelText = await page.locator("p.font-serif").innerText();
    const t01Passed = currentGospelText.includes("Texto correto da última data selecionada.");

    testResults.push({ id: "APP06-T01", name: "Datas e concorrência", passed: t01Passed });
    console.log(`APP06-T01: ${t01Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE APP06-T06: Calendário e Navegação completa
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T06 (Calendário Popover e Botão Hoje)...");
    await page.click("button[aria-label='Selecionar data no calendário']");
    await page.waitForSelector(".rdp, [role='grid']", { timeout: 5000 });
    await page.screenshot({ path: path.join(artifactsDir, "app06-calendar-popover.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    const isResetTodayVisible = await page.getByText("Ir para Hoje").isVisible();
    if (isResetTodayVisible) {
      await page.click("button:has-text('Ir para Hoje')");
      await page.waitForTimeout(500);
    }
    const isTodayBadgeVisible = await page.getByText("Hoje").isVisible();

    const t06Passed = isTodayBadgeVisible;
    testResults.push({ id: "APP06-T06", name: "Navegação e Calendário", passed: t06Passed });
    console.log(`APP06-T06: ${t06Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE APP06-T04: Compartilhamento e cancelamento
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T04 (Compartilhamento seguro e sem falso sucesso)...");

    await page.unroute("**/liturgia.up.railway.app/**");
    await page.route("**/liturgia.up.railway.app/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockWeekdayLiturgy),
      });
    });

    await clearLiturgyCache();
    await page.goto(`${baseUrl}/daily-gospel`);
    await page.waitForSelector("button:has-text('Compartilhar Liturgia do Dia')", { timeout: 8000 });

    // 1. Simula cancelamento do navigator.share (AbortError)
    await page.evaluate(() => {
      window.navigator.share = async () => {
        const err = new Error("User cancelled share");
        err.name = "AbortError";
        throw err;
      };
    });

    const rpcCountBefore = recordedRpcEvents.filter(e => e.p_kind === "gospel_share").length;
    const shareBtn = page.locator("button:has-text('Compartilhar Liturgia do Dia')");
    await shareBtn.click();
    await page.waitForTimeout(500);

    const rpcCountAfterAbort = recordedRpcEvents.filter(e => e.p_kind === "gospel_share").length;
    const shareNotRecordedOnAbort = rpcCountAfterAbort === rpcCountBefore;

    // 2. Simula sucesso via navigator.share
    await page.evaluate(() => {
      window.navigator.share = async () => true;
    });

    await shareBtn.click();
    await page.waitForTimeout(800);

    const shareRecordedOnSuccess = recordedRpcEvents.some(e => e.p_kind === "gospel_share");

    console.log("Diagnóstico T04:", { shareNotRecordedOnAbort, shareRecordedOnSuccess, rpcCountBefore, rpcCountAfterAbort });
    const t04Passed = shareNotRecordedOnAbort && shareRecordedOnSuccess;
    testResults.push({ id: "APP06-T04", name: "Compartilhamento e cancelamento", passed: !!t04Passed });
    console.log(`APP06-T04: ${t04Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE APP06-T05: Resiliência de IA e Vídeo
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T05 (Resiliência independente de IA e YouTube)...");
    await page.route("**/googleapis.com/youtube/**", (route) => {
      route.abort("failed");
    });
    await page.route("**/generativelanguage.googleapis.com/**", (route) => {
      route.abort("failed");
    });

    await clearLiturgyCache();
    await page.goto(`${baseUrl}/daily-gospel`);
    await page.waitForSelector("p.font-serif", { timeout: 8000 });

    await page.waitForSelector("text=Vídeo de reflexão indisponível no momento", { timeout: 8000 });

    const scriptureStillVisible = await page.locator("p.font-serif").isVisible();
    const videoNoticeVisible = await page.getByText("Vídeo de reflexão indisponível no momento").isVisible();

    console.log("Diagnóstico T05:", { scriptureStillVisible, videoNoticeVisible });
    const t05Passed = scriptureStillVisible && videoNoticeVisible;
    testResults.push({ id: "APP06-T05", name: "Resiliência de IA e Vídeo", passed: t05Passed });
    console.log(`APP06-T05: ${t05Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE APP06-T07: Eventos do Altar e Missões
    // -------------------------------------------------------------
    console.log("\n-> Executando APP06-T07 (Integridade dos eventos do Altar)...");
    console.log("RPCs registradas pelo Altar:", recordedRpcEvents);
    const hasRead = recordedRpcEvents.some(e => e.p_kind === "gospel_read");
    const hasShare = recordedRpcEvents.some(e => e.p_kind === "gospel_share");
    const t07Passed = hasRead && hasShare;
    testResults.push({ id: "APP06-T07", name: "Eventos do Altar e Missões", passed: t07Passed });
    console.log(`APP06-T07: ${t07Passed ? "PASSED ✅" : "FAILED ❌"}`);

    // -------------------------------------------------------------
    // TESTE DE VIEWPORT MOBILE (390px e 320px)
    // -------------------------------------------------------------
    console.log("\n-> Capturando evidências visuais de mobile (390px e 320px)...");
    await page.screenshot({ path: path.join(artifactsDir, "app06-liturgy-mobile-390.png") });

    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactsDir, "app06-narrow-320.png") });

    console.log("\n=== RESUMO FINAL DOS TESTES APP06 ===");
    console.table(testResults);

    const allPassed = testResults.every(r => r.passed);
    if (allPassed) {
      console.log("\nTODOS OS TESTES APROVADOS COM SUCESSO! 🎉");
      process.exit(0);
    } else {
      console.error("\nHOUVE FALHAS NOS TESTES!");
      process.exit(1);
    }

  } catch (err) {
    console.error("Erro fatal durante os testes:", err);
    process.exit(1);
  } finally {
    await browser.close();
    if (server) await server.close();
  }
}

runTests();
