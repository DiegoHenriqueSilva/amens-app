-- ADM07 — Configurações e parâmetros efetivos (+ segurança do XP)
--
-- Decisões aprovadas (22/11/2026):
--   * Multiplicador de XP passa a valer: cada ganho = valor da ação × global × individual (ADM02), arredondado.
--     Vale para os próximos ganhos; não é retroativo.
--   * Níveis: só leitura no painel. Fonte única no banco (prayer_level_thresholds), igual à lista do app.
--   * Segurança: add_xp deixa de aceitar quantidade e destinatário livres (qualquer pessoa, até sem login, dava
--     ou tirava XP de qualquer um). O servidor decide o valor de cada ação, só a própria conta ganha, e
--     "agradecer" só vale para quem de fato intercedeu num pedido de quem agradece. Limites diários por ação.
--   * Parâmetros: lidos e gravados por funções só de admin, com validação, conflito (PT409) e log.
--
-- Compatível com o app publicado: add_xp mantém a assinatura (o valor enviado pelo app é ignorado).
-- Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Níveis: fonte única
-- ---------------------------------------------------------------------------
create or replace function public.prayer_level_thresholds()
returns int[]
language sql
immutable
parallel safe
as $$
  -- Igual a CELESTIAL_LEVELS em src/lib/faith-points.ts (20 níveis). Mudar os dois juntos.
  select array[0,20,50,100,160,240,340,460,600,760,940,1140,1360,1600,1860,2140,2440,2760,3100,3460]
$$;

create or replace function public.prayer_level_number(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from unnest(public.prayer_level_thresholds()) threshold
  where threshold <= coalesce((select total_xp from public.user_xp where user_id = p_user), 0);
$$;

-- ---------------------------------------------------------------------------
-- 2. XP: multiplicador efetivo, histórico e add_xp seguro
-- ---------------------------------------------------------------------------
create or replace function public.xp_global_multiplier()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  -- Valor inválido (ex.: gravado pelo painel antigo) vale 1; fora da faixa é limitado a 0,1–10.
  select greatest(0.1, least(10, coalesce((select case when value ~ '^\d+(\.\d+)?$' then value::numeric end
                   from public.app_settings where key = 'xp_global_multiplier'), 1.0)))
$$;

create or replace function public.xp_effective_multiplier(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.xp_global_multiplier()
       * coalesce((select o.xp_multiplier::numeric from public.user_xp_overrides o where o.user_id = p_user), 1.0)
$$;

create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  base_amount int not null,
  multiplier numeric not null,
  amount int not null,
  source_user uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_action_day_idx on public.xp_events (user_id, action, created_at);
create index if not exists xp_events_source_idx on public.xp_events (source_user, user_id, created_at) where source_user is not null;
alter table public.xp_events enable row level security;
drop policy if exists xp_events_select_own on public.xp_events;
create policy xp_events_select_own on public.xp_events for select to authenticated
  using (user_id = auth.uid() or public.is_moderator_or_admin());
revoke insert, update, delete, truncate on public.xp_events from anon, authenticated;

-- Mesma assinatura do app publicado. p_xp_amount é ignorado: o servidor decide.
create or replace function public.add_xp(p_user_id uuid, p_xp_amount integer, p_action text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_base int;
  v_cap int;
  v_used int;
  v_mult numeric;
  v_amount int;
  v_total int;
  v_day timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if v_me is null then
    raise exception 'Entre na sua conta para ganhar pontos.' using errcode = '42501';
  end if;
  v_base := case p_action when 'pray' then 10 when 'submit' then 20 when 'react' then 5 when 'thank_intercessor_reward' then 10 end;
  if v_base is null then
    raise exception 'Ação de XP desconhecida.' using errcode = '22023', hint = 'invalid_action';
  end if;

  -- Serializa tentativas da mesma conta (várias abas ou toques repetidos).
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 9113));

  if p_action = 'thank_intercessor_reward' then
    -- Quem agradece dá XP a quem intercedeu por um pedido seu; uma vez por dia para cada intercessor.
    if p_user_id is null or p_user_id = v_me or not exists (
        select 1 from public.prayer_intercessions i
        join public.prayer_requests r on r.id = i.prayer_request_id
        where i.user_id = p_user_id and r.user_id = v_me) then
      raise exception 'Só dá para agradecer a quem intercedeu por um pedido seu.' using errcode = '42501', hint = 'not_intercessor';
    end if;
    if exists (select 1 from public.xp_events e where e.user_id = p_user_id and e.source_user = v_me
               and e.action = p_action and e.created_at >= v_day) then
      return coalesce((select total_xp from public.user_xp where user_id = p_user_id), 0);
    end if;
  else
    if p_user_id is distinct from v_me then
      raise exception 'Só a própria conta ganha pontos por esta ação.' using errcode = '42501', hint = 'not_self';
    end if;
    -- Teto diário por ação (sem erro: o app só deixa de somar).
    v_cap := case p_action when 'pray' then 20 when 'react' then 30
                           when 'submit' then (select count(*) from public.prayer_requests r where r.user_id = v_me and r.created_at >= v_day) end;
    select count(*) into v_used from public.xp_events e where e.user_id = v_me and e.action = p_action and e.created_at >= v_day;
    if v_used >= v_cap then
      return coalesce((select total_xp from public.user_xp where user_id = v_me), 0);
    end if;
  end if;

  v_mult := public.xp_effective_multiplier(p_user_id);
  v_amount := greatest(0, round(v_base * v_mult))::int;

  insert into public.xp_events (user_id, action, base_amount, multiplier, amount, source_user)
  values (p_user_id, p_action, v_base, v_mult, v_amount, case when p_user_id <> v_me then v_me end);

  insert into public.user_xp (user_id, total_xp, prayers_given, prayers_submitted, reactions_sent)
  values (p_user_id, v_amount,
          case when p_action = 'pray' then 1 else 0 end,
          case when p_action = 'submit' then 1 else 0 end,
          case when p_action = 'react' then 1 else 0 end)
  on conflict (user_id) do update set
    total_xp = public.user_xp.total_xp + excluded.total_xp,
    prayers_given = public.user_xp.prayers_given + excluded.prayers_given,
    prayers_submitted = public.user_xp.prayers_submitted + excluded.prayers_submitted,
    reactions_sent = public.user_xp.reactions_sent + excluded.reactions_sent,
    updated_at = now()
  returning total_xp into v_total;
  return v_total;
end;
$$;

revoke all on function public.add_xp(uuid, integer, text) from public, anon;
grant execute on function public.add_xp(uuid, integer, text) to authenticated;

-- O usuário gravava o próprio total_xp direto pela API. O app só lê user_xp; quem grava é add_xp/admin.
drop policy if exists "Users can insert own xp" on public.user_xp;
drop policy if exists "Users can update own xp" on public.user_xp;
revoke insert, update, delete, truncate on public.user_xp from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Parâmetros do painel
-- ---------------------------------------------------------------------------
create or replace function public._setting_target(p_key text)
returns uuid
language sql
immutable
as $$ select md5('app_settings:' || p_key)::uuid $$;

create or replace function public.admin_get_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Só administradores veem as configurações.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'settings', coalesce((
      select jsonb_object_agg(k.key, jsonb_build_object(
        'value', s.value, 'default', k.def, 'updated_at', s.updated_at,
        'updated_by_name', (select nullif(coalesce(p.display_name, p.full_name), '') from public.profiles p where p.id = s.updated_by)))
      from (values ('xp_global_multiplier', '1.0'), ('auto_escalate_threshold', '3')) k(key, def)
      left join public.app_settings s on s.key = k.key), '{}'::jsonb),
    'overrides', (select count(*) from public.user_xp_overrides where xp_multiplier <> 1),
    'levels', (
      with per as (
        select (select count(*) from unnest(public.prayer_level_thresholds()) th where th <= x.total_xp)::int as n, count(*) as people
        from public.user_xp x group by 1
      )
      select jsonb_agg(jsonb_build_object(
        'number', t.n, 'min_xp', t.min_xp,
        'daily_prayers', 2 + floor(t.n / 5.0)::int,
        'people', coalesce((select per.people from per where per.n = t.n), 0)) order by t.n)
      from unnest(public.prayer_level_thresholds()) with ordinality as t(min_xp, n))
  );
