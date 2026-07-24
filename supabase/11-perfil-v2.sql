-- ============================================================
-- SIGNATURE • PERFIL DO PROFISSIONAL (11-perfil-v2.sql)
-- VERSÃO CORRIGIDA — use esta no lugar do 11-perfil.sql
--
-- Descoberta: professionals JÁ TEM avatar_url (foto com upload)
-- e working_hours (jornada por dia). Então aqui só entram as
-- duas coisas que realmente faltam: folgas e avaliações.
-- ============================================================

-- 1) Folgas individuais (datas específicas em que o profissional
--    não atende — diferente da jornada semanal, que já existe)
create table if not exists professional_days_off (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz default now(),
  unique (professional_id, date)
);

alter table professional_days_off enable row level security;

drop policy if exists "dono gerencia folgas" on professional_days_off;
create policy "dono gerencia folgas" on professional_days_off
  for all
  using (studio_id in (select id from studios where owner_id = auth.uid()))
  with check (studio_id in (select id from studios where owner_id = auth.uid()));

drop policy if exists "leitura publica de folgas" on professional_days_off;
create policy "leitura publica de folgas" on professional_days_off
  for select using (true);

-- 2) Avaliações por profissional
create table if not exists professional_reviews (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  client_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  approved boolean not null default true,
  created_at timestamptz default now()
);

alter table professional_reviews enable row level security;

drop policy if exists "dono gerencia avaliacoes" on professional_reviews;
create policy "dono gerencia avaliacoes" on professional_reviews
  for all
  using (studio_id in (select id from studios where owner_id = auth.uid()))
  with check (studio_id in (select id from studios where owner_id = auth.uid()));

drop policy if exists "leitura publica de avaliacoes aprovadas" on professional_reviews;
create policy "leitura publica de avaliacoes aprovadas" on professional_reviews
  for select using (approved = true);

create index if not exists idx_reviews_prof on professional_reviews (professional_id, approved, created_at desc);
create index if not exists idx_folgas_prof on professional_days_off (professional_id, date);

-- 3) LIMPEZA (opcional): se você já rodou o 11-perfil.sql antigo,
--    ele criou 4 colunas redundantes em professionals. Não fazem
--    mal, mas se quiser remover, descomente e rode:
-- alter table professionals drop column if exists photo_url;
-- alter table professionals drop column if exists work_days;
-- alter table professionals drop column if exists work_start;
-- alter table professionals drop column if exists work_end;
