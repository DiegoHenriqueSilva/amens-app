-- Bateria ADM07 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar a migration 20261122040000 + este arquivo e executar com
--   npx --no-install supabase db query --linked -f <arquivo>
-- Depois de aplicada a migration, pode rodar só este arquivo.
-- Saída: RESULTADOS>> ID=obtido(esperado) ... <<

create function pg_temp.run(p_sql text, p_uid uuid, p_role text default 'authenticated') returns text
language plpgsql as $$
declare v text; v_hint text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
  begin
    if p_sql ~* '^\s*(insert|update|delete)' and p_sql !~* 'returning' then
      execute p_sql; v := '';
    else
      execute p_sql into v;
    end if;
    execute 'reset role';
    return 'ok:' || coalesce(v, '');
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    execute 'reset role';
    return 'bloq:' || sqlstate || case when coalesce(v_hint, '') ~ '^[a-z_]+$' then ':' || v_hint else '' end;
  end;
end $$;

create function pg_temp.xp(p_uid uuid) returns int language sql as $$
  select coalesce((select total_xp from public.user_xp where user_id = p_uid), 0) $$;

do $$
declare
  adm uuid; md uuid; aut uuid; d1 uuid; d2 uuid;
  pr uuid := gen_random_uuid(); pe uuid := gen_random_uuid();
  out text := ''; got text; n bigint; js jsonb; falhas text; i int; x0 int; ts timestamptz;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id
    join auth.users u on u.id = ur.user_id where ro.name = 'admin' and u.email not like '%@amens.test' order by ur.user_id limit 1;
  select id into md from auth.users where email = 'adm-teste-moderador@amens.test';
  select id into aut from auth.users where email = 'adm-teste-autor@amens.test';
  select id into d1 from auth.users where email = 'adm-teste-denunciante1@amens.test';
  select id into d2 from auth.users where email = 'adm-teste-denunciante2@amens.test';
  update profiles set suspended_until = null, deleted_at = null where id in (aut, d1, d2);
  delete from user_xp_overrides where user_id in (aut, d1);
  update app_settings set value = '1.0' where key = 'xp_global_multiplier';

  -- ── Níveis: fonte única igual à lista do app
  out := out || 'N1=' || (public.prayer_level_thresholds() = array[0,20,50,100,160,240,340,460,600,760,940,1140,1360,1600,1860,2140,2440,2760,3100,3460]) || '(true) ';

  -- ── add_xp seguro
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'pray')::text$q$, aut), null, 'anon');
  out := out || 'X1=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select add_xp('%s', 9999, 'pray')::text$q$, d1), aut);
  out := out || 'X2=' || got || '(bloq:42501:not_self) ';
  x0 := pg_temp.xp(aut);
  got := pg_temp.run(format($q$select add_xp('%s', 9999, 'pray')::text$q$, aut), aut);
  out := out || 'X3=' || (pg_temp.xp(aut) - x0) || '(10) ';
  x0 := pg_temp.xp(aut);
  got := pg_temp.run(format($q$select add_xp('%s', -500, 'react')::text$q$, aut), aut);
  out := out || 'X4=' || (pg_temp.xp(aut) - x0) || '(5) ';
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'xpto')::text$q$, aut), aut);
  out := out || 'X5=' || got || '(bloq:22023:invalid_action) ';
  for i in 1..25 loop
    got := pg_temp.run(format($q$select add_xp('%s', 10, 'pray')::text$q$, aut), aut);
  end loop;
  out := out || 'X6=' || (select count(*) from xp_events where user_id = aut and action = 'pray' and created_at >= now()) || '(20) ';
  x0 := pg_temp.xp(aut);
  got := pg_temp.run(format($q$select add_xp('%s', 20, 'submit')::text$q$, aut), aut);
  out := out || 'X7=' || (pg_temp.xp(aut) - x0) || '(0) ';
  insert into prayer_requests (id, user_id, title, content, author_name, status) values (pr, aut, '[TESTE ADM07] pedido', 'Conteúdo', 'Autor', 'active');
  got := pg_temp.run(format($q$select add_xp('%s', 20, 'submit')::text$q$, aut), aut);
  got := pg_temp.run(format($q$select add_xp('%s', 20, 'submit')::text$q$, aut), aut);
  out := out || 'X7b=' || (pg_temp.xp(aut) - x0) || '(20) ';
  -- Agradecer: só a quem intercedeu por um pedido de quem agradece; uma vez por dia
  insert into prayer_intercessions (prayer_request_id, user_id) values (pr, d1);
  x0 := pg_temp.xp(d1);
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'thank_intercessor_reward')::text$q$, d1), aut);
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'thank_intercessor_reward')::text$q$, d1), aut);
  out := out || 'X8=' || (pg_temp.xp(d1) - x0) || '(10) ';
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'thank_intercessor_reward')::text$q$, d2), aut);
  out := out || 'X8b=' || got || '(bloq:42501:not_intercessor) ';
  got := pg_temp.run(format($q$select add_xp('%s', 10, 'thank_intercessor_reward')::text$q$, aut), aut);
  out := out || 'X8c=' || got || '(bloq:42501:not_intercessor) ';
  -- Escrita direta no próprio XP
  x0 := pg_temp.xp(aut);
  got := pg_temp.run(format($q$update user_xp set total_xp = 99999 where user_id = '%s'$q$, aut), aut);
  out := out || 'X9=' || got || '/' || (pg_temp.xp(aut) = x0) || '(bloq:42501/true) ';
  got := pg_temp.run(format($q$insert into user_xp (user_id, total_xp) values ('%s', 5)$q$, d2), d2);
  out := out || 'X9b=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select count(*)::text from xp_events where user_id = '%s'$q$, aut), d1);
  out := out || 'X10=' || got || '(ok:0) ';

  -- ── Parâmetros
  got := pg_temp.run($q$select admin_get_settings()::text$q$, md);
  out := out || 'S1=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select admin_get_settings()::text$q$, adm);
  js := substr(got, 4)::jsonb;
  out := out || 'S2=' || jsonb_array_length(js->'levels') || '/' || (js->'levels'->0->>'daily_prayers') || '/' || (js->'levels'->19->>'daily_prayers')
         || '/' || (js->'settings'->'auto_escalate_threshold'->>'default') || '(20/2/6/3) ';
  foreach got in array array['0', '11', '1.25', 'abc', ''] loop
    out := out || 'S3' || replace(replace(coalesce(nullif(got, ''), 'vazio'), '.', 'p'), ' ', '') || '=' || pg_temp.run(format($q$select admin_set_setting('xp_global_multiplier', '%s')::text$q$, got), adm) || '(bloq:22023:invalid_value) ';
  end loop;
  got := pg_temp.run($q$select admin_set_setting('xp_global_multiplier', '1,5')->>'value'$q$, adm);
  out := out || 'S4=' || got || '(ok:1.5) ';
  got := pg_temp.run($q$select admin_set_setting('auto_escalate_threshold', '1')->>'value'$q$, adm);
  out := out || 'S5=' || got || '(bloq:22023:invalid_value) ';
  select updated_at into ts from app_settings where key = 'auto_escalate_threshold';
  got := pg_temp.run(format($q$select admin_set_setting('auto_escalate_threshold', '2', '%s')->>'value'$q$, ts), adm);
  out := out || 'S6=' || got || '(ok:2) ';
  got := pg_temp.run(format($q$select admin_set_setting('auto_escalate_threshold', '4', '%s')->>'value'$q$, ts), adm);
  out := out || 'S7=' || got || '(bloq:PT409:stale) ';
  got := pg_temp.run($q$select admin_set_setting('draw_daily_limit', '9')->>'value'$q$, adm);
  out := out || 'S8=' || got || '(bloq:22023:unknown_key) ';
  got := pg_temp.run($q$select admin_set_setting('auto_escalate_threshold', '5')->>'value'$q$, md);
  out := out || 'S9=' || got || '(bloq:42501) ';
  out := out || 'S10=' || (select string_agg((metadata->>'from') || '>' || (metadata->>'to'), ',' order by metadata->>'key')
                           from moderation_logs where action = 'setting_update' and moderator_id = adm and created_at >= now()) || '(3>2,1.0>1.5) ';

  -- ── Efeito real: multiplicador global (1,5) × individual (2) no próximo ganho
  insert into user_xp_overrides (user_id, xp_multiplier, updated_at) values (aut, 2, now());
  x0 := pg_temp.xp(aut);
  got := pg_temp.run(format($q$select add_xp('%s', 5, 'react')::text$q$, aut), aut);
  out := out || 'M1=' || (pg_temp.xp(aut) - x0) || '/' || (select multiplier from xp_events where user_id = aut and action = 'react' order by id desc limit 1)::text || '(15/3.0) ';
  -- Efeito real: escalada com o novo limite (2 pessoas)
  insert into prayer_requests (id, user_id, title, content, author_name, status) values (pe, aut, '[TESTE ADM07] escalada', 'Conteúdo', 'Autor', 'active');
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s', '%s', 'spam')$q$, pe, d1), d1);
  out := out || 'M2=' || (select status from prayer_requests where id = pe) || '(active) ';
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s', '%s', 'spam')$q$, pe, d2), d2);
  out := out || 'M3=' || (select status from prayer_requests where id = pe) || '(pending_review) ';

  select count(*), count(*) filter (where m[2] = m[3]),
         coalesce(string_agg(case when m[2] <> m[3] then m[1] || '=' || m[2] || '(' || m[3] || ')' end, ' '), '')
    into n, got, falhas
    from regexp_matches(out, '([A-Z][A-Za-z0-9]*)=([^ ]*)\(([^()]*)\) ', 'g') m;
  raise exception 'RESULTADOS>>total=% ok=% falhas: %<<', n, got, falhas;
end $$;
