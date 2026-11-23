-- Bateria ADM08 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar a migration 20261123000000 + este arquivo e executar com
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

do $$
declare
  adm uuid; md uuid; aut uuid; d1 uuid;
  pr uuid := gen_random_uuid(); lg uuid := gen_random_uuid(); lf uuid;
  out text := ''; got text; n bigint; js jsonb; row jsonb; falhas text;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id
    join auth.users u on u.id = ur.user_id where ro.name = 'admin' and u.email not like '%@amens.test' order by ur.user_id limit 1;
  select id into md from auth.users where email = 'adm-teste-moderador@amens.test';
  select id into aut from auth.users where email = 'adm-teste-autor@amens.test';
  select id into d1 from auth.users where email = 'adm-teste-denunciante1@amens.test';
  update profiles set suspended_until = null, deleted_at = null where id in (aut, d1);

  -- ── Acesso
  got := pg_temp.run($q$select admin_list_logs()::text$q$, md);
  out := out || 'P1=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select admin_list_logs()::text$q$, aut);
  out := out || 'P2=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select count(*)::text from moderation_logs$q$, null, 'anon');
  out := out || 'P3=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select count(*)::text from moderation_logs$q$, aut);
  out := out || 'P4=' || got || '(ok:0) ';

  -- ── Integridade: ator e instante forçados; sem alterar nem apagar
  got := pg_temp.run(format($q$insert into moderation_logs (moderator_id, target_type, target_id, action, reason, created_at)
           values ('%s', 'user', '%s', 'ban', '[TESTE ADM08] forjado', '2020-01-01')$q$, adm, d1), md);
  select id into lf from moderation_logs where reason = '[TESTE ADM08] forjado';
  out := out || 'I1=' || got || '/' || coalesce((select (moderator_id = md) || '/' || (created_at > now() - interval '1 minute') from moderation_logs where id = lf), 'nada') || '(ok:/true/true) ';
  got := pg_temp.run(format($q$update moderation_logs set reason = 'apagado' where id = '%s'$q$, lf), md);
  out := out || 'I2=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$delete from moderation_logs where id = '%s'$q$, lf), adm);
  out := out || 'I3=' || got || '/' || (select count(*) from moderation_logs where id = lf) || '(bloq:42501/1) ';
  got := pg_temp.run(format($q$insert into moderation_logs (target_type, target_id, action) values ('user', '%s', 'ban')$q$, d1), aut);
  out := out || 'I4=' || got || '(bloq:42501) ';

  -- ── Atomicidade: se o log falhar, a ação não acontece (T02)
  alter table moderation_logs add constraint teste_adm08_falha check (action <> 'suspend') not valid;
  got := pg_temp.run(format($q$select admin_suspend_user('%s', 3, 'Teste de falha do log')::text$q$, d1), adm);
  out := out || 'A1=' || got || '/' || (select coalesce(suspended_until::text, 'sem') from profiles where id = d1) || '(bloq:23514/sem) ';
  alter table moderation_logs drop constraint teste_adm08_falha;
  got := pg_temp.run(format($q$select (admin_suspend_user('%s', 3, 'Teste depois da falha')->>'user_id' is not null)::text$q$, d1), adm);
  out := out || 'A2=' || got || '/' || (select count(*) from moderation_logs where target_id = d1 and action = 'suspend' and created_at >= now()) || '(ok:true/1) ';

  -- ── Lista: alvo legível, texto íntimo fora, removido sinalizado
  insert into prayer_requests (id, user_id, title, content, author_name, status) values (pr, aut, '[TESTE ADM08] Cura da minha mãe', 'Texto novo', 'Autor', 'active');
  insert into moderation_logs (id, moderator_id, target_type, target_id, action, reason, metadata)
  values (lg, adm, 'prayer_request', pr, 'edit_content', '[TESTE ADM08] ajuste',
          jsonb_build_object('from_status', 'active', 'to_status', 'pending_review', 'previous_title', 'Título íntimo', 'previous_content', 'Texto íntimo anterior'));
  got := pg_temp.run($q$select admin_list_logs(null, null, null, '[TESTE ADM08] ajuste')::text$q$, adm);
  js := substr(got, 4)::jsonb; row := js->'rows'->0;
  out := out || 'L1=' || (js->>'total') || '/' || replace(row->>'target_label', ' ', '_') || '/' || (row->>'has_previous_text') || '/'
         || (row->'details' ? 'previous_content') || '/' || (row->'details'->>'to_status') || '(1/[TESTE_ADM08]_Cura_da_minha_mãe/true/false/pending_review) ';
  out := out || 'L1b=' || (position('Texto íntimo' in got) = 0) || '(true) ';
  got := pg_temp.run(format($q$select admin_log_previous_text('%s')->>'content'$q$, lg), adm);
  out := out || 'L2=' || replace(got, ' ', '_') || '(ok:Texto_íntimo_anterior) ';
  got := pg_temp.run(format($q$select admin_log_previous_text('%s')->>'content'$q$, lg), md);
  out := out || 'L2b=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select admin_log_previous_text('%s')->>'content'$q$, lf), adm);
  out := out || 'L2c=' || got || '(bloq:22023:no_text) ';
  update prayer_requests set deleted_at = now() where id = pr;
  got := pg_temp.run($q$select admin_list_logs(null, null, null, '[TESTE ADM08] ajuste')->'rows'->0->>'target_removed'$q$, adm);
  out := out || 'L3=' || got || '(ok:true) ';
  -- Busca pelo nome do alvo, pelo ator e por filtros
  got := pg_temp.run($q$select admin_list_logs(null, null, null, 'Cura da minha')->>'total'$q$, adm);
  out := out || 'L4=' || got || '(ok:1) ';
  got := pg_temp.run(format($q$select admin_list_logs('user', 'ban', '%s')->>'total'$q$, md), adm);
  out := out || 'L5=' || got || '(ok:1) ';
  got := pg_temp.run($q$select (admin_list_logs(null, null, 'auto')->>'total')::int >= 0$q$, adm);
  out := out || 'L6=' || got || '(ok:true) ';
  got := pg_temp.run($q$select admin_list_logs(null, null, null, null, current_date + 1)->>'total'$q$, adm);
  out := out || 'L7=' || got || '(ok:0) ';
  got := pg_temp.run($q$select admin_list_logs(null, null, null, null, current_date, current_date - 1)->>'total'$q$, adm);
  out := out || 'L8=' || got || '(bloq:22023:invalid_range) ';
  got := pg_temp.run($q$select admin_list_logs(null, null, 'xpto')->>'total'$q$, adm);
  out := out || 'L9=' || got || '(bloq:22023) ';
  -- Volume: mais de 500, sem corte
  insert into moderation_logs (moderator_id, target_type, target_id, action, reason)
  select adm, 'user', d1, 'role_assign', '[TESTE ADM08] volume ' || g from generate_series(1, 600) g;
  got := pg_temp.run($q$select (admin_list_logs(null, null, null, 'ADM08] volume', null, null, 0, 50)->>'total') || '/' ||
                             jsonb_array_length(admin_list_logs(null, null, null, 'ADM08] volume', null, null, 550, 100)->'rows')$q$, adm);
  out := out || 'V1=' || got || '(ok:600/50) ';
  -- Apoiadores na mesma trilha, sem valores
  insert into supporter_recognition_audit (user_id, actor_id, active) values (d1, adm, true);
  got := pg_temp.run($q$select admin_list_logs('supporter', 'supporter_on')::text$q$, adm);
  js := substr(got, 4)::jsonb;
  select x into row from jsonb_array_elements(js->'rows') x where (x->>'target_id')::uuid = d1 limit 1;
  out := out || 'S1=' || coalesce((row->>'source') || '/' || (row->>'actor_id' = adm::text) || '/' || (row->'details' = '{}'::jsonb), 'nada') || '(supporter/true/true) ';
  got := pg_temp.run($q$select (jsonb_array_length(admin_log_actors()) > 0)::text$q$, adm);
  out := out || 'S2=' || got || '(ok:true) ';

  select count(*), count(*) filter (where m[2] = m[3]),
         coalesce(string_agg(case when m[2] <> m[3] then m[1] || '=' || m[2] || '(' || m[3] || ')' end, ' '), '')
    into n, got, falhas
    from regexp_matches(out, '([A-Z][A-Za-z0-9]*)=([^ ]*)\(([^()]*)\) ', 'g') m;
  raise exception 'RESULTADOS>>total=% ok=% falhas: %<<', n, got, falhas;
end $$;
