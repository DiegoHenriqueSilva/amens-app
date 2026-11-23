-- Bateria ADM06 — roda a migration e os testes numa transação DESFEITA (raise no fim).
-- Uso: concatenar a migration 20261122020000 + este arquivo e executar com
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
  f1 uuid; f2 uuid := gen_random_uuid(); fa uuid := gen_random_uuid();
  out text := ''; got text; n bigint; js jsonb; falhas text; i int;
begin
  select ur.user_id into adm from user_roles ur join roles ro on ro.id = ur.role_id
    join auth.users u on u.id = ur.user_id where ro.name = 'admin' and u.email not like '%@amens.test' order by ur.user_id limit 1;
  select id into md from auth.users where email = 'adm-teste-moderador@amens.test';
  select id into aut from auth.users where email = 'adm-teste-autor@amens.test';
  select id into d1 from auth.users where email = 'adm-teste-denunciante1@amens.test';
  update profiles set suspended_until = null, deleted_at = null where id in (aut, d1);

  -- ── Migração
  out := out || 'B1=' || (select count(*) from user_feedback f where f.reply_text is not null
                          and not exists (select 1 from user_feedback_replies r where r.feedback_id = f.id)) || '(0) ';

  -- ── Envio pelo app
  got := pg_temp.run(format($q$insert into user_feedback (user_id, category, message, status, reply_text, replied_by)
           values ('%s', 'sugestao', '  [TESTE ADM06] ideia forjada  ', 'replied', 'forjado', '%s')$q$, d1, md), aut);
  select id into f1 from user_feedback where message = '[TESTE ADM06] ideia forjada';
  out := out || 'E1=' || got || '/' || coalesce((select status || '/' || coalesce(reply_text, '-') || '/' || (user_id = aut) from user_feedback where id = f1), 'nada') || '(ok:/unread/-/true) ';
  got := pg_temp.run($q$insert into user_feedback (category, message) values ('bug', 'curto')$q$, aut);
  out := out || 'E2=' || got || '(bloq:23514) ';
  got := pg_temp.run(format($q$update user_feedback set status = 'archived' where id = '%s'$q$, f1), aut);
  out := out || 'E3=' || (select status from user_feedback where id = f1) || '(unread) ';
  for i in 1..9 loop
    got := pg_temp.run(format($q$insert into user_feedback (category, message) values ('outro', '[TESTE ADM06] repetido %s')$q$, i), aut);
  end loop;
  got := pg_temp.run($q$insert into user_feedback (category, message) values ('outro', '[TESTE ADM06] décimo primeiro')$q$, aut);
  out := out || 'E4=' || got || '(bloq:22023:too_many) ';
  update profiles set suspended_until = now() + interval '1 day' where id = d1;
  got := pg_temp.run($q$insert into user_feedback (category, message) values ('outro', '[TESTE ADM06] suspenso tenta')$q$, d1);
  out := out || 'E5=' || got || '(bloq:42501:account_suspended) ';
  update profiles set suspended_until = null where id = d1;
  got := pg_temp.run($q$select count(*)::text from user_feedback$q$, aut);
  out := out || 'E6=' || got || '(ok:0) ';

  -- ── Permissões
  got := pg_temp.run($q$select admin_list_feedback('all')::text$q$, aut);
  out := out || 'P1=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select admin_list_feedback('all')::text$q$, null, 'anon');
  out := out || 'P2=' || got || '(bloq:42501) ';
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', 'oi oi', 0)::text$q$, f1), aut);
  out := out || 'P3=' || got || '(bloq:42501) ';
  got := pg_temp.run($q$select count(*)::text from user_feedback_replies$q$, aut);
  out := out || 'P4=' || got || '(ok:0) ';

  -- ── Resposta (moderador e admin)
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', '  Obrigado, anotamos a ideia.  ', 0)->>'replies'$q$, f1), md);
  out := out || 'R1=' || got || '(ok:1) ';
  out := out || 'R1b=' || (select count(*) || '/' || bool_and(type = 'feedback_reply') || '/' || bool_and(message like 'A equipe do Améns respondeu ao seu feedback "[TESTE ADM06] ideia forjada":%Obrigado, anotamos a ideia.')
                           from notifications where user_id = aut and created_at >= now()) || '(1/true/true) ';
  out := out || 'R1c=' || (select status || '/' || (replied_by = md) || '/' || (reply_text = 'Obrigado, anotamos a ideia.') from user_feedback where id = f1)
                || '/' || (select count(*) from moderation_logs where target_type = 'feedback' and target_id = f1 and action = 'reply' and moderator_id = md) || '(replied/true/true/1) ';
  -- Repetição com a contagem velha (duplo clique, outra aba): recusa e não duplica o aviso
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', 'Obrigado, anotamos a ideia.', 0)->>'replies'$q$, f1), md);
  out := out || 'R2=' || got || '/' || (select count(*) from notifications where user_id = aut and created_at >= now()) || '(bloq:PT409:stale/1) ';
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', 'Complemento: já está no planejamento.', 1)->>'replies'$q$, f1), adm);
  out := out || 'R3=' || got || '/' || (select count(*) from user_feedback_replies where feedback_id = f1) || '(ok:2/2) ';
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', '   ', 2)->>'replies'$q$, f1), md);
  out := out || 'R4=' || got || '(bloq:22023:empty) ';
  insert into user_feedback (id, user_id, category, message) values (fa, null, 'outro', '[TESTE ADM06] sem autor');
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', 'Olá', 0)->>'replies'$q$, fa), md);
  out := out || 'R5=' || got || '(bloq:22023:no_recipient) ';
  got := pg_temp.run(format($q$select admin_reply_feedback('%s', 'Olá', 0)->>'replies'$q$, gen_random_uuid()), md);
  out := out || 'R6=' || got || '(bloq:PT409:stale) ';

  -- ── Situação
  insert into user_feedback (id, user_id, category, message) values (f2, d1, 'bug', '[TESTE ADM06] botão some no celular');
  got := pg_temp.run(format($q$select admin_set_feedback_status('%s', 'read', 'unread')->>'status'$q$, f2), md);
  out := out || 'S1=' || got || '(ok:read) ';
  got := pg_temp.run(format($q$select admin_set_feedback_status('%s', 'read', 'unread')->>'status'$q$, f2), md);
  out := out || 'S2=' || got || '(bloq:PT409:stale) ';
  got := pg_temp.run(format($q$select admin_set_feedback_status('%s', 'archived', 'read')->>'status'$q$, f2), md);
  out := out || 'S3=' || got || '/' || (select count(*) from moderation_logs where target_id = f2 and action = 'archive') || '(ok:archived/1) ';
  got := pg_temp.run(format($q$select admin_set_feedback_status('%s', 'replied', 'archived')->>'status'$q$, f2), md);
  out := out || 'S4=' || got || '(bloq:22023) ';
  got := pg_temp.run(format($q$select admin_set_feedback_status('%s', 'unread', 'archived')->>'status'$q$, f2), md);
  out := out || 'S5=' || got || '/' || (select count(*) from moderation_logs where target_id = f2 and action = 'unarchive') || '(ok:unread/1) ';

  -- ── Listagem
  got := pg_temp.run($q$select admin_list_feedback('all', null, '[TESTE ADM06]', 0, 50)::text$q$, md);
  js := substr(got, 4)::jsonb;
  out := out || 'L1=' || (js->'counts'->>'all') || '/' || (js->'counts'->>'unread') || '/' || (js->'counts'->>'replied') || '(12/11/1) ';
  select x into js from jsonb_array_elements(js->'rows') x where (x->>'id')::uuid = f1;
  out := out || 'L2=' || (js->>'author_email') || '/' || jsonb_array_length(js->'replies') || '/' || (js->'replies'->1->>'body' like 'Complemento%') || '(adm-teste-autor@amens.test/2/true) ';
  got := pg_temp.run($q$select admin_list_feedback('replied', 'sugestao', 'anotamos', 0, 50)->>'total'$q$, md);
  out := out || 'L3=' || got || '(ok:1) ';
  got := pg_temp.run($q$select admin_list_feedback('all', null, '100%', 0, 50)->>'total'$q$, md);
  out := out || 'L4=' || got || '(ok:0) ';
  got := pg_temp.run($q$select admin_list_feedback('xpto')->>'total'$q$, md);
  out := out || 'L5=' || got || '(bloq:22023) ';
  -- Volume acima de 300 (o painel antigo cortava em 300)
  insert into user_feedback (user_id, category, message, created_at)
  select d1, 'outro', '[TESTE ADM06] volume ' || g, now() - (g || ' minutes')::interval from generate_series(1, 320) g;
  got := pg_temp.run($q$select (admin_list_feedback('unread', null, 'ADM06] volume', 0, 20)->>'total') || '/' ||
                             jsonb_array_length(admin_list_feedback('unread', null, 'ADM06] volume', 300, 20)->'rows')$q$, md);
  out := out || 'V1=' || got || '(ok:320/20) ';

  select count(*), count(*) filter (where m[2] = m[3]),
         coalesce(string_agg(case when m[2] <> m[3] then m[1] || '=' || m[2] || '(' || m[3] || ')' end, ' '), '')
    into n, got, falhas
    from regexp_matches(out, '([A-Z][A-Za-z0-9]*)=([^ ]*)\(([^()]*)\) ', 'g') m;
  raise exception 'RESULTADOS>>total=% ok=% falhas: %<<', n, got, falhas;
end $$;
