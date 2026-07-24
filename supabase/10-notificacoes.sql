-- ============================================================
-- SIGNATURE • CENTRAL DE NOTIFICAÇÕES v2 (10-notificacoes.sql)
-- Rode no SQL Editor do Supabase (projeto SIGNATUREBEAUTY)
-- Pré-requisito: 9-novos-agendamentos.sql já aplicado
-- (created_at + realtime). Se ainda não rodou, rode-o antes.
-- ============================================================

-- Estado "visto/lido" persistido no banco: sincroniza entre
-- todos os dispositivos do estúdio (seu celular, o da equipe,
-- o computador) e sobrevive a recarregar a página.
alter table appointments
  add column if not exists notif_seen_at timestamptz;

create index if not exists idx_appointments_notif
  on appointments (studio_id, notif_seen_at, created_at desc);
