-- Send one varied Gospel invitation every morning to Android push users.
-- 11:00 UTC is 08:00 in America/Sao_Paulo (Brazil no longer observes DST).
begin;

create extension if not exists pg_cron with schema pg_catalog;

alter table public.notifications
  add column if not exists type text,
  add column if not exists scheduled_key text;

create unique index if not exists notifications_scheduled_key_unique
  on public.notifications(user_id, scheduled_key)
  where scheduled_key is not null;

create or replace function public.enqueue_daily_gospel_push(
  p_day date default (now() at time zone 'America/Sao_Paulo')::date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_count integer;
  messages constant text[] := array[
    'Antes da correria começar, permita que a Palavra de Deus encontre o seu coração. Leia o Evangelho de hoje.',
    'Uma nova manhã, uma nova oportunidade de caminhar com Jesus. Venha ler o Evangelho do dia.',
    'Bom dia! Separe alguns minutos para ouvir o que Deus quer falar hoje ao seu coração.',
    'Comece o dia alimentando a alma: o Evangelho de hoje já está esperando por você.',
    'Que a primeira luz desta manhã venha da Palavra. Leia o Evangelho do dia no Améns.',
    'Deus também fala na serenidade de uma manhã. Abra o Evangelho de hoje e escute com o coração.',
    'Antes de cuidar de tudo, cuide da sua fé. Reserve um instante para o Evangelho de hoje.',
    'A Palavra pode transformar o rumo do seu dia. Venha descobrir o Evangelho desta manhã.',
    'Hoje há uma mensagem de esperança esperando por você. Comece o dia com o Evangelho.',
    'Entregue esta manhã a Deus e deixe a Palavra iluminar seus próximos passos.'
  ];
begin
  insert into public.notifications(user_id, message, type, scheduled_key)
  select recipients.user_id,
         messages[1 + floor(random() * array_length(messages, 1))::integer],
         'daily_gospel',
         'daily-gospel:' || p_day::text
  from (
    select distinct user_id
    from public.push_devices
    where platform = 'android'
  ) recipients
  on conflict (user_id, scheduled_key) where scheduled_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.enqueue_daily_gospel_push(date) from public, anon, authenticated;
grant execute on function public.enqueue_daily_gospel_push(date) to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'amens-daily-gospel-push';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end $$;

select cron.schedule(
  'amens-daily-gospel-push',
  '0 11 * * *',
  $cron$select public.enqueue_daily_gospel_push();$cron$
);

commit;
