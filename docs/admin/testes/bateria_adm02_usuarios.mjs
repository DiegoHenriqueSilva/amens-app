// Bateria ADM02 (usuários) — gera um bloco DO que roda TUDO numa transação
// desfeita no final (raise exception). Nenhum dado fica gravado.
// Uso:
//   ADM=<admin> ADM2=<outro admin> COM=<comum> ALVO=<comum alvo> MOD=<comum que vira moderador só no teste> \
//   node bateria_adm02_usuarios.mjs <pasta_saida> > adm02.sql
//   npx supabase db query --linked -f adm02.sql
import fs from 'node:fs';

const { ADM, ADM2, COM, ALVO, MOD } = process.env;
if (![ADM, ADM2, COM, ALVO, MOD].every(Boolean)) { console.error('Defina ADM, ADM2, COM, ALVO e MOD'); process.exit(1); }

const as = id => `execute 'reset role'; perform set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated"}',true); execute 'set local role authenticated';`;
const pg = `execute 'reset role';`;
const T = [];
const t = (id, nome, esp, stmt) => { T.push({ id, nome, esp }); return `
  begin ${stmt}; get diagnostics n = row_count; r := r || ('${id}='||'ok:'||n);
  exception when others then get stacked diagnostics h = pg_exception_hint; r := r || ('${id}='||'bloq:'||sqlstate||coalesce(':'||nullif(h,''),'')); end;`; };
const v = (id, nome, esp, expr) => { T.push({ id, nome, esp }); return `
  begin r := r || ('${id}='||coalesce((${expr})::text,'null'));
  exception when others then r := r || ('${id}='||'bloq:'||sqlstate); end;`; };

