-- ============================================================
-- SIGNATURE NAILS • HARDENING DE SEGURANÇA (3-hardening.sql)
-- Correções apontadas pelo Security Advisor
-- ============================================================

-- ------------------------------------------------------------
-- 1. View -> Função com parâmetros obrigatórios
--    Antes: qualquer um podia listar TODOS os horários da
--    plataforma. Agora: só consulta um studio + dia por vez.
-- ------------------------------------------------------------
drop view if exists public.horarios_ocupados;

create or replace function public.horarios_ocupados(p_studio uuid, p_data date)
returns table (start_time time, end_time time)
language sql
stable
security definer
set search_path = public
as $$
  select a.start_time, a.end_time
  from appointments a
  where a.studio_id = p_studio
    and a.date = p_data
    and a.status <> 'cancelado'
$$;

revoke all on function public.horarios_ocupados(uuid, date) from public;
grant execute on function public.horarios_ocupados(uuid, date) to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Storage: bloquear listagem do bucket (URLs continuam
--    funcionando porque o bucket é público)
-- ------------------------------------------------------------
drop policy if exists "midia publica" on storage.objects;

-- cada profissional pode listar apenas a própria pasta (gestão)
drop policy if exists "dona lista sua pasta" on storage.objects;
create policy "dona lista sua pasta"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select id::text from studios where owner_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3. meu_studio_id: só usuários logados precisam
-- ------------------------------------------------------------
revoke all on function public.meu_studio_id() from public, anon;
grant execute on function public.meu_studio_id() to authenticated;

-- ------------------------------------------------------------
-- 4. rls_auto_enable (se existir): remover acesso público
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable') then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- Observação: criar_agendamento CONTINUA executável por anon —
-- é a API pública de agendamento (validações internas cuidam
-- de studio, expediente, conflitos e assinatura). O warning do
-- Advisor para ela é esperado e aceito por design.
