-- Limpa os dados de teste da ADM04 (contas adm-teste-*): denúncias, pedido, participação, avisos e logs.
begin;
create temp table t_users as select id from auth.users where email like 'adm-teste-%@amens.test';
create temp table t_pr as select id from prayer_requests where title like '[TESTE ADM04]%';
create temp table t_ct as select id from prayer_contributions where user_id in (select id from t_users);
create temp table t_rep as select id from prayer_reports where reporter_user_id in (select id from t_users)
   or prayer_request_id in (select id from t_pr) or target_contribution_id in (select id from t_ct);
delete from moderation_logs where target_id in (select id from t_rep) or target_id in (select id from t_pr)
   or target_id in (select id from t_ct)
   or (moderator_id in (select id from t_users) and target_id in (select id from t_users));
delete from notifications where user_id in (select id from t_users) or prayer_request_id in (select id from t_pr);
delete from prayer_reports where id in (select id from t_rep);
delete from prayer_contributions where id in (select id from t_ct);
delete from prayer_requests where id in (select id from t_pr);
update profiles set suspended_until = null where id in (select id from t_users);
commit;
select json_build_object('reports_teste',(select count(*) from prayer_reports where reporter_user_id in (select id from auth.users where email like 'adm-teste-%')),
 'logs_mod_teste',(select count(*) from moderation_logs where moderator_id in (select id from auth.users where email like 'adm-teste-%')),
 'pedidos_teste',(select count(*) from prayer_requests where title like '[TESTE%'),
 'avisos_teste',(select count(*) from notifications where user_id in (select id from auth.users where email like 'adm-teste-%')),
 'reports_total',(select count(*) from prayer_reports), 'pedidos',(select count(*) from prayer_requests));
