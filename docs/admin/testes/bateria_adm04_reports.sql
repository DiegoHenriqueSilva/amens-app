-- Bateria ADM04 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar a migration 20261118010000 + este arquivo e executar com
--   npx --no-install supabase db query --linked -f <arquivo>
-- Depois de aplicada a migration, pode rodar só este arquivo.
-- Saída: RESULTADOS>> ID=obtido(esperado) ... <<

create function pg_temp.run(p_sql text, p_uid uuid) returns text
language plpgsql as $$
declare v text; v_hint text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    -- INSERT/UPDATE/DELETE sem RETURNING não aceitam INTO
    if p_sql ~* '^s*(insert|update|delete)' and p_sql !~* 'returning' then
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
  adm uuid; md uuid; aut uuid; r1 uuid; r2 uuid; r3 uuid; alvo uuid;
  pa uuid := gen_random_uuid();  -- ativo, escalada por 3 pessoas
  pb uuid := gen_random_uuid();  -- ativo, 3 denúncias da mesma pessoa
  pc uuid := gen_random_uuid();  -- concluído, 3 pessoas
  pd uuid := gen_random_uuid();  -- violação + reabrir
  pe uuid := gen_random_uuid();  -- removido
  pf uuid := gen_random_uuid();  -- B16
  cx uuid := gen_random_uuid();  -- contribuição
  out text := ''; got text; ids uuid[]; n bigint; js jsonb; falhas text;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id where ro.name = 'admin' order by ur.user_id limit 1;
  select id into md from auth.users where email = 'adm-teste-moderador@amens.test';
  select id into aut from auth.users where email = 'adm-teste-autor@amens.test';
  -- Denunciantes e alvo: contas comuns quaisquer (só dentro desta transação)
  select array_agg(id) into ids from (
    select p.id from profiles p where p.deleted_at is null and p.id not in (md, aut)
       and not exists (select 1 from user_roles ur join roles ro on ro.id = ur.role_id where ur.user_id = p.id and ro.name in ('admin','moderator'))
     order by p.created_at limit 4) s;
  r1 := ids[1]; r2 := ids[2]; r3 := ids[3]; alvo := ids[4];
  update profiles set suspended_until = null where id in (aut, r1, r2, r3, alvo);

  insert into prayer_requests (id, user_id, title, content, author_name, status) values
    (pa, aut, '[TESTE ADM04] A', 'Conteúdo A', 'Autor', 'active'),
    (pb, aut, '[TESTE ADM04] B', 'Conteúdo B', 'Autor', 'active'),
    (pc, aut, '[TESTE ADM04] C', 'Conteúdo C', 'Autor', 'completed'),
    (pd, aut, '[TESTE ADM04] D', 'Conteúdo D', 'Autor', 'active'),
    (pf, aut, '[TESTE ADM04] F', 'Conteúdo F', 'Autor', 'active');
  insert into prayer_requests (id, user_id, title, content, author_name, status, deleted_at) values
    (pe, aut, '[TESTE ADM04] E', 'Conteúdo E', 'Autor', 'active', now());
  insert into prayer_contributions (id, user_id, target_timestamp, author_name, author_city, created_at)
    values (cx, aut, 0, 'Nome Teste', 'Cidade', now());

  -- ── Entrada
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category, status, resolution_notes, moderator_id, resolved_by)
         values ('%s','%s','spam','resolved','forjado','%s','%s')$q$, pb, r1, md, md), r1);
  out := out || coalesce('I1=' || got || '/' || (select status || '/' || coalesce(resolution_notes,'-') || '/' || coalesce(moderator_id::text,'-')
                  from prayer_reports where prayer_request_id = pb and reporter_user_id = r1) || '(ok:/open/-/-) ', '«NULO» ');
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category, status) values ('%s','%s','spam','open')$q$, pb, r1), r1);
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category, status) values ('%s','%s','fake','open')$q$, pb, r1), r1);
  select count(*) into n from prayer_reports where prayer_request_id = pb;
  out := out || coalesce('I2=' || n || '(1) ', '«NULO» ');
  out := out || coalesce('E1=' || (select status from prayer_requests where id = pb) || '(active) ', '«NULO» ');
  got := pg_temp.run(format($q$insert into prayer_reports (target_type, target_user_id, reporter_user_id, category) values ('user','%s','%s','spam')$q$, r1, r1), r1);
  out := out || coalesce('I3=' || got || '(bloq:22023:self_report) ', '«NULO» ');
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','spam')$q$, pe, r1), r1);
  out := out || coalesce('I4=' || got || '(bloq:P0002:not_found) ', '«NULO» ');
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','xyz')$q$, pa, r1), r1);
  out := out || coalesce('I5=' || got || '(bloq:23514) ', '«NULO» ');
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','other')$q$, pa, r1), r1);
  out := out || coalesce('I6=' || got || '(bloq:22023:reason_required) ', '«NULO» ');
  update profiles set suspended_until = now() + interval '1 day' where id = r3;
  got := pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','spam')$q$, pa, r3), r3);
  out := out || coalesce('I7=' || got || '(bloq:42501:account_suspended) ', '«NULO» ');
  update profiles set suspended_until = null where id = r3;
  got := pg_temp.run($q$select count(*)::text from prayer_reports$q$, r1);
  out := out || coalesce('I8a=' || got || '(ok:1) ', '«NULO» ');
  got := pg_temp.run($q$select resolution_notes from prayer_reports limit 1$q$, r1);
  -- I8b depende da migration 20261118020000 (aplicada só depois do deploy do front)
  out := out || coalesce('I8b=' || got || case when has_column_privilege('authenticated', 'public.prayer_reports', 'resolution_notes', 'select')
                 then '(ok:) ' else '(bloq:42501) ' end, '«NULO» ');

  -- ── Escalada
  perform pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','spam')$q$, pa, x), x)
    from unnest(array[r1, r2]) x;
  out := out || coalesce('E2a=' || (select status from prayer_requests where id = pa) || '(active) ', '«NULO» ');
  perform pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category, custom_reason) values ('%s','%s','other','motivo')$q$, pa, r3), r3);
  out := out || coalesce('E2b=' || (select status from prayer_requests where id = pa) || '(pending_review) ', '«NULO» ');
  out := out || coalesce('E2c=' || (select count(*) from moderation_logs where target_id = pa and action = 'auto_escalate' and moderator_id is null) || '(1) ', '«NULO» ');
  out := out || coalesce('E2d=' || (select count(*) from notifications where prayer_request_id = pa and type = 'prayer_in_review') || '(1) ', '«NULO» ');
  perform pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','spam')$q$, pc, x), x)
    from unnest(array[r1, r2, r3]) x;
  out := out || coalesce('E3=' || (select status from prayer_requests where id = pc) || '(completed) ', '«NULO» ');

  -- ── Listagem
  got := pg_temp.run($q$select admin_list_reports('open', null, 0, 50)::text$q$, r1);
  out := out || coalesce('L1=' || got || '(bloq:42501) ', '«NULO» ');
  got := pg_temp.run(format($q$select (x->>'open_people') || '/' || (x->'target'->>'auto_escalated') || '/' || (select max((r->>'person')::int) from jsonb_array_elements(x->'reports') r)::text
          from jsonb_array_elements(admin_list_reports('open', 'ADM04] A', 0, 50)->'rows') x where x->>'target_id' = '%s'$q$, pa), md);
  out := out || coalesce('L2=' || got || '(ok:3/true/3) ', '«NULO» ');
  got := pg_temp.run(format($q$select (position('%s' in admin_list_reports('all', null, 0, 100)::text) > 0)::text$q$, r1), md);
  -- L3: o id de quem denunciou não sai do banco
  out := out || coalesce('L3=' || got || '(ok:false) ', '«NULO» ');
  got := pg_temp.run($q$select ((admin_list_reports('open', null, 0, 1)->'counts'->>'open')::int = (select count(distinct (target_type, coalesce(prayer_request_id, target_contribution_id, target_user_id))) from prayer_reports where status='open' and deleted_at is null))::text$q$, md);
  out := out || coalesce('L4=' || got || '(ok:true) ', '«NULO» ');

  -- ── Decisão: sem fundamento no pedido escalado
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','dismiss')::text$q$, pa), r1);
  out := out || coalesce('D0=' || got || '(bloq:42501) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','suspend','motivo x')::text$q$, pa), md);
  out := out || coalesce('D1=' || got || '(bloq:22023:invalid_action) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','dismiss', null, array['%s']::uuid[])::text$q$, pa, gen_random_uuid()), md);
  out := out || coalesce('D2=' || got || '(bloq:PT409:stale) ', '«NULO» ');
  got := pg_temp.run(format($q$select (admin_decide_reports('prayer_request','%s','dismiss')->>'auto_restored')$q$, pa), md);
  out := out || coalesce('D3=' || got || '(ok:true) ', '«NULO» ');
  out := out || coalesce('D3b=' || (select status from prayer_requests where id = pa) || '(active) ', '«NULO» ');
  out := out || coalesce('D3c=' || (select count(*) from prayer_reports where prayer_request_id = pa and status = 'dismissed' and decision = 'dismiss') || '(3) ', '«NULO» ');
  out := out || coalesce('D3d=' || (select count(*) from notifications where type = 'report_feedback' and user_id in (r1, r2, r3) and message like 'Analisamos sua denúncia com cuidado%') || '(3) ', '«NULO» ');
  out := out || coalesce('D3e=' || (select count(*) from notifications where prayer_request_id = pa and type = 'prayer_approved') || '(1) ', '«NULO» ');
  out := out || coalesce('D3f=' || (select count(*) from moderation_logs where action = 'dismiss_report' and metadata->>'target_id' = pa::text) || '(3) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','dismiss')::text$q$, pa), md);
  out := out || coalesce('D4=' || got || '(bloq:PT409:stale) ', '«NULO» ');

  -- ── Violação + reabrir e reverter
  perform pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','hate')$q$, pd, x), x)
    from unnest(array[r1, r2]) x;
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','violation')::text$q$, pd), md);
  out := out || coalesce('D5=' || got || '(bloq:22023:reason_required) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','violation','discurso de ódio')->>'reports'$q$, pd), md);
  out := out || coalesce('D6=' || got || '(ok:2) ', '«NULO» ');
  out := out || coalesce('D6b=' || (select status from prayer_requests where id = pd) || '(policy_violation) ', '«NULO» ');
  out := out || coalesce('D6c=' || (select count(*) from notifications where prayer_request_id = pd and user_id = aut) || '(1) ', '«NULO» ');
  out := out || coalesce('D6d=' || (select count(*) from moderation_logs where target_id = pd and action = 'reject') || '(1) ', '«NULO» ');
  select array_agg(id) into ids from prayer_reports where prayer_request_id = pd;
  got := pg_temp.run(format($q$select admin_reopen_reports('prayer_request','%s','%s'::uuid[],'revisão da decisão')->>'reverted'$q$, pd, ids), md);
  out := out || coalesce('R1=' || got || '(ok:true) ', '«NULO» ');
  out := out || coalesce('R1b=' || (select status from prayer_requests where id = pd) || '/' || (select count(*) from prayer_reports where prayer_request_id = pd and status = 'open') || '(active/2) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_reopen_reports('prayer_request','%s','%s'::uuid[],'de novo')::text$q$, pd, ids), md);
  out := out || coalesce('R2=' || got || '(bloq:PT409:stale) ', '«NULO» ');

  -- ── Edição com texto desatualizado
  got := pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','edit','telefone exposto',null,null,'T','Novo','texto antigo')::text$q$, pd), md);
  out := out || coalesce('D7=' || got || '(bloq:PT409:stale) ', '«NULO» ');

  -- ── B16: aprovar na ADM03 reabre denúncias decididas como violação
  perform pg_temp.run(format($q$insert into prayer_reports (prayer_request_id, reporter_user_id, category) values ('%s','%s','spam')$q$, pf, r1), r1);
  perform pg_temp.run(format($q$select admin_decide_reports('prayer_request','%s','violation','spam reincidente')::text$q$, pf), md);
  got := pg_temp.run(format($q$select (admin_moderate_prayers('[{"id":"%s"}]'::jsonb,'approve') -> 0 ->> 'ok')$q$, pf), md);
  out := out || coalesce('B16a=' || got || '(ok:true) ', '«NULO» ');
  out := out || coalesce('B16=' || (select string_agg(status || ':' || coalesce(decision, '-'), ',') from prayer_reports where prayer_request_id = pf) || '(open:-) ', '«NULO» ');

  -- ── Contribuição
  perform pg_temp.run(format($q$insert into prayer_reports (target_type, target_contribution_id, reporter_user_id, category) values ('contribution','%s','%s','inappropriate')$q$, cx, r2), r2);
  got := pg_temp.run(format($q$select admin_decide_reports('contribution','%s','remove','nome ofensivo')->>'reports'$q$, cx), md);
  out := out || coalesce('D8=' || got || '(ok:1) ', '«NULO» ');
  out := out || coalesce('D8b=' || ((select deleted_at from prayer_contributions where id = cx) is not null)::text
                || '/' || (select count(*) from notifications where user_id = aut and type = 'contribution_removed' and created_at >= now()) || '(true/1) ', '«NULO» ');
  select array_agg(id) into ids from prayer_reports where target_contribution_id = cx;
  perform pg_temp.run(format($q$select admin_reopen_reports('contribution','%s','%s'::uuid[],'nome era aceitável')::text$q$, cx, ids), md);
  out := out || coalesce('R3=' || ((select deleted_at from prayer_contributions where id = cx) is null)::text || '(true) ', '«NULO» ');

  -- ── Pessoa: suspender pela ADM02 e reverter
  perform pg_temp.run(format($q$insert into prayer_reports (target_type, target_user_id, reporter_user_id, category) values ('user','%s','%s','harassment')$q$, alvo, r1), r1);
  perform pg_temp.run(format($q$insert into prayer_reports (target_type, target_user_id, reporter_user_id, category) values ('message','%s','%s','harassment')$q$, alvo, r2), r2);
  got := pg_temp.run(format($q$select admin_decide_reports('user','%s','suspend','assédio',null,500)::text$q$, alvo), md);
  out := out || coalesce('D9=' || got || '(bloq:22023:invalid_days) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_decide_reports('user','%s','suspend','assédio',null,3)->>'reports'$q$, alvo), md);
  out := out || coalesce('D10=' || got || '/' || ((select suspended_until from profiles where id = alvo) > now())::text
                || '/' || (select status from prayer_reports where target_type = 'message' and target_user_id = alvo) || '(ok:1/true/open) ', '«NULO» ');
  select array_agg(id) into ids from prayer_reports where target_type = 'user' and target_user_id = alvo;
  perform pg_temp.run(format($q$select admin_reopen_reports('user','%s','%s'::uuid[],'suspensão indevida')::text$q$, alvo, ids), md);
  out := out || coalesce('R4=' || ((select suspended_until from profiles where id = alvo) is null)::text || '(true) ', '«NULO» ');

  -- ── Excluir denúncia
  select id into cx from prayer_reports where target_type = 'message' and target_user_id = alvo;
  got := pg_temp.run(format($q$select admin_delete_report('%s','duplicada')::text$q$, cx), md);
  out := out || coalesce('X1=' || got || '(bloq:42501) ', '«NULO» ');
  got := pg_temp.run(format($q$select admin_delete_report('%s','duplicada')::text$q$, cx), adm);
  out := out || coalesce('X2=' || got || '(ok:) ', '«NULO» ');

  -- ── Volume (T04): 210 alvos com denúncia aberta, paginados no servidor
  insert into prayer_requests (id, user_id, title, content, author_name, status)
    select gen_random_uuid(), aut, '[TESTE ADM04] volume ' || g, 'x', 'Autor', 'active' from generate_series(1, 210) g;
  insert into prayer_reports (prayer_request_id, reporter_user_id, category, status)
    select id, r1, 'spam', 'open' from prayer_requests where title like '[TESTE ADM04] volume %';
  got := pg_temp.run($q$select (admin_list_reports('open', 'ADM04] volume', 0, 50)->>'total') || '/' ||
                               jsonb_array_length(admin_list_reports('open', 'ADM04] volume', 0, 50)->'rows') || '/' ||
                               jsonb_array_length(admin_list_reports('open', 'ADM04] volume', 200, 50)->'rows')$q$, md);
  out := out || coalesce('V1=' || got || '(ok:210/50/10) ', '«NULO» ');
  got := pg_temp.run($q$select admin_list_reports('open', null, 0, 101)::text$q$, md);
  out := out || coalesce('V2=' || got || '(bloq:22023) ', '«NULO» ');

  -- ── B13
  out := out || coalesce('B13=' || (select count(*) from prayer_reports where status not in ('open','resolved','dismissed')) || '/'
                || (select column_default from information_schema.columns where table_name = 'prayer_reports' and column_name = 'status') || '(0/''open''::text) ', '«NULO» ');

  -- Compara no banco (a mensagem do CLI é cortada se for longa): devolve total e falhas
  select count(*), count(*) filter (where m[2] = m[3]),
         coalesce(string_agg(case when m[2] <> m[3] then m[1] || '=' || m[2] || '(' || m[3] || ')' end, ' '), '')
    into n, got, falhas
    from regexp_matches(out, '([A-Z][A-Za-z0-9]*)=([^ ]*)\(([^()]*)\) ', 'g') m;
  raise exception 'RESULTADOS>>total=% ok=% falhas: %<<', n, got, falhas;
end $$;
