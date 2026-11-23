-- Limpeza da fase 8 (ADM08). Só toca em registros "[TESTE ADM08]" e na suspensão de teste.
delete from public.moderation_logs where reason like '[TESTE ADM08]%';
delete from public.prayer_requests where title like '[TESTE ADM08]%';
update public.profiles set suspended_until = null
where id = (select id from auth.users where email = 'adm-teste-denunciante1@amens.test');
select (select count(*) from public.moderation_logs where reason like '[TESTE ADM08]%') as logs_restantes;
