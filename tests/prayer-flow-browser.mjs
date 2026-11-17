// Real local UI + synthetic HTTP boundary. Never forwards requests to production.
import { chromium } from '../tmp/app03-tools/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { prayerDatabase, uid } from './helpers/prayer-database.mjs';
const output = new URL('../tmp/sandbox/app03-implementation-2026-11-17/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const fixture = await prayerDatabase();
await fixture.apply();
await fixture.db.query('insert into friendships values($1,$2)', [uid(2), uid(3)]);
await fixture.db.query(
  'update prayer_requests set is_anonymous=true,title=$2,content=$3 where id=$1',
  [
    uid(104),
    'Uma intenção com título longo para testar a leitura e a disposição no celular',
    'Texto fictício para verificar a leitura de um pedido extenso. '.repeat(18),
  ],
);
const actor = await fixture.connect(uid(2));
let rpcActor = actor;
const extraActors = [];
const anonymous = await fixture.connect(null, 'anon');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const dotenv = await fs.readFile(new URL('../.env', import.meta.url), 'utf8');
const supabaseUrl = dotenv.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
assert.ok(supabaseUrl, 'Public Supabase URL must be configured locally');
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
let authenticated = true,
  failQuota = false,
  failReaction = false,
  failInvite = false,
  delayReceive = false,
  dropResponse = false;
let received = 0;
let shareAwards = 0;
let receiveBody = null;
let errors = [];
let reports = 0;
let aiBody = null;
let statusGate = null;
let administratorStatus = false;
let remainingOverride = null;
const profile = {
  id: uid(2),
  full_name: 'Pessoa Fictícia',
  display_name: 'Pessoa Fictícia',
  parish: 'Paróquia de Testes',
  city: 'Cidade de Testes',
  state: 'SP',
  friend_code: 'AMEN-TEST',
  devotional_saint: 'São José',
  show_real_name: false,
};
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
await context.addInitScript(
  ({ storageKey, profile }) => {
    const payload = {
      sub: profile.id,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `${btoa('{}')}.${btoa(JSON.stringify(payload))}.synthetic`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        access_token: token,
        refresh_token: 'synthetic',
        expires_at: payload.exp,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          ...profile,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.invalid',
          user_metadata: profile,
        },
      }),
    );
    localStorage.setItem('amens_push_denied_date', new Date().toISOString());
    Object.defineProperty(window, 'Notification', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        throw new DOMException('Cancelled', 'AbortError');
      },
      configurable: true,
    });
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.remove('amens-welcome');
      window.__amensWelcome = false;
    });
  },
  { storageKey, profile },
);
await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.hostname === '127.0.0.1') return route.continue();
  const respond = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/0' },
      body: JSON.stringify(body),
    });
  if (url.pathname.startsWith('/auth/v1'))
    return respond({
      id: profile.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.invalid',
      user_metadata: profile,
    });
  if (url.pathname === '/functions/v1/generate-prayer') {
    aiBody = request.postDataJSON();
    return respond({ prayer: 'Senhor, acolhei esta intenção. Amém.' });
  }
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const name = url.pathname.split('/').at(-1);
    const body = request.postDataJSON() || {};
    const client = authenticated ? rpcActor : anonymous;
    try {
      const calls = {
        prayer_daily_status: async () => {
          if (failQuota) throw new Error('synthetic_quota_failure');
          const gate = statusGate;
          if (gate) await gate;
          const result = await client.query('select prayer_daily_status() result');
          if (administratorStatus)
            Object.assign(result.rows[0].result, {
              isAdmin: true,
              limit: null,
              remaining: null,
              nextBonusLevel: null,
            });
          if (remainingOverride !== null) result.rows[0].result.remaining = remainingOverride;
          return result;
        },
        get_prayer_cause: () =>
          client.query('select get_prayer_cause($1) result', [body.p_prayer_id]),
        receive_prayer_cause: async () => {
          received++;
          receiveBody = body;
          if (delayReceive) await new Promise((resolve) => setTimeout(resolve, 700));
          return client.query('select receive_prayer_cause($1,$2) result', [
            body.p_operation_id,
            body.p_prayer_id,
          ]);
        },
        set_prayer_reaction: () => {
          if (failReaction) throw new Error('synthetic_reaction_failure');
          return client.query('select set_prayer_reaction($1,$2) result', [
            body.p_prayer_id,
            body.p_reaction,
          ]);
        },
        get_my_prayer_history: () =>
          client.query('select get_my_prayer_history($1,$2) result', [
            body.p_before,
            body.p_before_id,
          ]),
        general_intention_reaction: () =>
          client.query('select general_intention_reaction($1,$2,$3) result', [
            body.p_intention_id,
            body.p_reaction ?? null,
            body.p_write ?? false,
          ]),
        invite_prayer_friends: () => {
          if (failInvite) throw new Error('synthetic_invite_failure');
          return client.query('select invite_prayer_friends($1,$2,$3,$4) result', [
            body.p_prayer_id,
            body.p_recipients,
            body.p_operation_id,
            body.p_intention_id,
          ]);
        },
        get_prayer_engagement_counts: async () => ({
          rows: [
            {
              result: body.prayer_ids.map((id) => ({
                prayer_request_id: id,
                intercessor_count: 1,
                reactions: {},
              })),
            },
          ],
        }),
        altar_sync: async () => ({ rows: [{ result: { achievements: [], metrics: {} } }] }),
        add_xp: async () => {
          shareAwards++;
          return { rows: [{ result: 0 }] };
        },
      };
      if (calls[name]) {
        const result = (await calls[name]()).rows[0].result;
        if (name === 'receive_prayer_cause' && dropResponse) {
          dropResponse = false;
          return route.abort('failed');
        }
        return respond(result);
      }
      return respond(null);
    } catch (error) {
      return respond({ message: error.message, code: 'P0001' }, 400);
    }
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    if (url.pathname.endsWith('/profiles'))
      return respond(request.headers().accept?.includes('object') ? profile : [profile]);
    if (url.pathname.endsWith('/user_xp'))
      return respond(
        request.headers().accept?.includes('object') ? { total_xp: 0 } : [{ total_xp: 0 }],
      );
    if (url.pathname.endsWith('/friendships'))
      return respond([
        { friend_id: uid(3), profiles: { ...profile, id: uid(3), display_name: 'Amigo Fictício' } },
      ]);
    if (url.pathname.endsWith('/prayer_reports') && request.method() === 'POST') {
      reports++;
      return respond(null, 201);
    }
    return respond([]);
  }
  // External fonts, images, analytics, provider and websocket services are blocked.
  return route.abort();
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const visible = async (selector) => {
  await selector.waitFor({ state: 'visible', timeout: 20000 });
};
const screenshot = async (name) =>
  page.screenshot({
    path: new URL(name, output).pathname.replace(/^\/([A-Z]:)/, '$1'),
    fullPage: true,
  });
