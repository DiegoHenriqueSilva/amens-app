-- Bateria ADM03 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar "begin;" + migration 20261117000000 + este arquivo e executar com
--   npx --no-install supabase db query --linked -f <arquivo>
-- Saída: RESULTADOS>> ID=obtido(esperado)✅/❌ ... <<

create function pg_temp.run(p_sql text, p_uid uuid) returns text
language plpgsql as $$
declare v text; v_hint text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_sql into v;
    execute 'reset role';
    return 'ok:' || coalesce(v, 'null');
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    execute 'reset role';
    return 'bloq:' || sqlstate || case when coalesce(v_hint, '') <> '' then ':' || v_hint else '' end;
  end;
end $$;

do $$
declare
  adm uuid; aut uuid; md uuid;
  p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid(); p3 uuid := gen_random_uuid();
  out text := ''; got text; logs0 bigint;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id where ro.name = 'admin' order by ur.user_id limit 1;
  select p.id into aut from profiles p where p.deleted_at is null
     and not exists (select 1 from user_roles ur join roles ro on ro.id = ur.role_id where ur.user_id = p.id and ro.name in ('admin','moderator'))
   order by p.created_at limit 1;
  select p.id into md from profiles p where p.deleted_at is null and p.id <> aut
     and not exists (select 1 from user_roles ur join roles ro on ro.id = ur.role_id where ur.user_id = p.id and ro.name in ('admin','moderator'))
   order by p.created_at limit 1;
  insert into user_roles (user_id, role_id) select md, id from roles where name = 'moderator';
  update profiles set suspended_until = null where id = aut; -- garante autor livre

  insert into prayer_requests (id, user_id, title, content, author_name, status) values
    (p1, aut, 'Teste ADM03 um', 'Conteúdo sintético 1', 'Autor teste', 'pending_review'),
    (p2, aut, 'Teste ADM03 dois', 'Conteúdo sintético 2', 'Autor teste', 'active'),
    (p3, aut, 'Teste ADM03 tres', 'Conteúdo sintético 3 com 100% de _teste_', 'Autor teste', 'active');
  select count(*) into logs0 from moderation_logs;

  -- Permissões
  got := pg_temp.run($q$select (admin_list_prayers('all'))->>'total'$q$, aut);
  out := out || 'L1=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','approve',null)::text$q$, p1), aut);
  out := out || 'M1=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select admin_edit_prayer('%s','x','y','motivo')::text$q$, p2), aut);
  out := out || 'E0=' || got || '(bloq:42501) ';

  -- Listagem (moderador)
  got := pg_temp.run($q$select ((admin_list_prayers('pending'))->>'total')::int - (select count(*) from prayer_requests where status='pending_review' and deleted_at is null)$q$, md);
  out := out || 'L2=' || got || '(ok:0) ';
  got := pg_temp.run($q$select jsonb_array_length((admin_list_prayers('all', null, 0, 2))->'rows')$q$, md);
  out := out || 'L3=' || got || '(ok:2) ';
  got := pg_temp.run($q$select (admin_list_prayers('all', '100% de _teste_'))->>'total'$q$, md);
  out := out || 'L4=' || got || '(ok:1) ';
  got := pg_temp.run($q$select (admin_list_prayers('all', null, 0, 500))->>'total'$q$, md);
  out := out || 'L5=' || got || '(bloq:22023) ';

  -- Validações
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','violation',null)::text$q$, p1), md);
  out := out || 'M2=' || got || '(bloq:22023:reason_required) ';
  got := pg_temp.run($q$select admin_moderate_prayers((select jsonb_agg(jsonb_build_object('id', gen_random_uuid())) from generate_series(1,101)),'approve',null)::text$q$, md);
  out := out || 'M3=' || got || '(bloq:22023:too_many) ';

  -- Lote com falha parcial: p1 ok, p2 com estado visto errado (conflito), item inexistente
  got := pg_temp.run(format($q$select (select string_agg(case when (e->>'ok')::boolean then 'ok' else coalesce(e->>'hint', e->>'code') end, ',' order by ord)
        from jsonb_array_elements(admin_moderate_prayers('[{"id":"%s","status":"pending_review","deleted":false},{"id":"%s","status":"pending_review","deleted":false},{"id":"%s"}]','violation','conteúdo com dados pessoais')) with ordinality t(e, ord))$q$,
        p1, p2, gen_random_uuid()), md);
  out := out || 'M4=' || got || '(ok:ok,stale,not_found) ';
  out := out || 'M4b=' || (select status from prayer_requests where id = p2) || '(active) ';
  out := out || 'M5=' || (select count(*) from notifications where prayer_request_id = p1 and type = 'prayer_policy_violation') || '(1) ';

  -- Aprovar sem motivo; repetir não duplica aviso
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s","status":"policy_violation","deleted":false}]','approve',null)->0->>'ok'$q$, p1), md);
  out := out || 'M6=' || got || '(ok:true) ';
  out := out || 'M6b=' || (select count(*) from notifications where prayer_request_id = p1 and type = 'prayer_approved') || '(1) ';
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','approve',null)->0->>'hint'$q$, p1), md);
  out := out || 'M7=' || got || '(ok:no_change) ';
  out := out || 'M7b=' || (select count(*) from notifications where prayer_request_id = p1 and type = 'prayer_approved') || '(1) ';

  -- Revisão, remoção e restauração com aviso
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','review','denúncia a confirmar')->0->>'ok'$q$, p2), md);
  out := out || 'M8=' || got || '(ok:true) ';
  out := out || 'M8b=' || (select count(*) from notifications where prayer_request_id = p2 and type = 'prayer_in_review') || '(1) ';
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','remove','spam repetido')->0->>'ok'$q$, p2), md);
  out := out || 'M9=' || got || '(ok:true) ';
  out := out || 'M9b=' || (select string_agg(type, ',') from notifications where prayer_request_id = p2) || '(prayer_moderated) ';
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','approve',null)->0->>'hint'$q$, p2), md);
  out := out || 'M10=' || got || '(ok:removed) ';
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','restore','remoção indevida')->0->>'ok'$q$, p2), md);
  out := out || 'M11=' || got || '(ok:true) ';
  out := out || 'M11b=' || (select count(*) from notifications where prayer_request_id = p2 and type = 'prayer_restored') || '(1) ';

  -- Edição
  got := pg_temp.run(format($q$select admin_edit_prayer('%s','Novo título','Novo conteúdo','')::text$q$, p3), md);
  out := out || 'E1=' || got || '(bloq:22023:reason_required) ';
  got := pg_temp.run(format($q$select admin_edit_prayer('%s','Novo título','Novo conteúdo','telefone exposto','texto antigo diferente')::text$q$, p3), md);
  out := out || 'E2=' || got || '(bloq:PT409:stale) ';
  got := pg_temp.run(format($q$select admin_edit_prayer('%s','Novo título','Novo conteúdo','telefone exposto', (select content from prayer_requests where id='%s'))::text$q$, p3, p3), md);
  out := out || 'E3=' || got || '(ok:) ';
  out := out || 'E3b=' || (select status from prayer_requests where id = p3) || '(pending_review) ';
  out := out || 'E3c=' || (select count(*) from notifications where prayer_request_id = p3 and type = 'prayer_edit_mod') || '(1) ';
  got := pg_temp.run(format($q$select admin_edit_prayer('%s','Novo título','%s','motivo x')::text$q$, p3, repeat('a', 1001)), md);
  out := out || 'E4=' || got || '(bloq:22023:invalid_content) ';

  -- Auditoria: só sucessos geram log, com ator e motivo
  out := out || 'A1=' || (select count(*) from moderation_logs where target_id in (p1, p2, p3)) || '(6) ';
  out := out || 'A2=' || (select count(*) from moderation_logs where target_id in (p1, p2, p3) and moderator_id = md and metadata ? 'from_status') || '(6) ';
  out := out || 'A3=' || (select coalesce(reason, 'null') from moderation_logs where target_id = p1 and action = 'reject') || '(conteúdo com dados pessoais) ';
  out := out || 'A4=' || (select (metadata ->> 'previous_content') from moderation_logs where target_id = p3 and action = 'edit_content') || '(Conteúdo sintético 3 com 100% de _teste_) ';

  -- Admin também pode
  got := pg_temp.run(format($q$select admin_moderate_prayers('[{"id":"%s"}]','approve','ok após edição')->0->>'ok'$q$, p3), adm);
  out := out || 'M12=' || got || '(ok:true) ';

  raise exception 'RESULTADOS>>%<<', out;
end $$;
