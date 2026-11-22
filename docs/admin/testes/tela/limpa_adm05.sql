-- Limpeza dos dados de teste da ADM05 (fase 5 e semeia_adm05.sql). Só toca em "[Teste ADM05]" / "Cidade Teste ADM05".
do $$
declare
  ids uuid[];
begin
  select array_agg(id) into ids from public.churches
  where city = 'Cidade Teste ADM05' or name ilike '[teste adm05]%';
  update public.profiles set church_id = null where church_id = any(ids);
  update public.churches set merged_into = null where merged_into = any(ids) or id = any(ids);
  delete from public.moderation_logs where target_type = 'church' and (target_id = any(ids)
    or (action = 'import' and metadata->>'file' in ('igrejas_teste_adm05.csv')));
  delete from public.churches where id = any(ids);
end $$;
select count(*) as restantes from public.churches where city = 'Cidade Teste ADM05' or name ilike '[teste adm05]%';