end;
$$;

create or replace function public.admin_set_setting(p_key text, p_value text, p_expected_updated_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.app_settings;
  v_val text := btrim(replace(coalesce(p_value, ''), ',', '.'));
  v_num numeric;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Só administradores alteram as configurações.' using errcode = '42501';
  end if;

  if p_key = 'xp_global_multiplier' then
    if v_val !~ '^\d+(\.\d)?$' then
      raise exception 'Use um número com até 1 casa decimal, de 0,1 a 10.' using errcode = '22023', hint = 'invalid_value';
    end if;
    v_num := v_val::numeric;
    if v_num < 0.1 or v_num > 10 then
      raise exception 'O multiplicador vai de 0,1 a 10.' using errcode = '22023', hint = 'invalid_value';
    end if;
    v_val := trim(trailing '.' from to_char(v_num, 'FM990.0'));
  elsif p_key = 'auto_escalate_threshold' then
    if v_val !~ '^\d+$' then
      raise exception 'Use um número inteiro de 2 a 20.' using errcode = '22023', hint = 'invalid_value';
    end if;
    v_num := v_val::numeric;
    if v_num < 2 or v_num > 20 then
      raise exception 'O número de pessoas vai de 2 a 20. Com 1, uma única pessoa tiraria qualquer pedido do ar.'
        using errcode = '22023', hint = 'invalid_value';
    end if;
    v_val := v_num::int::text;
  else
    raise exception 'Configuração desconhecida.' using errcode = '22023', hint = 'unknown_key';
  end if;

  select * into v_old from public.app_settings where key = p_key for update;
  if p_expected_updated_at is not null and v_old.updated_at is distinct from p_expected_updated_at then
    raise exception 'Outra pessoa mudou esta configuração enquanto você editava. O valor atual foi carregado: confira antes de salvar.'
      using errcode = 'PT409', hint = 'stale';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (p_key, v_val, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'setting', public._setting_target(p_key), 'setting_update', null,
          jsonb_build_object('key', p_key, 'from', v_old.value, 'to', v_val));

  return jsonb_build_object('key', p_key, 'value', v_val, 'previous', v_old.value);
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.app_settings'::regclass and contype = 'p') then
    raise notice 'app_settings sem chave primária: criando em key';
    alter table public.app_settings add primary key (key);
  end if;
end $$;

revoke all on function public.admin_get_settings() from public, anon;
grant execute on function public.admin_get_settings() to authenticated;
revoke all on function public.admin_set_setting(text, text, timestamptz) from public, anon;
grant execute on function public.admin_set_setting(text, text, timestamptz) to authenticated;
revoke all on function public.xp_effective_multiplier(uuid) from public, anon;
grant execute on function public.xp_effective_multiplier(uuid) to authenticated;
revoke insert, delete, truncate, references, trigger on public.app_settings from anon, authenticated;
revoke update on public.app_settings from anon;
