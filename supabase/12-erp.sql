-- ============================================================
-- SIGNATURE • ERP FINANCEIRO — FASES 2 e 3 (12-erp.sql)
-- Rode no SQL Editor do Supabase (projeto SIGNATUREBEAUTY)
-- ============================================================

-- FASE 2 ─ DESPESAS ------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  category text not null,          -- Aluguel, Energia, Produtos, Marketing...
  description text,
  amount numeric not null check (amount >= 0),
  date date not null,
  recurring boolean not null default false,  -- marca despesas mensais fixas
  created_at timestamptz default now()
);

alter table expenses enable row level security;

drop policy if exists "dono gerencia despesas" on expenses;
create policy "dono gerencia despesas" on expenses
  for all
  using (studio_id in (select id from studios where owner_id = auth.uid()))
  with check (studio_id in (select id from studios where owner_id = auth.uid()));

create index if not exists idx_expenses_studio_date on expenses (studio_id, date desc);

-- FASE 3 ─ FORMA DE PAGAMENTO --------------------------------
-- Registrada na Agenda ao marcar um atendimento como pago
-- (pix | cartao | dinheiro | outro)
alter table appointments add column if not exists payment_method text;

-- FASE 3 ─ METAS ---------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  period text not null check (period in ('diaria','semanal','mensal')),
  amount numeric not null check (amount >= 0),
  created_at timestamptz default now(),
  unique (studio_id, period)
);

alter table goals enable row level security;

drop policy if exists "dono gerencia metas" on goals;
create policy "dono gerencia metas" on goals
  for all
  using (studio_id in (select id from studios where owner_id = auth.uid()))
  with check (studio_id in (select id from studios where owner_id = auth.uid()));