const sql = `do $$ declare r text[] := '{}'; n int; h text; q0 int; snap text; begin
  ${pg}
  insert into public.user_roles(user_id, role_id) select '${MOD}', id from public.roles where name='moderator';
  select md5(string_agg(id::text||coalesce(suspended_until::text,'')||coalesce(deleted_at::text,''), ',' order by id)) into snap from public.profiles where id <> '${ALVO}';

  -- ===== T02 papéis e negação =====
  ${as(COM)}
  ${t('T02a', 'comum chama comando de papel', 'bloq:42501', `perform public.admin_set_user_role('${COM}','admin','teste')`)}
  ${t('T02b', 'comum se insere como admin direto', 'bloq:42501', `insert into public.user_roles(user_id,role_id) select '${COM}', id from public.roles where name='admin'`)}
  ${t('T02c', 'comum suspende alguém', 'bloq:42501', `perform public.admin_suspend_user('${ALVO}',3,'teste')`)}
  ${as(MOD)}
  ${t('T02d', 'moderador muda papel', 'bloq:42501', `perform public.admin_set_user_role('${ALVO}','moderator','teste')`)}
  ${t('T02e', 'moderador remove conta', 'bloq:42501', `perform public.admin_set_user_removed('${ALVO}',true,'teste')`)}
  ${t('T02f', 'moderador ajusta XP', 'bloq:42501', `perform public.admin_set_user_xp('${ALVO}',100,'teste')`)}
  ${as(ADM)}
  ${t('T02g', 'admin muda o próprio papel', 'bloq:42501:self_action', `perform public.admin_set_user_role('${ADM}','user','teste')`)}
  ${t('T02h', 'admin muda o próprio papel direto', 'bloq:42501:self_action', `delete from public.user_roles where user_id='${ADM}'`)}
  ${t('T02i', 'admin promove alvo a moderador', 'ok:1', `perform public.admin_set_user_role('${ALVO}','moderator','teste ADM02')`)}
  ${v('T02j', 'papel do alvo depois', 'moderator', `(select r.name from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id='${ALVO}')`)}
  ${t('T02k', 'admin devolve alvo a usuário', 'ok:1', `perform public.admin_set_user_role('${ALVO}','user','teste ADM02')`)}
  ${v('T02l', 'alvo sem papel', '0', `(select count(*) from public.user_roles where user_id='${ALVO}')`)}
  ${t('T02m', 'papel inválido', 'bloq:22023', `perform public.admin_set_user_role('${ALVO}','superadmin','teste')`)}
  ${t('T02n', 'sem motivo', 'bloq:22023:reason_required', `perform public.admin_set_user_role('${ALVO}','moderator','  ')`)}
  ${t('T02o', 'usuário inexistente', 'bloq:P0002', `perform public.admin_suspend_user(gen_random_uuid(),3,'teste')`)}
  ${pg}
  delete from public.user_roles ur using public.roles ro where ro.id=ur.role_id and ro.name='admin' and ur.user_id not in ('${ADM}','${ADM2}');
  delete from public.user_roles ur using public.roles ro where ro.id=ur.role_id and ro.name='admin' and ur.user_id = '${ADM2}';
  ${t('T02p', 'remover o último admin', 'bloq:42501:last_admin', `delete from public.user_roles where user_id='${ADM}'`)}
  insert into public.user_roles(user_id, role_id) select '${ADM2}', id from public.roles where name='admin';

  -- ===== T03 suspensão real (e T01 alvo correto) =====
  ${as(ADM)}
  ${t('T03a', 'duração 0 dias', 'bloq:22023:invalid_days', `perform public.admin_suspend_user('${ALVO}',0,'teste')`)}
  ${t('T03b', 'duração 400 dias', 'bloq:22023:invalid_days', `perform public.admin_suspend_user('${ALVO}',400,'teste')`)}
  ${t('T03c', 'admin suspende a si mesmo', 'bloq:42501:self_action', `perform public.admin_suspend_user('${ADM}',3,'teste')`)}
  ${t('T03d', 'admin suspende a si mesmo direto', 'bloq:42501:self_action', `update public.profiles set suspended_until=now()+interval '1 day' where id='${ADM}'`)}
  ${t('T03e', 'admin suspende alvo por 3 dias', 'ok:1', `perform public.admin_suspend_user('${ALVO}',3,'teste ADM02')`)}
  ${pg}
  ${v('T01a', 'só o alvo mudou (outros perfis intactos)', 'true', `(select md5(string_agg(id::text||coalesce(suspended_until::text,'')||coalesce(deleted_at::text,''), ',' order by id)) from public.profiles where id <> '${ALVO}') = snap`)}
  ${v('T01b', 'alvo suspenso por ~3 dias', 'true', `(select suspended_until between now()+interval '2 days 23 hours' and now()+interval '3 days 1 hour' from public.profiles where id='${ALVO}')`)}
  ${as(ALVO)}
  ${v('T03f', 'alvo recebe estado restrito', 'true', `(public.my_account_status()->>'restricted')::boolean`)}
  ${t('T03g', 'suspenso cria pedido', 'bloq:42501:account_suspended', `insert into public.prayer_requests(content,user_id) values('ADM02 teste','${ALVO}')`)}
  ${t('T03h', 'suspenso reage', 'bloq:42501:account_suspended', `insert into public.prayer_reactions(prayer_request_id,reactor_user_id,reaction_type) select id,'${ALVO}','pray' from public.prayer_requests where status='active' and deleted_at is null limit 1`)}
  ${t('T03i', 'suspenso intercede', 'bloq:42501:account_suspended', `insert into public.prayer_intercessions(prayer_request_id,user_id) select id,'${ALVO}' from public.prayer_requests where status='active' and deleted_at is null limit 1`)}
  ${t('T03j', 'suspenso convida amigo', 'bloq:42501:account_suspended', `insert into public.friend_requests(sender_id,receiver_id) values('${ALVO}','${COM}')`)}
  ${t('T03k', 'suspenso envia notificação', 'bloq:42501:account_suspended', `insert into public.notifications(user_id,message) values('${COM}','ADM02')`)}
  ${t('T03l', 'suspenso entra na corrente (RPC)', 'bloq:42501:account_suspended', `perform public.join_prayer_chain((extract(epoch from now())*1000)::bigint,'ADM02','X')`)}
  ${v('T03m', 'suspenso continua lendo', 'true', `(select count(*) > 0 from public.prayer_requests)`)}
  ${as(ADM)}
  ${t('T03n', 'admin retira a suspensão', 'ok:1', `perform public.admin_unsuspend_user('${ALVO}','teste ADM02')`)}
  ${as(ALVO)}
  ${t('T03o', 'liberado interage de novo', 'ok:1', `insert into public.notifications(user_id,message) values('${COM}','ADM02')`)}
  ${as(ADM)}
  ${t('T03p', 'admin remove (bane) o alvo', 'ok:1', `perform public.admin_set_user_removed('${ALVO}',true,'teste ADM02')`)}
  ${t('T03q', 'admin remove outro admin', 'bloq:42501:target_is_admin', `perform public.admin_set_user_removed('${ADM2}',true,'teste')`)}
  ${as(ALVO)}
  ${t('T03r', 'banido interage', 'bloq:42501:account_removed', `insert into public.notifications(user_id,message) values('${COM}','ADM02')`)}
  ${as(ADM)}
  ${t('T03s', 'admin restaura o alvo', 'ok:1', `perform public.admin_set_user_removed('${ALVO}',false,'teste ADM02')`)}
  ${as(ALVO)}
  ${t('T03t', 'restaurado interage de novo', 'ok:1', `insert into public.notifications(user_id,message) values('${COM}','ADM02')`)}

  -- ===== T04 ajustes de XP e cota =====
  ${pg}
  q0 := public.prayer_daily_allowance('${ALVO}');
  ${as(ADM)}
  ${t('T04a', 'XP negativo', 'bloq:22023:invalid_xp', `perform public.admin_set_user_xp('${ALVO}',-5,'teste')`)}
  ${t('T04b', 'XP acima do teto', 'bloq:22023:invalid_xp', `perform public.admin_set_user_xp('${ALVO}',20000000,'teste')`)}
  ${t('T04c', 'XP 1.000.000 válido', 'ok:1', `perform public.admin_set_user_xp('${ALVO}',1000000,'teste ADM02')`)}
  ${pg}
  ${v('T04d', 'XP gravado', '1000000', `(select total_xp from public.user_xp where user_id='${ALVO}')`)}
  ${pg}
  ${v('T04e', 'cota diária subiu com o nível', 'true', `public.prayer_daily_allowance('${ALVO}') > q0`)}
  ${as(ADM)}
  ${t('T04f', 'multiplicador 0', 'bloq:22023:invalid_multiplier', `perform public.admin_set_xp_multiplier('${ALVO}',0,'teste')`)}
  ${t('T04g', 'multiplicador 11', 'bloq:22023:invalid_multiplier', `perform public.admin_set_xp_multiplier('${ALVO}',11,'teste')`)}
  ${t('T04h', 'multiplicador 2,5 válido', 'ok:1', `perform public.admin_set_xp_multiplier('${ALVO}',2.5,'teste ADM02')`)}
  ${v('T04i', 'multiplicador gravado', '2.5', `(select xp_multiplier from public.user_xp_overrides where user_id='${ALVO}')`)}

  -- ===== T05 auditoria e falha sem efeito =====
  ${pg}
  ${v('T05a', 'logs dos 8 comandos válidos (ator, alvo, motivo)', '8', `(select count(*) from public.moderation_logs where target_id='${ALVO}' and reason='teste ADM02' and moderator_id='${ADM}')`)}
  ${v('T05b', 'log de papel guarda de/para', 'true', `(select metadata = '{"from":"user","to":"moderator"}'::jsonb from public.moderation_logs where target_id='${ALVO}' and action='role_assign' and reason='teste ADM02' and metadata->>'to'='moderator')`)}
  ${v('T05c', 'comandos recusados não geraram log', '0', `(select count(*) from public.moderation_logs where reason in ('teste','  ') and created_at >= now())`)}

  -- A mensagem de erro tem tamanho máximo: PARTE=1 devolve os 30 primeiros, PARTE=2 o restante.
  raise exception 'RESULTADOS>>%<<', array_to_string(case when '${process.env.PARTE ?? 1}' = '1' then r[1:30] else r[31:] end, ',');
end $$;`;

process.stdout.write(sql);
if (process.argv[2]) fs.writeFileSync(process.argv[2] + '/adm02_cat.json', JSON.stringify(T));
