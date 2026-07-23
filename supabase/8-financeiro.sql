-- ============================================================
-- SIGNATURE • FINANCEIRO (8-financeiro.sql)
-- Controle de comissões pagas/a pagar por atendimento
-- ============================================================
alter table appointments add column if not exists
  commission_paid boolean not null default false;

create index if not exists idx_appointments_financeiro
  on appointments (studio_id, status, date);
