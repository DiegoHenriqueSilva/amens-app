-- Dados de teste da fase 5 (ADM05): um grupo duplicado com 1 perfil ligado (conta de teste denunciante1).
-- Rodar antes de fase5_igrejas.cjs. Limpeza: limpa_adm05.sql.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
begin
  insert into public.churches (id, name, city, state, status, source, address) values
    (a, '[Teste ADM05] Grupo Tela', 'Cidade Teste ADM05', 'São Paulo', 'active', 'import', 'Praça do Teste, s/n'),
    (b, '[teste adm05] grupo tela', 'Cidade Teste ADM05', 'São Paulo', 'active', 'app', null);
  update public.profiles set church_id = b
  where id = (select id from auth.users where email = 'adm-teste-denunciante1@amens.test');
end $$;