let checks = 0;
const check = (a, b, message) => {
  assert.deepEqual(a, b, message);
  checks++;
};
try {
  await page.goto('http://127.0.0.1:4176/pray');
  const receiveButton = page.getByRole('button', { name: 'Receber uma Causa', exact: true });
  await visible(receiveButton);
  await receiveButton.waitFor({ state: 'visible' });
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Receber uma Causa',
      )?.disabled,
  );
  await visible(page.getByRole('region', { name: 'Intercessões diárias' }));
  check(
    await page.locator('.daily-intercessions__count strong').textContent(),
    '2 de 2 disponíveis',
    'available intercessions have a compact visual summary',
  );
  check(
    await page.locator('.daily-intercessions__bonus').textContent(),
    'No nível 5, +1 intercessão por dia.',
    'level bonus uses the approved wording',
  );
  await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
  await visible(
    page.getByText(
      'Receber ou assumir uma causa registra uma intercessão. Reler o histórico não registra outra.',
    ),
  );
  await page.keyboard.press('Escape');
  await page
    .getByText(
      'Receber ou assumir uma causa registra uma intercessão. Reler o histórico não registra outra.',
    )
    .waitFor({ state: 'hidden' });
  checks++;
  await screenshot('01-inicio-mobile.png');
  let releaseStatus;
  statusGate = new Promise((resolve) => {
    releaseStatus = resolve;
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await visible(page.locator('.daily-intercessions__loading'));
  check(
    await page.locator('.daily-intercessions__summary').count(),
    0,
    'loading never displays an invented allowance',
  );
  statusGate = null;
  releaseStatus();
  await visible(page.locator('.daily-intercessions__summary'));
  administratorStatus = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await visible(page.getByText('Sem limite diário', { exact: true }));
  check(
    await page.locator('.daily-intercessions__reset').count(),
    0,
    'administrator has no misleading reset reminder',
  );
  administratorStatus = false;
  remainingOverride = 0;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await visible(page.getByText('0 de 2 disponíveis', { exact: true }));
  check(await receiveButton.isDisabled(), true, 'empty daily intercessions disable receiving');
  check(
    await page.locator('.daily-intercessions__reset').textContent(),
    'Renova às 00hSão Paulo',
    'reset stays compact and uses Sao Paulo',
  );
  remainingOverride = null;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await visible(page.getByText('2 de 2 disponíveis', { exact: true }));
  await page.goto(`http://127.0.0.1:4176/pray?id=${uid(104)}`);
  await visible(page.locator('.devotional-cause'));
  await page.addScriptTag({
    path: new URL(
      '../tmp/app03-tools/node_modules/axe-core/axe.min.js',
      import.meta.url,
    ).pathname.replace(/^\/([A-Z]:)/, '$1'),
  });
  check(received, 0, 'opening a shared link does not consume quota');
  check(
    (await page.locator('.devotional-cause__byline').textContent()).trim(),
    'Oração solicitada por Um fiel',
    'anonymous card has a safe display name',
  );
  check(
    await page.locator('.devotional-cause__location').count(),
    0,
    'anonymous card has no location',
  );
  for (const [width, height, theme] of [
    [320, 740, 'refresh'],
    [390, 844, 'refresh'],
    [844, 390, 'refresh'],
    [1440, 900, 'refresh'],
    [320, 740, 'legacy'],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      (theme) => document.documentElement.classList.toggle('amens-refresh', theme !== 'legacy'),
      theme,
    );
    await page.waitForTimeout(600);
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `no horizontal overflow at ${width} ${theme}`,
    );
    const reading = await page.locator('.prayer-app-frame__content').boundingBox();
    const menu = await page.getByRole('navigation', { name: 'Menu principal' }).boundingBox();
    check(
      Math.round(reading.y + reading.height) <= Math.round(menu.y),
      true,
      `menu has its own row at ${width} ${theme}`,
    );
    const accessibility = await page.evaluate(async () =>
      window.axe.run('.cause-page', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }),
    );
    await fs.writeFile(
      new URL(`accessibility-${width}-${theme}.json`, output),
      JSON.stringify(
        { violations: accessibility.violations, incomplete: accessibility.incomplete },
        null,
        2,
      ),
    );
    check(
      accessibility.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
      [],
      `automated accessibility at ${width} ${theme}`,
    );
    for (const element of await page.locator('.devotional-cause button').all()) {
      const bounds = await element.boundingBox();
      assert.ok(bounds.height >= 44, `touch target ${await element.innerText()}`);
    }
    await screenshot(`02-causa-${width}-${theme}.png`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('amens-refresh'));
  const longName = 'Pessoa com nome de exibição bastante longo '.repeat(6);
  await fixture.db.query('update profiles set display_name=$2 where id=$1', [uid(80), longName]);
  await fixture.db.query('update prayer_requests set is_anonymous=false where id=$1', [uid(104)]);
  await page.reload();
  await visible(page.locator('.devotional-cause'));
  await page.setViewportSize({ width: 320, height: 740 });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'long author name wraps at 320px',
  );
  await page.waitForTimeout(300);
  check(
    await page.locator('.devotional-cause__avatar--placeholder').count(),
    1,
    'broken avatar falls back to the existing icon',
  );
  await screenshot('02-nome-longo-320.png');
  await fixture.db.query('update prayer_requests set is_anonymous=true where id=$1', [uid(104)]);
  await page.reload();
  await visible(page.locator('.devotional-cause'));
  await page.addScriptTag({
    path: new URL(
      '../tmp/app03-tools/node_modules/axe-core/axe.min.js',
      import.meta.url,
    ).pathname.replace(/^\/([A-Z]:)/, '$1'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  delayReceive = true;
  await page
    .getByRole('button', { name: 'Aceitar interceder', exact: true })
    .dblclick({ delay: 15 });
  await visible(page.locator('.daily-intercessions__summary'));
  await page.waitForTimeout(850);
  check(received, 1, 'double click only issues one receive command');
  check(
    (await actor.query('select prayer_daily_status() result')).rows[0].result.used,
    1,
    'accepted cause consumed once',
  );
  check(Boolean(receiveBody.p_operation_id), true, 'frontend sends an idempotency key');
  delayReceive = false;
  failReaction = true;
  await page.getByRole('button', { name: 'Compaixão', exact: true }).click();
  await visible(page.getByText('Não foi possível confirmar a ação.', { exact: false }));
  check(
    await page.getByRole('button', { name: 'Compaixão', exact: true }).getAttribute('aria-pressed'),
    'false',
    'failed reaction leaves state unchanged',
  );
  failReaction = false;
  await page.getByRole('button', { name: 'Compaixão', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.devotional-cause__reaction')?.getAttribute('aria-pressed') ===
      'true',
  );
  await page.getByRole('button', { name: 'Compaixão', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.devotional-cause__reaction')?.getAttribute('aria-pressed') ===
      'false',
  );
  checks++;
  await page.getByRole('button', { name: 'Sugestão de Oração', exact: true }).click();
  await visible(page.getByText('Senhor, acolhei esta intenção. Amém.'));
  check(aiBody, { kind: 'prayer', causeId: uid(104) }, 'AI client sends only the cause identifier');
  const beforeShare = shareAwards;
  await page.getByRole('button', { name: 'Compartilhar fora do Améns' }).click();
  await page.waitForTimeout(150);
  check(shareAwards, beforeShare, 'cancelled share does not award a daily task');
  await page.getByRole('button', { name: 'Enviar a um amigo do Améns' }).click();
  await visible(page.getByRole('dialog'));
  await page.waitForTimeout(400);
  const friendAccessibility = await page.evaluate(async () =>
    window.axe.run('[role="dialog"]', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  );
  await fs.writeFile(
    new URL('accessibility-friends.json', output),
    JSON.stringify(friendAccessibility.violations, null, 2),
  );
  check(
    friendAccessibility.violations.map((item) => item.id),
    [],
    'friend dialog accessibility',
  );
  await page.getByRole('button', { name: 'Amigo Fictício', exact: false }).click();
  failInvite = true;
  await page.getByRole('button', { name: 'Convidar (1)', exact: true }).click();
  await page.waitForTimeout(150);
  check(
    await page
      .getByRole('button', { name: 'Amigo Fictício', exact: false })
      .getAttribute('aria-pressed'),
    'true',
    'failed invitation preserves selection',
  );
  failInvite = false;
  await page.getByRole('button', { name: 'Convidar (1)', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  checks++;
  await page.getByRole('button', { name: 'Ver minhas intercessões anteriores' }).click();
  await visible(page.getByRole('dialog'));
  await page.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await visible(page.getByRole('button', { name: 'Orar novamente' }));
  await page.getByRole('button', { name: 'Orar novamente' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(
    (await actor.query('select prayer_daily_status() result')).rows[0].result.used,
    1,
    'history rereading does not consume',
  );
  const reportButton = page.getByRole('button', { name: 'Reportar essa causa a um administrador' });
  await reportButton.click();
  await visible(page.getByRole('dialog'));
  await page.waitForTimeout(400);
  const reportAccessibility = await page.evaluate(async () =>
    window.axe.run('[role="dialog"]', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  );
  await fs.writeFile(
    new URL('accessibility-report.json', output),
    JSON.stringify(reportAccessibility.violations, null, 2),
  );
  check(
    reportAccessibility.violations.map((item) => item.id),
    [],
    'report dialog accessibility',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(
    await reportButton.evaluate((element) => element === document.activeElement),
    true,
    'report dialog restores focus on Escape',
  );
  await reportButton.click();
  await page.getByRole('button', { name: 'Spam ou pedido repetido', exact: true }).click();
  await page.getByRole('button', { name: 'Reportar', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(reports, 1, 'report returns without spending another opportunity');
  failQuota = true;
  await page.reload();
  await visible(page.getByText('Não conseguimos carregar suas intercessões diárias.'));
  check(
    await page.getByRole('button', { name: 'Receber uma Causa', exact: true }).isDisabled(),
    true,
    'quota failures are not displayed as two free opportunities',
  );
  failQuota = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Receber uma Causa',
      )?.disabled,
  );
  checks++;
  await page.goto('http://127.0.0.1:4176/pray?id=invalid');
  await visible(page.getByRole('alert'));
  check(received, 1, 'invalid link never automatically draws another cause');
  await screenshot('03-link-indisponivel.png');
  await page.goto('http://127.0.0.1:4176/pray?intention=default-001');
  await visible(page.locator('.devotional-cause'));
  await page.getByRole('button', { name: 'Força', exact: true }).click();
  await page.waitForTimeout(150);
  check(
    (await actor.query('select prayer_daily_status() result')).rows[0].result.used,
    1,
    'general intention reaction does not consume',
  );
  // Switch the authenticated account while keeping the same mounted application.
  profile.id = uid(4);
  rpcActor = await fixture.connect(uid(4));
  extraActors.push(rpcActor);
  await page.evaluate(async (profile) => {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    const payload = {
      sub: profile.id,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    await supabase.auth.setSession({
      access_token: `${btoa('{}')}.${btoa(JSON.stringify(payload))}.synthetic`,
      refresh_token: 'synthetic',
    });
    history.pushState({}, '', '/pray');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, profile);
  await visible(page.getByRole('button', { name: 'Receber uma Causa', exact: true }));
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Receber uma Causa',
      )?.disabled,
  );
  dropResponse = true;
  await page.getByRole('button', { name: 'Receber uma Causa', exact: true }).click();
  await visible(page.getByRole('alert'));
  const lostOperation = receiveBody.p_operation_id;
  check(
    (await rpcActor.query('select prayer_daily_status() result')).rows[0].result.used,
    1,
    'lost HTTP response can follow a committed receipt',
  );
  await page.getByRole('button', { name: 'Receber uma Causa', exact: true }).click();
  await visible(page.locator('.devotional-cause'));
  check(
    receiveBody.p_operation_id,
    lostOperation,
    'retry reuses the unacknowledged operation identifier',
  );
  check(
    (await rpcActor.query('select prayer_daily_status() result')).rows[0].result.used,
    1,
    'retry after a lost response does not consume twice',
  );
  delayReceive = true;
  await page.getByRole('button', { name: 'Próxima Causa', exact: true }).click();
  await page.waitForTimeout(100);
  await page.evaluate((id) => {
    history.pushState({}, '', `/pray?id=${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, uid(104));
  await page.waitForTimeout(900);
  check(
    new URL(page.url()).searchParams.get('id'),
    uid(104),
    'late receipt cannot overwrite a newly opened shared link',
  );
  await fixture.db.query('update user_xp set total_xp=160 where user_id=$1', [uid(4)]);
  await page.evaluate(() => {
    history.pushState({}, '', '/pray');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new Event('focus'));
  });
  await visible(page.getByRole('button', { name: 'Receber uma Causa', exact: true }));
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Receber uma Causa',
      )?.disabled,
  );
  const beforeLogoutReceive = received;
  await page.getByRole('button', { name: 'Receber uma Causa', exact: true }).click();
  await page.waitForTimeout(100);
  check(received, beforeLogoutReceive + 1, 'new receive request started before logout');
  authenticated = false;
  await page.evaluate(async () => {
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    await supabase.auth.signOut({ scope: 'local' });
  });
  await page.waitForTimeout(900);
  check(
    await page.locator('.daily-intercessions').count(),
    0,
    'late authenticated response cannot restore quota after logout',
  );
  await visible(page.getByRole('button', { name: 'Entrar ou criar conta', exact: true }));
  checks++;
  check(errors, [], 'no uncaught browser exceptions');
  await fs.writeFile(
    new URL('browser-results.json', output),
    JSON.stringify(
      {
        checks,
        errors,
        boundary:
          'Local UI + synthetic HTTP routing + real disposable PostgreSQL. Provider, remote Supabase, fonts and delivery are not exercised.',
      },
      null,
      2,
    ),
  );
  console.log(
    `APP03 browser: ${checks} checks passed. Screenshots in tmp/sandbox/app03-implementation-2026-11-17.`,
  );
} catch (error) {
  await screenshot('failure.png');
  await fs.writeFile(
    new URL('failure.txt', output),
    `${error.stack}\n${await page.locator('body').innerText()}`,
  );
  throw error;
} finally {
  await browser.close();
  await actor.end();
  await anonymous.end();
  await Promise.all(extraActors.map((client) => client.end()));
  await fixture.close();
}
