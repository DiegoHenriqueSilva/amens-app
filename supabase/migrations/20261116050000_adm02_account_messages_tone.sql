-- ADM02 — revisão de conteúdo (regra content-review-enforcement):
-- mesmas regras de bloqueio da 20261116040000, só o texto das mensagens muda
-- para um tom acolhedor, sem culpa, conforme context-content-guidelines.
create or replace function public.enforce_account_not_restricted()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz;
  v_removed boolean;
begin
  -- Sem usuário (service_role, cron, webhook) ou moderação agindo: não se aplica.
  if v_uid is null or public.is_moderator_or_admin() then
    return new;
  end if;
  -- Em UPDATE de pedido, só a edição feita pelo próprio dono é interação dele
  -- (ex.: a escalada automática de reports atualiza o pedido em nome do denunciante).
  -- (IF aninhado: o PL/pgSQL não garante curto-circuito no AND, e tabelas como
  --  prayer_reactions/friend_requests não têm a coluna user_id.)
  if tg_op = 'UPDATE' then
    if old.user_id is distinct from v_uid then
      return new;
    end if;
  end if;

  select deleted_at is not null, case when suspended_until > now() then suspended_until end
    into v_removed, v_until
    from public.profiles where id = v_uid;

  if v_removed then
    raise exception 'Sua conta foi desativada pela moderação. Você ainda pode ler o conteúdo, mas esta ação não está disponível.'
      using errcode = '42501', hint = 'account_removed';
  elsif v_until is not null then
    raise exception 'Sua conta está com as interações pausadas até % (horário de Brasília). Até lá, você ainda pode ler o conteúdo.',
      to_char(v_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      using errcode = '42501', hint = 'account_suspended';
  end if;
  return new;
end;
$$;
