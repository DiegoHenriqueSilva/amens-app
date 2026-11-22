-- ADM05 — Igrejas, cadastro e importação
--
-- Decisões aprovadas (21/11/2026):
--   * Situação única: pending_review | active | inactive | rejected (+ deleted_at para remoção reversível).
--     is_active continua existindo e é sempre (status = 'active'), sincronizado por trigger,
--     para o painel publicado (que ainda grava is_active) não quebrar até o deploy.
--   * Toda escrita do painel passa por funções no servidor (moderador e admin, ADM00/S3; importação só admin),
--     com log na mesma transação.
--   * Duplicadas: mesclagem no servidor (perfis passam para a igreja que fica; as outras ficam
--     inativas com merged_into), reversível.
--   * Importação CSV pelo painel: validação no servidor, prévia, gravação em lotes, sem apagar nada.
--   * Contrato para o app (APP12/APP13): search_churches e get_church_cities só com igrejas ativas.
--
-- Idempotente. A retirada da escrita direta na tabela fica em 20261122010000 (aplicar só depois do deploy).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Normalização e chaves
-- ---------------------------------------------------------------------------
create or replace function public._norm_text(p text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select nullif(lower(extensions.unaccent('extensions.unaccent'::regdictionary,
           regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'))), '')
$$;

create or replace function public._church_key(p_name text, p_city text, p_state text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select coalesce(public._norm_text(p_name), '') || '|' || coalesce(public._norm_text(p_city), '') || '|'
      || coalesce(public._norm_text(p_state), '')
$$;

-- Estado: aceita o nome (com ou sem acento) ou a sigla e devolve o nome oficial, como já está nos dados.
create or replace function public._church_state(p text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select s.nome
  from (values
    ('AC','Acre'),('AL','Alagoas'),('AP','Amapá'),('AM','Amazonas'),('BA','Bahia'),('CE','Ceará'),
    ('DF','Distrito Federal'),('ES','Espírito Santo'),('GO','Goiás'),('MA','Maranhão'),
    ('MT','Mato Grosso'),('MS','Mato Grosso do Sul'),('MG','Minas Gerais'),('PA','Pará'),
    ('PB','Paraíba'),('PR','Paraná'),('PE','Pernambuco'),('PI','Piauí'),('RJ','Rio de Janeiro'),
    ('RN','Rio Grande do Norte'),('RS','Rio Grande do Sul'),('RO','Rondônia'),('RR','Roraima'),
    ('SC','Santa Catarina'),('SP','São Paulo'),('SE','Sergipe'),('TO','Tocantins')
  ) s(uf, nome)
  where public._norm_text(p) in (lower(s.uf), public._norm_text(s.nome))
  limit 1
$$;

-- Validação comum (formulário, importação e sugestão do app). Devolve NULL ou o motivo, em texto para a tela.
create or replace function public._church_invalid(p_name text, p_city text, p_state text, p_address text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v text;
begin
  foreach v in array array[p_name, p_city, p_state, p_address] loop
    if v ~ '^\s*[=+\-@]' or v ~ '^[\t\r]' then
      return 'Fórmula ou comando não é aceito. Tire o sinal do começo da célula.';
    end if;
    if v ~ '[\x00-\x08\x0B\x0C\x0E-\x1F]' then
      return 'Há caracteres de controle na linha.';
    end if;
  end loop;
  if coalesce(length(btrim(p_name)), 0) < 3 then return 'Nome da igreja vazio ou curto demais (mínimo 3 letras).'; end if;
  if length(btrim(p_name)) > 150 then return 'Nome da igreja longo demais (máximo 150 caracteres).'; end if;
  if coalesce(length(btrim(p_city)), 0) < 2 then return 'Cidade vazia.'; end if;
  if length(btrim(p_city)) > 100 then return 'Cidade longa demais (máximo 100 caracteres).'; end if;
  if public._church_state(p_state) is null then
    return format('Estado "%s" não existe. Use a sigla (SP) ou o nome (São Paulo).', left(coalesce(p_state, ''), 30));
  end if;
  if length(coalesce(p_address, '')) > 300 then return 'Endereço longo demais (máximo 300 caracteres).'; end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Dados e restrições
-- ---------------------------------------------------------------------------
alter table public.churches drop constraint if exists churches_status_check;

-- 530 igrejas estavam "ativas" com is_active = false (Resolver todas, 24/05). Passam a "inactive".
update public.churches set status = 'inactive' where status = 'active' and not is_active;
update public.churches set is_active = (status = 'active') where is_active is distinct from (status = 'active');

alter table public.churches
  add constraint churches_status_check check (status in ('pending_review', 'active', 'inactive', 'rejected'));

alter table public.churches add column if not exists merged_into uuid references public.churches(id) on delete set null;
alter table public.churches add column if not exists import_batch uuid;
alter table public.churches drop constraint if exists churches_source_check;
alter table public.churches add constraint churches_source_check check (source in ('import', 'app', 'admin'));
alter table public.churches drop constraint if exists churches_merged_inactive;
alter table public.churches add constraint churches_merged_inactive check (merged_into is null or (status = 'inactive' and merged_into <> id));

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'churches' and column_name = 'dedupe_key') then
    alter table public.churches add column dedupe_key text generated always as (public._church_key(name, city, state)) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'churches' and column_name = 'search_text') then
    alter table public.churches add column search_text text generated always as
      (coalesce(public._norm_text(name), '') || ' ' || coalesce(public._norm_text(city), '') || ' ' || coalesce(public._norm_text(state), '')) stored;
  end if;
end $$;

create index if not exists churches_dedupe_key_idx on public.churches (dedupe_key) where deleted_at is null and merged_into is null;
create index if not exists churches_search_trgm_idx on public.churches using gin (search_text extensions.gin_trgm_ops);
create index if not exists churches_status_idx on public.churches (status) where deleted_at is null;
create index if not exists churches_state_city_name_idx on public.churches (state, city, name);
create index if not exists profiles_church_id_idx on public.profiles (church_id) where church_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Trigger: situação única, compatibilidade com is_active e sugestão do app
-- ---------------------------------------------------------------------------
create or replace function public.churches_before_write()
returns trigger
language plpgsql
security invoker -- precisa ver o papel real de quem grava (as funções do painel rodam como postgres)
set search_path = public, extensions
as $$
declare
  v_admin boolean := current_user in ('postgres', 'service_role', 'supabase_admin') or coalesce(public.is_moderator_or_admin(), false);
  v_err text;
begin
  if tg_op = 'UPDATE' then
    -- Painel antigo: grava só is_active. Traduz para a situação.
    if new.is_active is distinct from old.is_active and new.status is not distinct from old.status then
      if new.is_active and old.status = 'inactive' then
        new.status := 'active';
        new.merged_into := null;
      elsif not new.is_active and old.status = 'active' then
        new.status := 'inactive';
      end if;
    end if;
  else
    if new.status = 'active' and new.is_active is false then
      new.status := 'inactive';
    end if;
  end if;

  if not v_admin then
    if tg_op = 'INSERT' then
      -- Sugestão de igreja feita pelo app: sempre entra para revisão, sem campos de moderação.
      new.status := 'pending_review';
      new.source := 'app';
      new.deleted_at := null;
      new.deleted_by := null;
      new.merged_into := null;
      new.import_batch := null;
      new.cnpj := null;
      new.diocese := null;
      v_err := public._church_invalid(new.name, new.city, new.state, new.address);
      if v_err is not null then
        raise exception '%', v_err using errcode = '22023', hint = 'invalid_church';
      end if;
      new.state := public._church_state(new.state);
      new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
      new.city := regexp_replace(btrim(new.city), '\s+', ' ', 'g');
    else
      raise exception 'Sem permissão para alterar igrejas.' using errcode = '42501';
    end if;
  end if;

  new.is_active := (new.status = 'active');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists churches_before_write on public.churches;
create trigger churches_before_write
  before insert or update on public.churches
  for each row execute function public.churches_before_write();

-- ADM00/S3: moderador gerencia Igrejas (escrita direta mantida para mod/admin até 20261122010000).
drop policy if exists churches_insert_mod on public.churches;
create policy churches_insert_mod on public.churches for insert to authenticated with check (public.is_moderator_or_admin());
drop policy if exists churches_update_admin on public.churches;
create policy churches_update_admin on public.churches for update to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

drop trigger if exists churches_enforce_not_restricted on public.churches;
create trigger churches_enforce_not_restricted
  before insert on public.churches
  for each row execute function public.enforce_account_not_restricted();

-- ---------------------------------------------------------------------------
-- 4. Contrato público (APP12/APP13)
-- ---------------------------------------------------------------------------
create or replace function public.get_church_cities(state_name text)
returns table(city text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct c.city::text
  from public.churches c
  where c.state = coalesce(public._church_state(state_name), state_name)
    and c.deleted_at is null
    and c.status = 'active'
    and c.city is not null
  order by 1;
$$;

create or replace function public.search_churches(p_state text, p_city text default null, p_query text default null, p_limit int default 20)
returns table(id uuid, name text, city text, state text, address text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.name, c.city, c.state, c.address
  from public.churches c
  where c.deleted_at is null
    and c.status = 'active'
    and c.state = public._church_state(p_state)
    and (p_city is null or public._norm_text(c.city) = public._norm_text(p_city))
    and (public._norm_text(p_query) is null
         or c.search_text like '%' || replace(replace(replace(public._norm_text(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%')
  order by c.city, c.name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.search_churches(text, text, text, int) from public;
grant execute on function public.search_churches(text, text, text, int) to anon, authenticated;
grant execute on function public.get_church_cities(text) to anon, authenticated;

-- Função antiga do painel: era SECURITY DEFINER aberta a qualquer um e listava até as removidas.
revoke all on function public.get_duplicate_churches() from public, anon;
grant execute on function public.get_duplicate_churches() to authenticated;
create or replace function public.get_duplicate_churches()
returns table(id uuid, name text, city text, state text, is_active boolean, status text, deleted_at timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not coalesce(public.is_moderator_or_admin(), false) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
    select c.id, c.name, c.city, c.state, c.is_active, c.status, c.deleted_at, c.created_at
    from public.churches c
    where c.deleted_at is null and c.merged_into is null
      and c.dedupe_key in (select d.dedupe_key from public.churches d where d.deleted_at is null and d.merged_into is null
                           group by d.dedupe_key having count(*) > 1)
    order by c.state, c.city, c.name, c.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Painel: helpers
-- ---------------------------------------------------------------------------
create or replace function public._church_require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Só administradores podem importar igrejas.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._church_require_staff()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- ADM00/S3: moderador gerencia Igrejas
  if auth.uid() is null or not coalesce(public.is_moderator_or_admin(), false) then
    raise exception 'Só a moderação pode gerenciar igrejas.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._church_log(p_id uuid, p_action text, p_reason text, p_meta jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'church', p_id, p_action, nullif(btrim(coalesce(p_reason, '')), ''), coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function public._church_json(c public.churches)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'city', c.city, 'state', c.state, 'address', c.address,
    'status', c.status, 'source', c.source, 'deleted_at', c.deleted_at, 'created_at', c.created_at,
    'updated_at', c.updated_at, 'merged_into', c.merged_into,
    'merged_into_name', (select m.name from public.churches m where m.id = c.merged_into),
    'linked_profiles', (select count(*) from public.profiles p where p.church_id = c.id)
  )
$$;

-- Ordem de preferência para "qual fica" num grupo de duplicadas.
create or replace function public._church_keep_rank(c public.churches, p_linked bigint)
returns text
language sql
stable
set search_path = public
as $$
  select lpad((999999 - least(p_linked, 999999))::text, 6, '0')
      || case c.status when 'active' then '0' when 'inactive' then '1' when 'pending_review' then '2' else '3' end
      || case when c.address is not null then '0' else '1' end
      || to_char(c.created_at, 'YYYYMMDDHH24MISSUS')
      || c.id::text
$$;

-- ---------------------------------------------------------------------------
-- 6. Painel: listagem (sem corte de 500, busca escapada, contagens por aba)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_churches(
  p_tab text default 'all', p_search text default null, p_state text default null, p_city text default null,
  p_source text default null, p_offset int default 0, p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_q text := public._norm_text(p_search);
  v_like text;
  v_rows jsonb;
  v_counts jsonb;
begin
  perform public._church_require_staff();
  if p_tab not in ('all', 'active', 'inactive', 'pending_review', 'archived') then
    raise exception 'Aba inválida.' using errcode = '22023';
  end if;
  v_like := case when v_q is null then null
                 else '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  with base as (
    select c.* from public.churches c
    where (p_state is null or c.state = p_state)
      and (p_city is null or c.city = p_city)
      and (p_source is null or c.source = p_source)
      and (v_like is null or c.search_text like v_like)
  )
  select jsonb_build_object(
    'all', count(*),
    'active', count(*) filter (where deleted_at is null and status = 'active'),
    'inactive', count(*) filter (where deleted_at is null and status = 'inactive'),
    'pending_review', count(*) filter (where deleted_at is null and status = 'pending_review'),
    'archived', count(*) filter (where deleted_at is not null or status = 'rejected'))
  into v_counts from base;

  select coalesce(jsonb_agg(public._church_json(x.c) order by x.state, x.city, x.name, x.id), '[]'::jsonb)
  into v_rows
  from (
    select c, c.state, c.city, c.name, c.id from public.churches c
    where (p_state is null or c.state = p_state)
      and (p_city is null or c.city = p_city)
      and (p_source is null or c.source = p_source)
      and (v_like is null or c.search_text like v_like)
      and case p_tab
            when 'all' then true
            when 'archived' then c.deleted_at is not null or c.status = 'rejected'
            else c.deleted_at is null and c.status = p_tab
          end
    order by c.state, c.city, c.name, c.id
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;

  return jsonb_build_object('counts', v_counts, 'total', (v_counts ->> case when p_tab = 'all' then 'all' else p_tab end)::int, 'rows', v_rows);
end;
$$;

-- Cidades para os filtros e o formulário do painel: todas as situações, sem limite.
create or replace function public.admin_church_cities(p_state text)
returns text[]
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform public._church_require_staff();
  return coalesce((select array_agg(distinct c.city order by c.city) from public.churches c
                   where c.state = public._church_state(p_state) and c.city is not null), '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Painel: criar e editar
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_church(
  p_id uuid, p_name text, p_city text, p_state text, p_address text default null,
  p_reason text default null, p_expected_updated_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_err text;
  v_state text := public._church_state(p_state);
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_city text := regexp_replace(btrim(coalesce(p_city, '')), '\s+', ' ', 'g');
  v_addr text := nullif(regexp_replace(btrim(coalesce(p_address, '')), '\s+', ' ', 'g'), '');
  v_old public.churches;
  v_dup public.churches;
  v_new public.churches;
begin
  perform public._church_require_staff();
  v_err := public._church_invalid(v_name, v_city, p_state, v_addr);
  if v_err is not null then
    raise exception '%', v_err using errcode = '22023', hint = 'invalid_church';
  end if;

  if p_id is not null then
    select * into v_old from public.churches where id = p_id for update;
    if not found then
      raise exception 'Esta igreja não existe mais.' using errcode = 'PT409', hint = 'stale';
    end if;
    if p_expected_updated_at is not null and v_old.updated_at is distinct from p_expected_updated_at then
      raise exception 'Outra pessoa alterou esta igreja enquanto você editava. A lista foi atualizada: confira antes de salvar.'
        using errcode = 'PT409', hint = 'stale';
    end if;
  end if;

  select * into v_dup from public.churches c
  where c.dedupe_key = public._church_key(v_name, v_city, v_state)
    and c.deleted_at is null and c.merged_into is null
    and (p_id is null or c.id <> p_id)
  limit 1;
  if found then
    raise exception 'Já existe "%" em %/% (situação: %). Edite a existente em vez de criar outra.',
      v_dup.name, v_dup.city, v_dup.state,
      case v_dup.status when 'active' then 'ativa' when 'inactive' then 'inativa' when 'pending_review' then 'em revisão' else 'rejeitada' end
      using errcode = '23505', hint = 'duplicate';
  end if;

  if p_id is null then
    insert into public.churches (name, city, state, address, status, source)
    values (v_name, v_city, v_state, v_addr, 'active', 'admin')
    returning * into v_new;
    perform public._church_log(v_new.id, 'create', p_reason, jsonb_build_object('name', v_name, 'city', v_city, 'state', v_state));
  else
    update public.churches set name = v_name, city = v_city, state = v_state, address = v_addr
    where id = p_id returning * into v_new;
    perform public._church_log(p_id, 'edit_content', p_reason, jsonb_build_object(
      'before', jsonb_build_object('name', v_old.name, 'city', v_old.city, 'state', v_old.state, 'address', v_old.address),
      'after', jsonb_build_object('name', v_name, 'city', v_city, 'state', v_state, 'address', v_addr)));
  end if;
  return public._church_json(v_new);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Painel: mudar situação (aprovar, rejeitar, ativar, inativar, remover, restaurar)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_church_status(
  p_id uuid, p_action text, p_reason text default null, p_expected_status text default null, p_expected_deleted boolean default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c public.churches;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ok boolean;
begin
  perform public._church_require_staff();
  if p_action not in ('approve', 'reject', 'activate', 'deactivate', 'remove', 'restore') then
    raise exception 'Ação inválida.' using errcode = '22023';
  end if;
  if p_action in ('reject', 'deactivate', 'remove') and v_reason is null then
    raise exception 'Escreva o motivo. Ele fica registrado nos logs.' using errcode = '22023', hint = 'reason_required';
  end if;
  if length(coalesce(v_reason, '')) > 500 then
    raise exception 'Motivo longo demais (máximo 500 caracteres).' using errcode = '22023';
  end if;

  select * into c from public.churches where id = p_id for update;
  if not found
     or (p_expected_status is not null and c.status <> p_expected_status)
     or (p_expected_deleted is not null and (c.deleted_at is not null) <> p_expected_deleted) then
    raise exception 'Outra pessoa já alterou esta igreja. A lista foi atualizada: confira antes de decidir.'
      using errcode = 'PT409', hint = 'stale';
  end if;

  v_ok := case p_action
    when 'approve'    then c.deleted_at is null and c.status in ('pending_review', 'rejected')
    when 'reject'     then c.deleted_at is null and c.status = 'pending_review'
    when 'activate'   then c.deleted_at is null and c.status = 'inactive' and c.merged_into is null
    when 'deactivate' then c.deleted_at is null and c.status = 'active'
    when 'remove'     then c.deleted_at is null
    when 'restore'    then c.deleted_at is not null
  end;
  if not v_ok then
    if p_action = 'activate' and c.merged_into is not null then
      raise exception 'Esta igreja foi mesclada em outra. Use "Desfazer mesclagem".' using errcode = '22023', hint = 'merged';
    end if;
    raise exception 'Essa ação não vale para a situação atual da igreja.' using errcode = '22023', hint = 'invalid_transition';
  end if;

  if p_action = 'restore' then
    -- Não deixa voltar uma duplicata silenciosa.
    if exists (select 1 from public.churches d where d.dedupe_key = c.dedupe_key and d.id <> c.id
               and d.deleted_at is null and d.merged_into is null) then
      raise exception 'Já existe outra igreja ativa com este nome nesta cidade. Restaure e depois mescle, ou edite a existente.'
        using errcode = '23505', hint = 'duplicate';
    end if;
    update public.churches set deleted_at = null, deleted_by = null where id = p_id returning * into c;
  elsif p_action = 'remove' then
    update public.churches set deleted_at = now(), deleted_by = auth.uid() where id = p_id returning * into c;
  else
    update public.churches set status = case p_action
      when 'approve' then 'active' when 'activate' then 'active'
      when 'reject' then 'rejected' when 'deactivate' then 'inactive' end
    where id = p_id returning * into c;
  end if;

  perform public._church_log(p_id, case p_action when 'remove' then 'soft_delete' else p_action end, v_reason,
    jsonb_build_object('linked_profiles', (select count(*) from public.profiles p where p.church_id = p_id)));
  return public._church_json(c);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Duplicadas: grupos, mesclar, desfazer, resolver em lotes
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_duplicate_groups(
  p_search text default null, p_state text default null, p_city text default null,
  p_offset int default 0, p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_q text := public._norm_text(p_search);
  v_like text;
  v_res jsonb;
begin
  perform public._church_require_staff();
  v_like := case when v_q is null then null
                 else '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  with cand as (
    select c as ch, c.dedupe_key, c.state, c.city, c.name, c.search_text,
           (select count(*) from public.profiles p where p.church_id = c.id) as linked
    from public.churches c
    where c.deleted_at is null and c.merged_into is null
      and (p_state is null or c.state = p_state)
      and (p_city is null or c.city = p_city)
      and c.dedupe_key in (select d.dedupe_key from public.churches d
                           where d.deleted_at is null and d.merged_into is null
                             and (p_state is null or d.state = p_state)
                           group by d.dedupe_key having count(*) > 1)
  ),
  g as (
    select dedupe_key, min(state) st, min(city) ci, min(name) nm, count(*) n, sum(linked) linked
    from cand
    group by dedupe_key
    having v_like is null or bool_or(search_text like v_like)
  ),
  page as (
    select * from g order by st, ci, nm, dedupe_key
    offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select jsonb_build_object(
    'total_groups', (select count(*) from g),
    'total_churches', (select coalesce(sum(n), 0) from g),
    'groups', coalesce((select jsonb_agg(jsonb_build_object(
        'key', pg.dedupe_key,
        'suggested_keep', (select (c.ch).id from cand c where c.dedupe_key = pg.dedupe_key
                           order by public._church_keep_rank(c.ch, c.linked) limit 1),
        'members', (select jsonb_agg(public._church_json(c.ch) order by public._church_keep_rank(c.ch, c.linked))
                    from cand c where c.dedupe_key = pg.dedupe_key))
      order by pg.st, pg.ci, pg.nm, pg.dedupe_key) from page pg), '[]'::jsonb))
  into v_res;
  return v_res;
end;
$$;

-- Núcleo da mesclagem, sem checar papel (chamado pelas funções públicas abaixo).
create or replace function public._church_merge(p_keep uuid, p_merge uuid[], p_reason text, p_auto boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  k public.churches;
  m public.churches;
  v_moved uuid[];
  v_total int := 0;
  v_done uuid[] := '{}';
begin
  select * into k from public.churches where id = p_keep for update;
  if not found or k.deleted_at is not null or k.merged_into is not null or k.status = 'rejected' then
    raise exception 'A igreja escolhida para ficar não está mais disponível. A lista foi atualizada.' using errcode = 'PT409', hint = 'stale';
  end if;

  for m in select * from public.churches where id = any(p_merge) and id <> p_keep order by id for update loop
    if m.deleted_at is not null or m.merged_into is not null or m.dedupe_key <> k.dedupe_key then
      raise exception 'Este grupo mudou enquanto você decidia. A lista foi atualizada: confira antes de mesclar.' using errcode = 'PT409', hint = 'stale';
    end if;
    with u as (update public.profiles set church_id = p_keep where church_id = m.id returning id)
    select coalesce(array_agg(id), '{}') into v_moved from u;
    update public.churches set status = 'inactive', merged_into = p_keep where id = m.id;
    perform public._church_log(m.id, 'merge', p_reason, jsonb_build_object(
      'keep_id', p_keep, 'prev_status', m.status, 'moved_profiles', to_jsonb(v_moved), 'auto', p_auto));
    v_total := v_total + coalesce(array_length(v_moved, 1), 0);
    v_done := v_done || m.id;
  end loop;

  if coalesce(array_length(v_done, 1), 0) <> coalesce(array_length(array(select distinct x from unnest(p_merge) x where x <> p_keep), 1), 0) then
    raise exception 'Este grupo mudou enquanto você decidia. A lista foi atualizada: confira antes de mesclar.' using errcode = 'PT409', hint = 'stale';
  end if;

  if k.status <> 'active' then
    update public.churches set status = 'active' where id = p_keep;
  end if;
  return jsonb_build_object('keep', p_keep, 'merged', to_jsonb(v_done), 'moved_profiles', v_total, 'keep_prev_status', k.status);
end;
$$;

create or replace function public.admin_merge_churches(p_keep uuid, p_merge uuid[], p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_res jsonb;
begin
  perform public._church_require_staff();
  if coalesce(array_length(p_merge, 1), 0) = 0 then
    raise exception 'Escolha ao menos uma igreja para mesclar.' using errcode = '22023';
  end if;
  v_res := public._church_merge(p_keep, p_merge, p_reason, false);
  if v_res ->> 'keep_prev_status' <> 'active' then
    perform public._church_log(p_keep, 'activate', 'Ficou como principal numa mesclagem', jsonb_build_object('merged', v_res -> 'merged'));
  end if;
  return v_res;
end;
$$;

create or replace function public.admin_unmerge_church(p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c public.churches;
  l record;
  v_back int;
begin
  perform public._church_require_staff();
  select * into c from public.churches where id = p_id for update;
  if not found or c.merged_into is null then
    raise exception 'Esta igreja não está mais mesclada. A lista foi atualizada.' using errcode = 'PT409', hint = 'stale';
  end if;
  select * into l from public.moderation_logs
  where target_type = 'church' and target_id = p_id and action = 'merge'
  order by created_at desc limit 1;

  with u as (
    update public.profiles set church_id = p_id
    where church_id = c.merged_into
      and id in (select (jsonb_array_elements_text(coalesce(l.metadata -> 'moved_profiles', '[]'::jsonb)))::uuid)
    returning 1)
  select count(*) into v_back from u;

  update public.churches set merged_into = null,
    status = coalesce(l.metadata ->> 'prev_status', 'inactive')
  where id = p_id returning * into c;

  perform public._church_log(p_id, 'unmerge', p_reason, jsonb_build_object('from', l.metadata ->> 'keep_id', 'profiles_back', v_back));
  return public._church_json(c);
end;
$$;

-- Resolve em lotes, para respeitar o tempo-limite de 8 s. p_dry_run = true só conta.
create or replace function public.admin_resolve_duplicates(p_state text default null, p_dry_run boolean default true, p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  g record;
  v_groups int := 0;
  v_churches int := 0;
  v_profiles bigint := 0;
  v_res jsonb;
  v_remaining int;
begin
  perform public._church_require_staff();

  for g in
    with cand as (
      select c as ch, c.id, c.dedupe_key, (select count(*) from public.profiles p where p.church_id = c.id) as linked
      from public.churches c
      where c.deleted_at is null and c.merged_into is null
        and (p_state is null or c.state = p_state)
        and c.dedupe_key in (select d.dedupe_key from public.churches d
                             where d.deleted_at is null and d.merged_into is null and (p_state is null or d.state = p_state)
                             group by d.dedupe_key having count(*) > 1)
    ),
    ranked as (
      select cand.id, cand.dedupe_key, cand.linked,
             row_number() over (partition by cand.dedupe_key order by public._church_keep_rank(cand.ch, cand.linked)) rn
      from cand
    )
    select dedupe_key,
           (array_agg(id order by rn))[1] as keep_id,
           (array_agg(id order by rn))[2:] as merge_ids,
           sum(linked) filter (where rn > 1) as moved
    from ranked
    group by dedupe_key
    order by dedupe_key
    limit case when p_dry_run then null else least(greatest(coalesce(p_limit, 100), 1), 300) end
  loop
    v_groups := v_groups + 1;
    v_churches := v_churches + coalesce(array_length(g.merge_ids, 1), 0);
    v_profiles := v_profiles + coalesce(g.moved, 0);
    if not p_dry_run then
      v_res := public._church_merge(g.keep_id, g.merge_ids, 'Resolver duplicadas', true);
    end if;
  end loop;

  if p_dry_run then
    return jsonb_build_object('groups', v_groups, 'churches', v_churches, 'profiles', v_profiles);
  end if;

  select count(*) into v_remaining from (
    select 1 from public.churches d where d.deleted_at is null and d.merged_into is null and (p_state is null or d.state = p_state)
    group by d.dedupe_key having count(*) > 1) x;
  return jsonb_build_object('groups', v_groups, 'churches', v_churches, 'profiles', v_profiles, 'remaining_groups', v_remaining);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Importação CSV (prévia e gravação no mesmo contrato, lote de até 500 linhas)
-- ---------------------------------------------------------------------------
-- p_rows: [{"line": 2, "name": "...", "city": "...", "state": "SP", "address": "..."}]
-- Resultado por linha: ok | duplicate_db | duplicate_file | error. Em gravação, ok = inserida.
create or replace function public.admin_import_churches(p_rows jsonb, p_dry_run boolean default true,
  p_batch uuid default null, p_file_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r jsonb;
  v_line int;
  v_name text; v_city text; v_state text; v_addr text;
  v_err text;
  v_key text;
  v_seen text[] := '{}';
  v_out jsonb := '[]'::jsonb;
  v_ok int := 0; v_dup int := 0; v_bad int := 0;
  v_id uuid;
begin
  perform public._church_require_admin(); -- importação: só admin (decisão de 21/11)
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Formato inválido.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'Envie no máximo 500 linhas por lote.' using errcode = '22023', hint = 'too_many';
  end if;
  if not p_dry_run and p_batch is null then
    raise exception 'Lote sem identificação.' using errcode = '22023';
  end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_line := (r ->> 'line')::int;
    v_name := regexp_replace(btrim(coalesce(r ->> 'name', '')), '\s+', ' ', 'g');
    v_city := regexp_replace(btrim(coalesce(r ->> 'city', '')), '\s+', ' ', 'g');
    v_addr := nullif(regexp_replace(btrim(coalesce(r ->> 'address', '')), '\s+', ' ', 'g'), '');
    v_err := public._church_invalid(v_name, v_city, r ->> 'state', v_addr);
    if v_err is not null then
      v_bad := v_bad + 1;
      v_out := v_out || jsonb_build_object('line', v_line, 'result', 'error', 'message', v_err);
      continue;
    end if;
    v_state := public._church_state(r ->> 'state');
    v_key := public._church_key(v_name, v_city, v_state);
    if v_key = any(v_seen) then
      v_dup := v_dup + 1;
      v_out := v_out || jsonb_build_object('line', v_line, 'result', 'duplicate_file', 'key', v_key,
        'message', 'Repetida no próprio arquivo.');
      continue;
    end if;
    v_seen := v_seen || v_key;
    -- Qualquer cadastro com a mesma chave (inclusive removido ou rejeitado) bloqueia: a importação não desfaz decisão da moderação.
    if exists (select 1 from public.churches c where c.dedupe_key = v_key and c.merged_into is null) then
      v_dup := v_dup + 1;
      v_out := v_out || jsonb_build_object('line', v_line, 'result', 'duplicate_db', 'key', v_key,
        'message', 'Já existe no cadastro.');
      continue;
    end if;
    if not p_dry_run then
      insert into public.churches (name, city, state, address, status, source, import_batch)
      values (v_name, v_city, v_state, v_addr, 'active', 'import', p_batch)
      returning id into v_id;
    end if;
    v_ok := v_ok + 1;
    v_out := v_out || jsonb_build_object('line', v_line, 'result', 'ok', 'key', v_key);
  end loop;

  if not p_dry_run then
    perform public._church_log(p_batch, 'import', null, jsonb_build_object(
      'file', left(coalesce(p_file_name, ''), 200), 'inserted', v_ok, 'duplicates', v_dup, 'errors', v_bad));
  end if;
  return jsonb_build_object('ok', v_ok, 'duplicates', v_dup, 'errors', v_bad, 'rows', v_out);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Permissões das funções
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public._norm_text(text)', 'public._church_key(text, text, text)', 'public._church_state(text)',
    'public._church_invalid(text, text, text, text)', 'public._church_require_admin()', 'public._church_require_staff()',
    'public._church_log(uuid, text, text, jsonb)', 'public._church_json(public.churches)',
    'public._church_keep_rank(public.churches, bigint)', 'public._church_merge(uuid, uuid[], text, boolean)',
    'public.churches_before_write()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.admin_list_churches(text, text, text, text, text, int, int)', 'public.admin_church_cities(text)',
    'public.admin_save_church(uuid, text, text, text, text, text, timestamptz)',
    'public.admin_set_church_status(uuid, text, text, text, boolean)',
    'public.admin_list_duplicate_groups(text, text, text, int, int)',
    'public.admin_merge_churches(uuid, uuid[], text)', 'public.admin_unmerge_church(uuid, text)',
    'public.admin_resolve_duplicates(text, boolean, int)',
    'public.admin_import_churches(jsonb, boolean, uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Colunas geradas dependem destas funções; o dono (postgres) continua podendo usá-las.
grant execute on function public._norm_text(text) to authenticated, anon;
grant execute on function public._church_key(text, text, text) to authenticated, anon;
grant execute on function public._church_state(text) to authenticated, anon;
grant execute on function public._church_invalid(text, text, text, text) to authenticated, anon;
