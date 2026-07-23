-- ============================================================
-- SIGNATURE • NOTIFICAÇÕES PUSH (7-push.sql)
-- Guarda as inscrições de push de cada dono de espaço
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_studio on push_subscriptions (studio_id);

alter table push_subscriptions enable row level security;

create policy "dona gerencia push" on push_subscriptions
  for all to authenticated
  using (studio_id = meu_studio_id())
  with check (studio_id = meu_studio_id());
