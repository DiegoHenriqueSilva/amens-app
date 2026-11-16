// Bateria de permissões ADM00 — gera um bloco DO que roda TUDO numa transação
// desfeita no final (raise exception). Nenhum dado fica gravado.
// Uso:
//   MOD=<uuid comum que vira moderador só no teste> COM=<uuid comum> DONO=<uuid dono do pedido>
//   ADM=<uuid admin> PED=<uuid pedido ativo do DONO> node bateria_permissoes.mjs <pasta_saida> > bateria.sql
//   npx supabase db query --linked -f bateria.sql
const { MOD, COM, DONO, ADM, PED } = process.env;
if (![MOD, COM, DONO, ADM, PED].every(Boolean)) { console.error("Defina MOD, COM, DONO, ADM e PED"); process.exit(1); }
const as = id => `execute 'reset role'; perform set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated"}',true); execute 'set local role authenticated';`;
const asPg = `execute 'reset role';`;
const t = (id, esperado, stmt) => `
  begin ${stmt}; get diagnostics n = row_count; r := r || ('${id.split(' ')[0]}='||'ok:'||n);
  exception when others then r := r || ('${id.split(' ')[0]}='||'bloq:'||sqlstate); end;`;
const c = (id, esperado, query) => `
  begin select count(*) into n from (${query}) x; r := r || ('${id.split(' ')[0]}='||'linhas:'||n);
  exception when others then r := r || ('${id.split(' ')[0]}='||'bloq:'||sqlstate); end;`;
const sql = `do $$ declare r text[] := '{}'; n int; begin
  ${asPg}
  insert into public.user_roles(user_id, role_id) select '${MOD}', id from public.roles where name='moderator';

  -- ===== MODERADOR =====
  ${as(MOD)}
  ${c('M01 le feedback','linhas', 'select 1 from public.user_feedback')}
  ${c('M02 e-mails get_users_admin (S6)','linhas', 'select * from public.get_users_admin()')}
  ${t('M03 modera pedido alheio','ok:1', `update public.prayer_requests set status=status where id='${PED}'`)}
  ${t('M04 notificacao system','ok:1', `insert into public.notifications(user_id,message,type) values('${COM}','ADM00','system')`)}
  ${t('M05 cria igreja ativa (S3)','ok:1', `insert into public.churches(name,status,source) values('ADM00 TESTE','active','app')`)}
  ${t('M06 edita igreja (S3)','ok:1', `update public.churches set name='ADM00 TESTE 2' where name='ADM00 TESTE'`)}
  ${t('M07 suspende outro perfil (S4)','ok:1', `update public.profiles set suspended_until=now()+interval '1 day' where id='${COM}'`)}
  ${t('M08 edita nome de outro perfil (S4)','bloq', `update public.profiles set full_name='hack' where id='${COM}'`)}
  ${t('M09 edita o proprio nome','ok:1', `update public.profiles set full_name=full_name where id='${MOD}'`)}
  ${t('M10 ajuste de XP (S9)','bloq', `insert into public.user_xp_overrides(user_id) values('${COM}')`)}
  ${t('M11 altera configuracoes','ok:0', `update public.app_settings set value=value`)}
  ${t('M12 se promove a admin','bloq', `insert into public.user_roles(user_id,role_id) select '${MOD}', id from public.roles where name='admin'`)}
  ${t('M13 reconhecimento de apoiador','bloq', `perform public.admin_supporter('${COM}'::uuid, true)`)}
  ${t('M14 registra log de moderacao','ok:1', `insert into public.moderation_logs(moderator_id,action,target_type,target_id) values('${MOD}','test','prayer_request','${PED}')`)}

  -- ===== COMUM =====
  ${as(COM)}
  ${c('C01 le feedback','linhas:0', 'select 1 from public.user_feedback')}
  ${t('C02 e-mails get_users_admin','bloq', 'perform * from public.get_users_admin()')}
  ${t('C03 altera pedido alheio (S1)','ok:0', `update public.prayer_requests set status='banned' where id='${PED}'`)}
  ${t('C04 notificacao system (S2)','bloq', `insert into public.notifications(user_id,message,type) values('${MOD}','ADM00','system')`)}
  ${t('C05 notificacao comum','ok:1', `insert into public.notifications(user_id,message) values('${MOD}','ADM00')`)}
  ${t('C06 cria igreja ativa','bloq', `insert into public.churches(name,status,source) values('ADM00 C','active','app')`)}
  ${t('C07 sugere igreja','ok:1', `insert into public.churches(name,status,source) values('ADM00 C','pending_review','app')`)}
  ${t('C08 tira a propria suspensao (S8)','bloq', `update public.profiles set suspended_until=null where id='${COM}'`)}
  ${t('C09 edita o proprio nome','ok:1', `update public.profiles set full_name=full_name where id='${COM}'`)}
  ${t('C10 ajuste de XP','bloq', `insert into public.user_xp_overrides(user_id) values('${COM}')`)}
  ${t('C11 se promove a moderador','bloq', `insert into public.user_roles(user_id,role_id) select '${COM}', id from public.roles where name='moderator'`)}

  -- ===== DONO DO PEDIDO (S7) =====
  ${asPg}
  update public.prayer_requests set status='banned' where id='${PED}';
  ${as(DONO)}
  ${t('D01 reativa pedido banido (S7)','bloq', `update public.prayer_requests set status='active' where id='${PED}'`)}
  ${asPg}
  update public.prayer_requests set status='active', deleted_at=now() where id='${PED}';
  ${as(DONO)}
  ${t('D02 restaura pedido removido (S7)','ok:0', `update public.prayer_requests set deleted_at=null where id='${PED}'`)}
  ${asPg}
  update public.prayer_requests set deleted_at=null where id='${PED}';
  ${as(DONO)}
  ${t('D03 conclui o proprio pedido','ok:1', `update public.prayer_requests set status='completed' where id='${PED}'`)}
  ${t('D04 reabre o proprio pedido','ok:1', `update public.prayer_requests set status='active' where id='${PED}'`)}

  -- ===== ADMIN =====
  ${as(ADM)}
  ${c('A01 e-mails get_users_admin','linhas', 'select * from public.get_users_admin()')}
  ${t('A02 ajuste de XP (S9)','ok:1', `insert into public.user_xp_overrides(user_id) values('${COM}')`)}
  ${t('A03 edita nome de outro perfil','ok:1', `update public.profiles set full_name=full_name where id='${COM}'`)}
  ${t('A04 altera configuracoes','ok:2+', `update public.app_settings set value=value`)}

  ${asPg}
  raise exception 'RESULTADOS>>%<<', array_to_string(r, ',');
end $$;`;
process.stdout.write(sql);
// catálogo para o relatório
import fs from 'node:fs';
const src = fs.readFileSync(new URL(import.meta.url), 'utf8');
const cat = [...src.matchAll(/[tc]\('([A-Z]\d\d [^']+)','([^']+)'/g)].map(m => ({ id: m[1].split(' ')[0], nome: m[1].slice(4), esp: m[2] }));
fs.writeFileSync(process.argv[2] + '/catalogo.json', JSON.stringify(cat));
