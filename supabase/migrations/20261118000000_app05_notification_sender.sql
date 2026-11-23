-- APP05: retain the actor needed to report a notification sender.

alter table public.notifications
  add column if not exists sender_id uuid references auth.users(id) on delete set null;

create index if not exists idx_notifications_sender_id
  on public.notifications(sender_id)
  where sender_id is not null;
