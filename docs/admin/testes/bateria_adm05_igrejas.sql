-- Bateria ADM05 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar a migration 20261122000000 + este arquivo e executar com
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
  adm uuid; md uuid; aut uuid; d1 uuid; d2 uuid;
  c1 uuid; c2 uuid; c3 uuid; g1 uuid; g2 uuid := gen_random_uuid(); g3 uuid := gen_random_uuid();
  sug1 uuid; sug2 uuid; ina uuid := gen_random_uuid(); lote uuid := gen_random_uuid();
  out text := ''; got text; n bigint; js jsonb; falhas text; ts timestamptz; linhas jsonb;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id where ro.name = 'admin' order by ur.user_id limit 1;
  select id into md from auth.users where email = 'adm-teste-moderador@amens.test';
  select id into aut from auth.users where email = 'adm-teste-autor@amens.test';
  select id into d1 from auth.users where email = 'adm-teste-denunciante1@amens.test';
  select id into d2 from auth.users where email = 'adm-teste-denunciante2@amens.test';
  update profiles set suspended_until = null, deleted_at = null where id in (aut, d1, d2);

  -- ── Migração dos dados
  out := out || 'M1=' || (select count(*) from churches where is_active is distinct from (status = 'active')) || '(0) ';
  out := out || 'M2=' || (select count(*) filter (where status = 'inactive') >= 530 from churches) || '(true) ';
  out := out || 'M3=' || (select count(*) from churches where status not in ('pending_review','active','inactive','rejected')) || '(0) ';

  -- ── Permissões
  -- ADM00/S3: moderador gerencia Igrejas (só a importação é de admin)
  got := pg_temp.run($q$select (admin_list_churches('all', null, null, null, null, 0, 5)->>'total' is not null)::text$q$, md);
  out := out || 'P1=' || got || '(ok:true) ';
  got := pg_temp.run($q$select admin_list_churches('all', null, null, null, null, 0, 5)::text$q$, null, 'anon');
  out := out || 'P2=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select count(*)::text from search_churches('SP', null, 'paroquia', 5)$q$, null, 'anon');
  out := out || 'P3=' || got || '(ok:5) ';
  got := pg_temp.run($q$select count(*)::text from get_duplicate_churches()$q$, aut);
  out := out || 'P4=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select (count(*) > 0)::text from get_duplicate_churches()$q$, md);
  out := out || 'P5=' || got || '(ok:true) ';

  -- ── Criar e editar
  got := pg_temp.run($q$select admin_save_church(null, '  [Teste ADM05]   Grupo  ', 'Cidade Teste ADM05', 'sp', null, 'teste')->>'state'$q$, adm);
  out := out || 'C1=' || got || '(ok:São_Paulo) ';
  out := replace(out, 'ok:São Paulo', 'ok:São_Paulo');
  select id into g1 from churches where name = '[Teste ADM05] Grupo' and city = 'Cidade Teste ADM05';
  out := out || 'C1b=' || (select status || '/' || source || '/' || is_active from churches where id = g1)
         || '/' || (select count(*) from moderation_logs where target_id = g1 and action = 'create' and moderator_id = adm) || '(active/admin/true/1) ';
  got := pg_temp.run($q$select admin_save_church(null, '[TESTE adm05] GRUPO', 'cidade teste adm05', 'São Paulo')->>'id'$q$, adm);
  out := out || 'C2=' || got || '(bloq:23505:duplicate) ';
  got := pg_temp.run($q$select admin_save_church(null, '[Teste ADM05] Grupo', 'Outra Cidade ADM05', 'SP')->>'status'$q$, adm);
  out := out || 'C3=' || got || '(ok:active) ';
  got := pg_temp.run($q$select admin_save_church(null, '[Teste ADM05] X', 'Cidade Teste ADM05', 'XX')->>'id'$q$, adm);
  out := out || 'C4=' || got || '(bloq:22023:invalid_church) ';
  got := pg_temp.run($q$select admin_save_church(null, '=HYPERLINK("x")', 'Cidade Teste ADM05', 'SP')->>'id'$q$, adm);
  out := out || 'C5=' || got || '(bloq:22023:invalid_church) ';
  got := pg_temp.run(format($q$select admin_save_church('%s', '[Teste ADM05] Grupo', 'Cidade Teste ADM05', 'SP', 'Rua A', 'x', '2000-01-01')->>'id'$q$, g1), adm);
  out := out || 'C6=' || got || '(bloq:PT409:stale) ';
  select updated_at into ts from churches where id = g1;
  got := pg_temp.run(format($q$select admin_save_church('%s', '[Teste ADM05] Grupo', 'Cidade Teste ADM05', 'SP', 'Rua A', 'endereço', '%s')->>'address'$q$, g1, ts), adm);
  out := out || 'C7=' || replace(got, ' ', '_') || '(ok:Rua_A) ';
  out := out || 'C7b=' || (select metadata->'before'->>'address' is null and metadata->'after'->>'address' = 'Rua A'
                           from moderation_logs where target_id = g1 and action = 'edit_content' order by created_at desc limit 1) || '(true) ';
  got := pg_temp.run(format($q$select (admin_save_church('%s', '[Teste ADM05] Grupo', 'Cidade Teste ADM05', 'SP', 'Rua A')->>'id')::uuid = '%s'$q$, g1, g1), md);
  out := out || 'C8=' || got || '(ok:true) ';
  out := out || 'C8b=' || (select count(*) from moderation_logs where target_id = g1 and action = 'edit_content' and moderator_id = md) || '(1) ';

  -- ── Escrita direta (RLS + trigger)
  got := pg_temp.run(format($q$update churches set address = 'Rua M' where id = '%s'$q$, g1), md);
  out := out || 'W1=' || (select replace(address, ' ', '_') from churches where id = g1) || '(Rua_M) ';
  got := pg_temp.run(format($q$update churches set name = 'hack' where id = '%s'$q$, g1), aut);
  out := out || 'W2=' || (select name = '[Teste ADM05] Grupo' from churches where id = g1) || '(true) ';
  -- Sugestão pelo app: entra em revisão, ignora campos de moderação
  -- (sem RETURNING: a sugestão em revisão não é legível por quem sugeriu)
  got := pg_temp.run($q$insert into churches (name, city, state, status, source, is_active) values ('[Teste ADM05] Sugestão 1', 'Cidade Teste ADM05', 'sp', 'active', 'import', true)$q$, aut);
  select id into sug1 from churches where name = '[Teste ADM05] Sugestão 1';
  out := out || 'W3=' || (select status || '/' || source || '/' || is_active || '/' || state from churches where id = sug1) || '(pending_review/app/false/São_Paulo) ';
  out := replace(out, 'false/São Paulo', 'false/São_Paulo');
  got := pg_temp.run($q$insert into churches (name, city, state) values ('@cmd', 'Cidade Teste ADM05', 'SP')$q$, aut);
  out := out || 'W4=' || got || '(bloq:22023:invalid_church) ';
  got := pg_temp.run($q$insert into churches (name, city, state) values ('[Teste ADM05] Sugestão 2', 'Cidade Teste ADM05', 'SP')$q$, aut);
  select id into sug2 from churches where name = '[Teste ADM05] Sugestão 2';
  -- Compatibilidade com o painel publicado (grava is_active)
  got := pg_temp.run(format($q$update churches set is_active = false where id = '%s'$q$, g1), adm);
  out := out || 'W5=' || (select status from churches where id = g1) || '(inactive) ';
  got := pg_temp.run(format($q$update churches set is_active = true where id = '%s'$q$, g1), adm);
  out := out || 'W6=' || (select status from churches where id = g1) || '(active) ';

  -- ── Situação
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'deactivate', '  ', 'active')->>'status'$q$, g1), adm);
  out := out || 'S1=' || got || '(bloq:22023:reason_required) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'deactivate', 'fechou', 'active')->>'status'$q$, g1), adm);
  out := out || 'S2=' || got || '(ok:inactive) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'deactivate', 'fechou', 'active')->>'status'$q$, g1), adm);
  out := out || 'S3=' || got || '(bloq:PT409:stale) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'activate', null, 'inactive')->>'status'$q$, g1), adm);
  out := out || 'S4=' || got || '(ok:active) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'approve', null, 'active')->>'status'$q$, g1), adm);
  out := out || 'S5=' || got || '(bloq:22023:invalid_transition) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'approve', null, 'pending_review')->>'status'$q$, sug1), adm);
  out := out || 'S6=' || got || '(ok:active) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'reject', 'não existe', 'pending_review')->>'status'$q$, sug2), adm);
  out := out || 'S7=' || got || '(ok:rejected) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'remove', 'teste', null, false)->>'deleted_at' is not null$q$, sug1), adm);
  out := out || 'S8=' || got || '(ok:true) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'restore', null, null, true)->>'deleted_at' is null$q$, sug1), adm);
  out := out || 'S9=' || got || '(ok:true) ';
  out := out || 'S10=' || (select string_agg(action, ',' order by created_at) from moderation_logs where target_id = sug1) || '(approve,soft_delete,restore) ';

  -- ── Visibilidade pública
  insert into churches (id, name, city, state, status, source) values (ina, '[Teste ADM05] Inativa', 'Cidade Inativa ADM05', 'São Paulo', 'inactive', 'import');
  got := pg_temp.run(format($q$select count(*)::text from churches where id = '%s'$q$, ina), aut);
  out := out || 'V1=' || got || '(ok:0) ';
  got := pg_temp.run($q$select count(*)::text from get_church_cities('São Paulo') where city = 'Cidade Inativa ADM05'$q$, null, 'anon');
  out := out || 'V2=' || got || '(ok:0) ';
  got := pg_temp.run($q$select ('Cidade Inativa ADM05' = any(admin_church_cities('SP')))::text$q$, adm);
  out := out || 'V3=' || got || '(ok:true) ';
  got := pg_temp.run($q$select string_agg(name, '|' order by name) from search_churches('São Paulo', 'cidade teste adm05', 'teste adm05')$q$, null, 'anon');
  out := out || 'V4=' || replace(got, ' ', '_') || '(ok:[Teste_ADM05]_Grupo|[Teste_ADM05]_Sugestão_1) ';

  -- ── Listagem
  got := pg_temp.run($q$select (admin_list_churches('all', '[teste adm05]', null, null, null, 0, 30)->'counts')::text$q$, adm);
  js := substr(got, 4)::jsonb;
  out := out || 'L1=' || (js->>'all') || '/' || (js->>'active') || '/' || (js->>'inactive') || '/' || (js->>'archived') || '(5/3/1/1) ';
  got := pg_temp.run($q$select admin_list_churches('all', '100%', null, null, null, 0, 30)->>'total'$q$, adm);
  out := out || 'L2=' || got || '(ok:0) ';
  got := pg_temp.run($q$select admin_list_churches('xpto', null, null, null, null, 0, 30)->>'total'$q$, adm);
  out := out || 'L3=' || got || '(bloq:22023) ';
  -- Volume: sem corte em 500 (São Paulo tem milhares)
  got := pg_temp.run($q$select (admin_list_churches('active', null, 'São Paulo', null, null, 0, 30)->>'total')::int > 500
                             and jsonb_array_length(admin_list_churches('active', null, 'São Paulo', null, null, 900, 30)->'rows') = 30$q$, adm);
  out := out || 'L4=' || got || '(ok:true) ';
  got := pg_temp.run($q$select (admin_list_churches('active', null, null, null, null, 0, 1)->>'total')$q$, adm);
  out := out || 'L5=' || (substr(got, 4)::bigint = (select count(*) from churches where status = 'active' and deleted_at is null)) || '(true) ';

  -- ── Duplicadas e mesclagem
  insert into churches (id, name, city, state, status, source) values
    (g2, '[teste adm05] grupo', 'Cidade Teste ADM05', 'São Paulo', 'active', 'import'),
    (g3, '[TESTE ADM05] GRUPO', 'Cidade Teste ADM05', 'São Paulo', 'inactive', 'import');
  update profiles set church_id = g3 where id in (d1, d2);
  got := pg_temp.run($q$select admin_list_duplicate_groups('[teste adm05]', null, null, 0, 20)::text$q$, adm);
  js := substr(got, 4)::jsonb;
  out := out || 'D1=' || (js->>'total_groups') || '/' || jsonb_array_length(js->'groups'->0->'members') || '/'
         || ((js->'groups'->0->>'suggested_keep')::uuid = g3) || '(1/3/true) ';
  got := pg_temp.run(format($q$select admin_merge_churches('%s', array['%s','%s']::uuid[], 'teste')->>'moved_profiles'$q$, g1, g2, g3), adm);
  out := out || 'D2=' || got || '(ok:2) ';
  out := out || 'D2b=' || (select count(*) from profiles where id in (d1, d2) and church_id = g1) || '/'
         || (select string_agg(status || ':' || (merged_into = g1), ',' order by id) from churches where id in (g2, g3)) || '(2/inactive:true,inactive:true) ';
  got := pg_temp.run(format($q$select admin_merge_churches('%s', array['%s']::uuid[], 'de novo')->>'moved_profiles'$q$, g1, g2), adm);
  out := out || 'D3=' || got || '(bloq:PT409:stale) ';
  got := pg_temp.run(format($q$select admin_set_church_status('%s', 'activate', null, 'inactive')->>'status'$q$, g2), adm);
  out := out || 'D4=' || got || '(bloq:22023:merged) ';
  got := pg_temp.run($q$select admin_list_duplicate_groups('[teste adm05]', null, null, 0, 20)->>'total_groups'$q$, adm);
  out := out || 'D5=' || got || '(ok:0) ';
  got := pg_temp.run(format($q$select admin_unmerge_church('%s', 'errei')->>'status'$q$, g3), adm);
  out := out || 'D6=' || got || '(ok:inactive) ';
  out := out || 'D6b=' || (select count(*) from profiles where id in (d1, d2) and church_id = g3) || '(2) ';
  got := pg_temp.run(format($q$select admin_merge_churches('%s', array['%s']::uuid[], 'x')->>'moved_profiles'$q$, g1, g3), md);
  out := out || 'D7=' || got || '(ok:2) ';
  -- Resolver em lote: prévia conta, gravação respeita o limite e reduz o restante
  got := pg_temp.run($q$select admin_resolve_duplicates(null, true)::text$q$, adm);
  js := substr(got, 4)::jsonb;
  n := (js->>'groups')::bigint;
  out := out || 'D8=' || (n > 1000) || '(true) ';
  got := pg_temp.run($q$select admin_resolve_duplicates('São Paulo', false, 5)::text$q$, adm);
  js := substr(got, 4)::jsonb;
  out := out || 'D9=' || (js->>'groups') || '/' || ((js->>'churches')::int >= 5) || '(5/true) ';
  out := out || 'D9b=' || (select count(*) from moderation_logs where action = 'merge' and (metadata->>'auto')::boolean and created_at >= now()) || '(' || (js->>'churches') || ') ';

  -- ── Importação
  linhas := jsonb_build_array(
    jsonb_build_object('line', 2, 'name', '[Teste ADM05] Nova 1', 'city', 'Cidade Teste ADM05', 'state', 'SP', 'address', 'Rua 1'),
    jsonb_build_object('line', 3, 'name', '[teste adm05] nova 1', 'city', 'Cidade Teste ADM05', 'state', 'São Paulo'),
    jsonb_build_object('line', 4, 'name', '[Teste ADM05] Grupo', 'city', 'Cidade Teste ADM05', 'state', 'SP'),
    jsonb_build_object('line', 5, 'name', '=HYPERLINK("http://x")', 'city', 'Cidade Teste ADM05', 'state', 'SP'),
    jsonb_build_object('line', 6, 'name', '[Teste ADM05] Nova 2', 'city', 'Cidade Teste ADM05', 'state', 'XX'),
    jsonb_build_object('line', 7, 'name', '', 'city', 'Cidade Teste ADM05', 'state', 'SP'),
    jsonb_build_object('line', 8, 'name', '[Teste ADM05] Nova 3', 'city', 'Cidade Teste ADM05', 'state', 'parana'));
  got := pg_temp.run(format($q$select (admin_import_churches('%s'::jsonb, true) - 'rows')::text$q$, linhas), adm);
  js := substr(got, 4)::jsonb;
  out := out || 'I1=' || (js->>'ok') || '/' || (js->>'duplicates') || '/' || (js->>'errors') || '(2/2/3) ';
  out := out || 'I1b=' || (select count(*) from churches where name like '[Teste ADM05] Nova%') || '(0) ';
  got := pg_temp.run(format($q$select (admin_import_churches('%s'::jsonb, false, '%s', 'teste.csv') - 'rows')::text$q$, linhas, lote), adm);
  js := substr(got, 4)::jsonb;
  out := out || 'I2=' || (js->>'ok') || '(2) ';
  out := out || 'I2b=' || (select string_agg(source || ':' || status || ':' || (import_batch = lote) || ':' || replace(state, ' ', '_'), ',' order by name) from churches where name like '[Teste ADM05] Nova%')
         || '(import:active:true:São_Paulo,import:active:true:Paraná) ';
  out := out || 'I2c=' || (select (metadata->>'inserted') || '/' || (metadata->>'errors') from moderation_logs where target_id = lote and action = 'import') || '(2/3) ';
  got := pg_temp.run(format($q$select admin_import_churches('%s'::jsonb, false, '%s')->>'ok'$q$, linhas, gen_random_uuid()), adm);
  out := out || 'I3=' || got || '(ok:0) ';
  got := pg_temp.run(format($q$select admin_import_churches('%s'::jsonb, true)->>'ok'$q$,
           (select jsonb_agg(jsonb_build_object('line', i, 'name', 'X ' || i, 'city', 'C', 'state', 'SP')) from generate_series(1, 501) i)), adm);
  out := out || 'I4=' || got || '(bloq:22023:too_many) ';
  got := pg_temp.run(format($q$select admin_import_churches('%s'::jsonb, true)->>'ok'$q$, linhas), md);
  out := out || 'I5=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select (admin_import_churches((select jsonb_agg(jsonb_build_object('line', i, 'name', 'Paróquia Lote ' || i, 'city', 'Cidade Lote ADM05', 'state', 'MG')) from generate_series(1, 500) i), false, gen_random_uuid())->>'ok')$q$, adm);
  out := out || 'I6=' || got || '(ok:500) ';

  -- Compara no banco (a mensagem do CLI é cortada se for longa): devolve total e falhas
  select count(*), count(*) filter (where m[2] = m[3]),
         coalesce(string_agg(case when m[2] <> m[3] then m[1] || '=' || m[2] || '(' || m[3] || ')' end, ' '), '')
    into n, got, falhas
    from regexp_matches(out, '([A-Z][A-Za-z0-9]*)=([^ ]*)\(([^()]*)\) ', 'g') m;
  raise exception 'RESULTADOS>>total=% ok=% falhas: %<<', n, got, falhas;
end $$;
