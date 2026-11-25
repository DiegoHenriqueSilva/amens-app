import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prayerDatabase, uid } from './helpers/prayer-database.mjs';
const fixture = await prayerDatabase();
const { db } = fixture;
const clients = [];
let checks = 0;
const check = (a, b, message) => {
  assert.deepEqual(a, b, message);
  checks++;
};
const rejects = async (promise, pattern) => {
  await assert.rejects(promise, pattern);
  checks++;
};
const result = async (client, sql, params = []) =>
  (await client.query(sql, params)).rows[0]?.result;
const receive = (client, id = null, op = randomUUID()) =>
  result(client, 'select receive_prayer_cause($1,$2) as result', [op, id]);
const actor = async (n, role) => {
  const client = await fixture.connect(uid(n), role);
  clients.push(client);
  return client;
};
try {
  // Reproduce the old backdating flaw against the actual previous migration.
  const legacy = await actor(1);
  for (let n = 100; n < 103; n++)
    await legacy.query(
      "insert into prayer_intercessions(user_id,prayer_request_id,created_at) values($1,$2,now()-interval '2 days')",
      [uid(1), uid(n)],
    );
  check(
    (await result(legacy, 'select prayer_daily_status() result')).used,
    0,
    'baseline backdated inserts escape the quota',
  );
  await fixture.apply();
  await fixture.apply();
  await rejects(
    legacy.query(
      "insert into prayer_intercessions(user_id,prayer_request_id,created_at) values($1,$2,now()-interval '3 days')",
      [uid(1), uid(103)],
    ),
    /permission denied/,
  );
  await rejects(
    legacy.query(
      "update prayer_intercessions set created_at=now()-interval '3 days' where user_id=$1",
      [uid(1)],
    ),
    /permission denied/,
  );
  await rejects(
    legacy.query('delete from prayer_intercessions where user_id=$1', [uid(1)]),
    /permission denied/,
  );
  const normal = await actor(2);
  const op = randomUUID();
  await rejects(
    normal.query("update profiles set suspended_until=now()+interval '1 day' where id=$1", [
      uid(2),
    ]),
    /prayer_profile_restriction_protected/,
  );
  // A column-specific grant left by a drifted deployment must not bypass command-only RLS.
  await db.query(
    'grant insert(user_id,prayer_request_id,created_at) on prayer_intercessions to authenticated',
  );
  await rejects(
    normal.query('insert into prayer_intercessions(user_id,prayer_request_id) values($1,$2)', [
      uid(2),
      uid(103),
    ]),
    /row-level security/,
  );
  const first = await receive(normal, uid(104), op);
  check(first.allowance.used, 1, 'accepting a cause consumes immediately');
  check((await receive(normal, uid(104), op)).replayed, true, 'lost responses can be retried');
  check(
    (await receive(normal, uid(104), op)).recorded,
    true,
    'retry retains the confirmed task outcome',
  );
  check(
    (await receive(normal, uid(104))).allowance.used,
    1,
    'assuming the same cause twice does not spend twice',
  );
  await receive(normal, uid(105));
  await rejects(receive(normal, uid(106)), /daily_prayer_limit_reached/);
  check(
    (await receive(normal, uid(104))).allowance.used,
    2,
    'history/shared reread works after quota exhaustion',
  );
  await rejects(receive(normal, uid(106), op), /prayer_operation_conflict/);
  check(
    await result(db, 'select prayer_count as result from prayer_requests where id=$1', [uid(104)]),
    1,
    'counter increments once',
  );
  for (const [n, xp, limit] of [
    [3, 0, 2],
    [4, 160, 3],
    [5, 760, 4],
    [6, 1860, 5],
    [7, 3460, 6],
  ]) {
    await db.query('update user_xp set total_xp=$2 where user_id=$1', [uid(n), xp]);
    const c = await actor(n);
    const status = await result(c, 'select prayer_daily_status() result');
    check(status.limit, limit, `level ${status.level} allowance`);
  }
  await db.query("insert into user_roles select $1,id from roles where name='admin'", [uid(8)]);
  check(
    (await result(await actor(8), 'select prayer_daily_status() result')).remaining,
    null,
    'administrator is unlimited',
  );
  // Test-only clock injection: substitute now() in these two installed functions, then restore
  // their exact definitions. All other SQL and all subsequent tests run the original migration.
  await db.query(
    `create function public.app03_test_now() returns timestamptz language sql stable as $$select coalesce(nullif(current_setting('app03.clock',true),'')::timestamptz,transaction_timestamp())$$`,
  );
  const originalClockFunctions = (
    await db.query(
      "select pg_get_functiondef(oid) as definition from pg_proc where pronamespace='public'::regnamespace and proname in ('prayer_daily_status','enforce_prayer_daily_limit')",
    )
  ).rows.map((row) => row.definition);
  for (const definition of originalClockFunctions)
    await db.query(definition.replace(/\bnow\(\)/g, 'public.app03_test_now()'));
  const clock = await actor(9);
  await clock.query("select set_config('app03.clock','2026-11-16T02:59:59Z',false)");
  const before = await receive(clock, uid(108));
  check(before.allowance.resetsAt, '2026-11-16T03:00:00+00:00', 'reset is Sao Paulo midnight');
  await clock.query("select set_config('app03.clock','2026-11-16T03:00:01Z',false)");
  check(
    (await result(clock, 'select prayer_daily_status() result')).used,
    0,
    'new Sao Paulo day resets usage',
  );
  check((await receive(clock, uid(109))).allowance.used, 1, 'new receipt belongs to new day');
  for (const definition of originalClockFunctions) await db.query(definition);
  // A privileged path cannot manufacture a past or future receipt either.
  for (const date of ['2000-01-01', '2099-01-01']) {
    const target = uid(date.startsWith('2000') ? 110 : 111);
    const row = await db.query(
      'insert into prayer_intercessions(user_id,prayer_request_id,created_at) values($1,$2,$3) returning created_at',
      [uid(10), target, date],
    );
    check(
      Math.abs(row.rows[0].created_at.getTime() - Date.now()) < 5000,
      true,
      'server replaces a forged date',
    );
  }
  await rejects(
    db.query('update prayer_intercessions set created_at=now() where user_id=$1', [uid(10)]),
    /prayer_intercession_immutable/,
  );
  // True concurrency: two PostgreSQL connections compete for the last opportunity.
  const one = await actor(11),
    two = await actor(11);
  await receive(one, uid(112));
  await one.query('begin');
  await receive(one, uid(113));
  let settled = false;
  const competing = receive(two, uid(114))
    .then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    .finally(() => {
      settled = true;
    });
  await new Promise((resolve) => setTimeout(resolve, 150));
  check(settled, false, 'second tab waits on the account lock');
  await one.query('commit');
  const second = await competing;
  check(
    second.error?.message,
    'daily_prayer_limit_reached',
    'only one of the simultaneous final-credit requests succeeds',
  );
  check(
    (await result(two, 'select prayer_daily_status() result')).used,
    2,
    'parallel requests stay within allowance',
  );
  // Same operation identifier concurrently records only once.
  const r1 = await actor(12),
    r2 = await actor(12),
    same = randomUUID();
  const pair = await Promise.all([receive(r1, uid(115), same), receive(r2, uid(115), same)]);
  check(
    pair.filter((item) => item.replayed).length,
    1,
    'parallel retry returns the original result',
  );
  check(pair[1].allowance.used, 1, 'parallel retry spends one opportunity');
  // Approved/public projection does not expose author identifiers, avatar or location for anonymous causes.
  await db.query('update prayer_requests set is_anonymous=true where id=$1', [uid(120)]);
  const anon = await actor(0, 'anon');
  const projection = await result(anon, 'select get_prayer_cause($1) result', [uid(120)]);
  check(
    [projection.display_name, projection.avatar_url, projection.location, projection.is_friend],
    ['Um fiel', null, null, false],
    'anonymous identity is masked on the server',
  );
  check(
    Object.keys(projection).some((key) => ['user_id', 'author_name', 'full_name'].includes(key)),
    false,
    'raw identity fields never enter the projection',
  );
  check(
    (await anon.query('select id from prayer_requests')).rows.length,
    0,
    'legacy permissive policy cannot expose raw rows',
  );
  const author = await actor(80);
  check(
    (await author.query('select id from prayer_requests')).rows.length > 0,
    true,
    'APP04 owner reads remain available',
  );
  for (const status of ['pending_review', 'policy_violation', 'banned']) {
    await db.query('update prayer_requests set status=$2 where id=$1', [uid(121), status]);
    check(
      await result(anon, 'select get_prayer_cause($1) result', [uid(121)]),
      null,
      `${status} is hidden in links`,
    );
    await rejects(receive(await actor(13), uid(121)), /prayer_unavailable/);
  }
  await db.query("update prayer_requests set status='completed' where id=$1", [uid(122)]);
  await rejects(receive(await actor(14), uid(122)), /prayer_unavailable/);
  for (const feedback of ['success', 'grace_received', 'not_this_time', 'god_knows']) {
    await db.query('update prayer_requests set feedback=$2 where id=$1', [uid(123), feedback]);
    await rejects(receive(await actor(15), uid(123)), /prayer_unavailable/);
  }
  await db.query("update prayer_requests set feedback=null,status='active' where id=$1", [
    uid(123),
  ]);
  check(
    (await receive(await actor(15), uid(123))).recorded,
    true,
    'explicit reopening restores eligibility',
  );
  await db.query("update prayer_requests set status='pending_review' where id=$1", [uid(104)]);
  const hiddenHistory = await result(normal, 'select get_my_prayer_history() result');
  check(
    hiddenHistory.find((item) => item.prayer_request_id === uid(104)).cause,
    null,
    'history keeps a safe placeholder for restricted content',
  );
  await rejects(
    normal.query("select set_prayer_reaction($1,'love')", [uid(104)]),
    /prayer_unavailable/,
  );
  await rejects(
    normal.query('select invite_prayer_friends($1,$2,$3)', [uid(104), [uid(3)], randomUUID()]),
    /prayer_unavailable/,
  );
  await db.query("update profiles set suspended_until=now()+interval '1 day' where id=$1", [
    uid(16),
  ]);
  await rejects(receive(await actor(16), uid(130)), /prayer_account_unavailable/);
  await db.query("update profiles set suspended_until=now()+interval '1 day' where id=$1", [
    uid(80),
  ]);
  check(
    await result(anon, 'select get_prayer_cause($1) result', [uid(120)]),
    null,
    'suspended author content is hidden',
  );
  await db.query('update profiles set suspended_until=null where id=$1', [uid(80)]);
  // Both mutation and count roll back if the transaction cannot finish.
  await db.query(`create function fail_app03_counter() returns trigger language plpgsql as $$begin if new.id='${uid(131)}' then raise exception 'fixture_counter_failure';end if;return new;end$$;
    create trigger fail_app03_counter before update on prayer_requests for each row execute function fail_app03_counter()`);
  const atomic = await actor(17);
  await rejects(receive(atomic, uid(131)), /fixture_counter_failure/);
  check(
    (await result(atomic, 'select prayer_daily_status() result')).used,
    0,
    'counter failure rolls back consumption',
  );
  await db.query('drop trigger fail_app03_counter on prayer_requests');
  const reactionActor = await actor(18);
  await reactionActor.query("select set_prayer_reaction($1,'love')", [uid(132)]);
  await reactionActor.query('select set_prayer_reaction($1,null)', [uid(132)]);
  check(
    await result(
      db,
      'select count(*)::int result from prayer_reactions where prayer_request_id=$1 and deleted_at is not null',
      [uid(132)],
    ),
    1,
    'reaction removal is a soft delete',
  );
  await reactionActor.query("select set_prayer_reaction($1,'strength')", [uid(132)]);
  check(
    await result(db, 'select count(*)::int result from notifications where prayer_request_id=$1', [
      uid(132),
    ]),
    1,
    'changing or restoring a reaction does not send duplicate notifications',
  );
  await rejects(
    reactionActor.query("select set_prayer_reaction($1,'invalid')", [uid(132)]),
    /prayer_reaction_invalid/,
  );
  await rejects(
    reactionActor.query('delete from prayer_reactions where reactor_user_id=$1', [uid(18)]),
    /permission denied/,
  );
  const generalCauseId = '00000000-0000-4000-9000-000000000001';
  const beforeGeneral = (await result(reactionActor, 'select prayer_daily_status() result')).used;
  const generalReceipt = await receive(reactionActor, generalCauseId);
  check(generalReceipt.cause.is_default, false, 'general causes expose no origin marker');
  check(generalReceipt.cause.display_name, 'Um fiel', 'general causes use the normal anonymous byline');
  check(
    (await result(reactionActor, 'select prayer_daily_status() result')).used,
    beforeGeneral + 1,
    'general causes consume one daily intercession',
  );
  await reactionActor.query("select set_prayer_reaction($1,'love')", [generalCauseId]);
  check(
    await result(reactionActor, 'select set_prayer_reaction($1,$2) result', [generalCauseId, 'love']),
    'love',
    'general cause reactions use the normal command',
  );
  check(
    (await result(reactionActor, 'select get_my_prayer_history() result')).some(
      (item) => item.prayer_request_id === generalCauseId && item.cause?.is_default === false,
    ),
    true,
    'general causes appear in history without an origin marker',
  );
  await db.query('insert into friendships values($1,$2),($1,$3)', [uid(18), uid(19), uid(80)]);
  const inviteOp = randomUUID();
  check(
    await result(reactionActor, 'select invite_prayer_friends($1,$2,$3) result', [
      uid(120),
      [uid(19), uid(80)],
      inviteOp,
    ]),
    2,
    'anonymous authors are not exposed through recipient exclusion',
  );
  check(
    await result(reactionActor, 'select invite_prayer_friends($1,$2,$3) result', [
      uid(120),
      [uid(80), uid(19)],
      inviteOp,
    ]),
    2,
    'invite retries do not duplicate sends',
  );
  check(
    await result(db, 'select count(*)::int result from notifications where prayer_request_id=$1', [
      uid(120),
    ]),
    2,
    'invites persist once',
  );
  await rejects(
    reactionActor.query('select invite_prayer_friends($1,$2,$3)', [
      uid(133),
      [uid(20)],
      randomUUID(),
    ]),
    /prayer_invite_invalid/,
  );
  check(
    await result(reactionActor, 'select invite_prayer_friends($1,$2,$3) result', [
      generalCauseId,
      [uid(19)],
      randomUUID(),
    ]),
    1,
    'general intention invitations are supported',
  );
  check(
    await result(
      db,
      "select type result from notifications where type like 'prayer_cause:%' limit 1",
    ),
    `prayer_cause:${generalCauseId}`,
    'messages carry the normal UUID cause route',
  );
  // A notification failure must not leave a successful reaction behind.
  await db.query(`create function fail_app03_notification() returns trigger language plpgsql as $$begin raise exception 'fixture_notification_failure';end$$;
    create trigger fail_app03_notification before insert on notifications for each row execute function fail_app03_notification()`);
  await rejects(
    reactionActor.query("select set_prayer_reaction($1,'love')", [uid(134)]),
    /fixture_notification_failure/,
  );
  check(
    await result(
      db,
      'select count(*)::int result from prayer_reactions where prayer_request_id=$1',
      [uid(134)],
    ),
    0,
    'failed notification rolls back reaction',
  );
  await db.query('drop trigger fail_app03_notification on notifications');
  const intercessor = await actor(19);
  await receive(intercessor, uid(132));
  check(
    (await normal.query('select * from get_prayer_intercessors($1)', [uid(132)])).rows,
    [],
    'another member cannot list intercessor identities',
  );
  const ownerList = (await author.query('select * from get_prayer_intercessors($1)', [uid(132)]))
    .rows;
  check(
    ownerList.map((item) => item.intercessor_id),
    [uid(19)],
    'APP04 author keeps the existing intercessor list',
  );
  check(ownerList[0].display_name, 'Apelido', 'hidden real names stay hidden in the owner list');
  // Pagination and cross-account isolation.
  for (let n = 200; n < 223; n++)
    await db.query('insert into prayer_intercessions(user_id,prayer_request_id) values($1,$2)', [
      uid(8),
      uid(n),
    ]);
  const adminActor = await actor(8);
  const page = await result(adminActor, 'select get_my_prayer_history() result');
  check(page.length, 21, 'history uses a bounded page plus one lookahead row');
  const cursor = page[19];
  const next = await result(adminActor, 'select get_my_prayer_history($1,$2) result', [
    cursor.created_at,
    cursor.id,
  ]);
  check(next.length, 3, 'stable cursor has no gaps at equal timestamps');
  check(
    (await result(await actor(21), 'select get_my_prayer_history() result')).length,
    0,
    'another account has no access to this history',
  );
  // AI authorization, reservation/cache behavior, and fail-closed service-only access.
  await rejects(
    normal.query('select reserve_prayer_ai($1,$2,$3)', [uid(2), 'prayer', 'x']),
    /permission denied/,
  );
  await rejects(
    normal.query('select prayer_ai_context($1,$2)', [uid(2), uid(120)]),
    /permission denied/,
  );
  await rejects(
    db.query('select prayer_ai_context($1,$2)', [uid(2), uid(104)]),
    /prayer_unavailable/,
  );
  const reserve = async (user, resource) =>
    result(db, 'select reserve_prayer_ai($1,$2,$3) result', [user, 'prayer', resource]);
  const reserved = await reserve(uid(22), 'cause-1');
  check(Boolean(reserved.attemptId), true, 'AI attempt reserves before calling provider');
  check(
    (await reserve(uid(22), 'cause-1')).denied,
    'busy',
    'parallel requests cannot double-call provider',
  );
  await db.query("update prayer_ai_attempts set status='done',output=$2 where id=$1", [
    reserved.attemptId,
    { prayer: 'Oração fictícia' },
  ]);
  check(
    (await reserve(uid(22), 'cause-1')).cached,
    { prayer: 'Oração fictícia' },
    'cache hits do not spend another attempt',
  );
  await reserve(uid(22), 'cause-2');
  await reserve(uid(22), 'cause-3');
  check(
    (await reserve(uid(22), 'cause-4')).denied,
    'budget',
    'failed or pending attempts still spend the daily budget',
  );
  await db.query(
    "insert into prayer_ai_attempts(kind,resource,status) select 'gospel',n::text,'failed' from generate_series(1,100) n",
  );
  check(
    (await reserve(uid(23), 'another-cause')).denied,
    'budget',
    'installation-wide cap also limits failed attempts',
  );
  // An empty member queue falls back to a normal-looking general cause.
  await db.query('update prayer_requests set deleted_at=now()');
  const empty = await receive(await actor(24));
  check(isNaN(Date.parse(empty.cause.created_at)), false, 'fallback cause has normal cause metadata');
  check(empty.cause.is_default, false, 'fallback cause exposes no general-intention marker');
  check(empty.allowance.used, 1, 'fallback cause consumes one daily intercession');
  await db.query(
    "insert into prayer_requests(id,user_id,status,feedback,content,is_anonymous) values($1,$5,'completed',null,'closed',false),($2,$5,'active','success','legacy closed',false),($3,$5,'pending_review',null,'restricted',false),($4,$5,'active',null,'open',true)",
    [uid(301), uid(302), uid(303), uid(304), uid(80)],
  );
  const drawn = await receive(await actor(25));
  check(
    drawn.cause.id,
    uid(304),
    'random draw excludes completed, legacy closed and restricted causes',
  );
  check(drawn.cause.display_name, 'Um fiel', 'random draw uses the same safe anonymous projection');
  // Administrator can receive more than the largest standard allowance.
  await db.query(
    "insert into prayer_requests(id,user_id,content) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'fictitious' from generate_series(310,317) n",
    [uid(80)],
  );
  for (let n = 310; n < 318; n++) await receive(adminActor, uid(n));
  check(
    (await result(adminActor, 'select prayer_daily_status() result')).used > 6,
    true,
    'administrator remains unlimited in the write path',
  );
  console.log(
    `APP03 PostgreSQL: ${checks} checks passed, including two independent concurrent connections. Synthetic local fixture only.`,
  );
} finally {
  await Promise.all(clients.map((client) => client.end()));
  await fixture.close();
}
