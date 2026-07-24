-- ============================================================
-- SIGNATURE • SINO DE NOVOS AGENDAMENTOS (9-novos-agendamentos.sql)
-- Rode no SQL Editor do Supabase (projeto SIGNATUREBEAUTY)
-- ============================================================

-- 1) Coluna created_at: permite saber o que foi criado desde a
--    última visita ao painel. Registros antigos ficam sem valor
--    (contam como "já vistos" — nada quebra).
alter table appointments
  add column if not exists created_at timestamptz default now();

create index if not exists idx_appointments_created
  on appointments (studio_id, created_at desc);

-- 2) Tempo real: novos agendamentos aparecem no sino na hora,
--    sem recarregar a página. Se a tabela já estiver na
--    publicação, o bloco abaixo simplesmente não faz nada.
do $$
begin
  alter publication supabase_realtime add table appointments;
exception
  when duplicate_object then null;
end $$;
