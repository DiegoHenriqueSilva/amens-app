// Optional integration check against fetched sibling refs; these are not merged by this test.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prayerDatabase, uid } from './helpers/prayer-database.mjs';
const show = (ref) => execFileSync('git', ['show', ref], { encoding: 'utf8' });
const policies = show(
  'origin/fix/adm00-portal-access:supabase/migrations/20261116000000_adm00_rls_prayer_requests_notifications.sql',
);
const admin = show(
  'origin/fix/adm02-users:supabase/migrations/20261116040000_adm02_user_admin_commands.sql',
);
const start = admin.indexOf('create or replace function public.enforce_account_not_restricted()');
const end = admin.indexOf('drop trigger if exists protect_profile_moderation_columns', start);
assert.ok(start >= 0 && end > start);
const accountGuard = admin.slice(start, end);
for (const app03First of [true, false]) {
  const fixture = await prayerDatabase();
  let user;
  try {
    await fixture.db.query(
      'create table prayer_contributions(id uuid,user_id uuid);create table prayer_intentions(id uuid,user_id uuid);create table friend_requests(id uuid,sender_id uuid);alter table notifications enable row level security;',
    );
    await fixture.db.query('insert into friendships values($1,$2)', [uid(2), uid(3)]);
    if (app03First) await fixture.apply();
    await fixture.db.query(policies);
    await fixture.db.query(accountGuard);
    if (!app03First) await fixture.apply();
    user = await fixture.connect(uid(2));
    const received = (
      await user.query('select receive_prayer_cause($1,$2) result', [randomUUID(), uid(104)])
    ).rows[0].result;
    assert.equal(received.recorded, true);
    await user.query("select set_prayer_reaction($1,'love')", [uid(104)]);
    assert.equal(
      (
        await user.query('select invite_prayer_friends($1,$2,$3) result', [
          uid(104),
          [uid(3)],
          randomUUID(),
        ])
      ).rows[0].result,
      1,
    );
    assert.equal(
      (
        await user.query('select invite_prayer_friends($1,$2,$3) result', [
          '00000000-0000-4000-9000-000000000001',
          [uid(3)],
          randomUUID(),
        ])
      ).rows[0].result,
      1,
    );
    assert.equal(
      (await fixture.db.query('select prayer_count from prayer_requests where id=$1', [uid(104)]))
        .rows[0].prayer_count,
      1,
    );
    await fixture.db.query(
      "update profiles set suspended_until=now()+interval '1 day' where id=$1",
      [uid(2)],
    );
    await assert.rejects(
      user.query("select set_prayer_reaction($1,'strength')", [uid(104)]),
      /prayer_account_unavailable/,
    );
    console.log(
      `APP03 compatibility: ${app03First ? 'APP03 then admin' : 'admin then APP03'} passed (ADM00 notification/update policies and ADM02 account triggers only).`,
    );
  } finally {
    await user?.end();
    await fixture.close();
  }
}
