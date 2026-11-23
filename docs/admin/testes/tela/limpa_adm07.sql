-- Limpeza da fase 7 (ADM07): devolve o XP que as contas de teste ganharam e apaga os registros de teste.
-- Os valores de configuração já são restaurados pelo próprio roteiro (multiplicador 1,0 e limite 3).
do $$
declare
  ids uuid[];
begin
  select array_agg(id) into ids from auth.users where email like 'adm-teste-%@amens.test';
  update public.user_xp x set total_xp = greatest(0, x.total_xp - e.soma),
    reactions_sent = greatest(0, x.reactions_sent - e.reacts), prayers_given = greatest(0, x.prayers_given - e.prays)
  from (select user_id, sum(amount) soma, count(*) filter (where action = 'react') reacts, count(*) filter (where action = 'pray') prays
        from public.xp_events where user_id = any(ids) group by user_id) e
  where x.user_id = e.user_id;
  delete from public.xp_events where user_id = any(ids);
  delete from public.moderation_logs where action = 'setting_update' and moderator_id = any(ids);
end $$;
select json_build_object(
  'settings', (select json_object_agg(key, value) from public.app_settings),
  'eventos_teste', (select count(*) from public.xp_events e join auth.users u on u.id = e.user_id where u.email like 'adm-teste-%@amens.test')) r;
