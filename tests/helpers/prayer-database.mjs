// Local-only PostgreSQL fixture. This deliberately does not model unrelated app tables.
import pg from '../../tmp/app03-tools/node_modules/pg/lib/index.js';
const { Client } = pg;
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

export const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export async function prayerDatabase() {
  const connectionString =
    process.env.APP03_TEST_DATABASE_URL ||
    'postgresql://postgres:app03-local-fixture@127.0.0.1:55483/postgres';
  const target = new URL(connectionString);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(target.hostname) && target.port === '55483',
    'Tests require the disposable local database on port 55483',
  );
  const admin = new Client({ connectionString });
  await admin.connect();
  const name = `app03_test_${process.pid}_${Date.now()}`;
  await admin.query(`create database ${name}`);
  target.pathname = `/${name}`;
  const config = { connectionString: target.toString() };
  const db = new Client(config);
  await db.connect();
  const migration = async (file) =>
    db.query(
      await fs.readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'),
    );
  await db.query(`
    do $$begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end$$;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table profiles(id uuid primary key,full_name text,display_name text,show_real_name boolean default false,
      avatar_url text,city text,state text,devotional_saint text,deleted_at timestamptz,suspended_until timestamptz);
    create table roles(id uuid primary key default gen_random_uuid(),name text);
    create table user_roles(user_id uuid,role_id uuid);
    create table user_xp(user_id uuid primary key,total_xp integer);
    create function is_moderator_or_admin() returns boolean language sql stable security definer as $$
      select exists(select 1 from user_roles u join roles r on r.id=u.role_id where u.user_id=auth.uid() and r.name in ('admin','moderator'))$$;
    create function is_admin() returns boolean language sql stable security definer as $$
      select exists(select 1 from user_roles u join roles r on r.id=u.role_id where u.user_id=auth.uid() and r.name='admin')$$;
    create table prayer_requests(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),
      title text,content text,location text,status text default 'active',feedback text,author_name text,
      is_anonymous boolean not null default false,prayer_count integer default 0,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
    create table prayer_intercessions(id uuid primary key default gen_random_uuid(),user_id uuid,prayer_request_id uuid references prayer_requests(id),created_at timestamptz not null default now(),unique(user_id,prayer_request_id));
    create table prayer_reactions(id uuid primary key default gen_random_uuid(),prayer_request_id uuid references prayer_requests(id),reactor_user_id uuid,reaction_type text,created_at timestamptz default now(),deleted_at timestamptz,deleted_by uuid);
    create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid,prayer_request_id uuid references prayer_requests(id),message text not null,is_read boolean default false,type text,created_at timestamptz default now());
    create table friendships(user_id uuid,friend_id uuid);
    alter table prayer_requests enable row level security;
    create policy legacy_public_read on prayer_requests for select using(true);
    create policy owner_write on prayer_requests for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    alter table prayer_intercessions enable row level security;
    create policy own_history on prayer_intercessions for select to authenticated using(user_id=auth.uid());
    create policy own_insert on prayer_intercessions for insert to authenticated with check(user_id=auth.uid());
    alter table prayer_reactions enable row level security;
    create policy legacy_reactions on prayer_reactions for all to authenticated using(true) with check(reactor_user_id=auth.uid());
    grant all on all tables in schema public to authenticated,anon,service_role;
    create function increment_prayer_count(row_id uuid) returns void language sql security definer as $$update prayer_requests set prayer_count=prayer_count+1 where id=row_id$$;
    insert into roles(name) values('admin'),('moderator'),('user');
    insert into auth.users select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,80) n;
    insert into profiles(id,display_name,full_name,avatar_url) select id,'Apelido','Nome Privado','https://example.invalid/avatar.png' from auth.users;
    insert into user_xp select id,0 from auth.users;
    insert into prayer_requests(id,user_id,title,content,author_name,location)
      select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-4000-8000-000000000080','Pedido '||n,'Uma intenção fictícia pela saúde','Nome Privado','Rua Fictícia' from generate_series(100,300) n;
  `);
  await migration('20261112040000_level_prayer_daily_limit.sql');
  const apply = async () => {
    await migration('20261116050000_app03_prayer_commands.sql');
    await migration('20261116060000_prayer_ai_budget.sql');
  };
  const connect = async (user, role = 'authenticated') => {
    const connection = new Client(config);
    await connection.connect();
    await connection.query('select set_config($1,$2,false)', ['request.jwt.claim.sub', user ?? '']);
    await connection.query(`set role ${role}`);
    return connection;
  };
  const close = async () => {
    await db.end();
    await admin.query(`drop database ${name} with (force)`);
    await admin.end();
  };
  return { db, apply, connect, close, config };
}
