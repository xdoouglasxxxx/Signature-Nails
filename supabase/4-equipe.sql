-- ============================================================
-- SIGNATURE NAILS • FASE EQUIPE (4-equipe.sql)
-- Rodar no SQL Editor DEPOIS dos anteriores.
--
-- 1. Tabela professionals (equipe do salão)
-- 2. Vínculo serviço <-> profissional
-- 3. Agendamentos ganham professional_id (agendas paralelas!)
-- 4. Funções de horário/agendamento cientes da profissional
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFESSIONALS
-- ------------------------------------------------------------
create table if not exists professionals (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  role text,                          -- ex: "Cabeleireira", "Nail Designer"
  avatar_url text,
  working_hours jsonb,                -- null = usa o horário do salão
  commission_percent decimal(5,2) not null default 0 check (commission_percent between 0 and 100),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_professionals_studio on professionals (studio_id);

-- Quais serviços cada profissional realiza.
-- REGRA: profissional SEM nenhuma linha aqui = faz TODOS os serviços.
create table if not exists professional_services (
  professional_id uuid not null references professionals(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (professional_id, service_id)
);

-- ------------------------------------------------------------
-- 2. APPOINTMENTS ganham a profissional
-- ------------------------------------------------------------
alter table appointments add column if not exists
  professional_id uuid references professionals(id) on delete set null;
create index if not exists idx_appointments_professional
  on appointments (studio_id, professional_id, date);

-- Anti agendamento duplo POR PROFISSIONAL (agendas paralelas)
drop index if exists idx_agendamento_unico;
create unique index if not exists idx_agendamento_unico_prof
  on appointments (studio_id, professional_id, date, start_time)
  where status <> 'cancelado' and professional_id is not null;
create unique index if not exists idx_agendamento_unico_solo
  on appointments (studio_id, date, start_time)
  where status <> 'cancelado' and professional_id is null;

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
alter table professionals enable row level security;
alter table professional_services enable row level security;

create policy "public read professionals" on professionals
  for select using (active = true and studio_id in (select id from studios where active = true));
create policy "dona gerencia professionals" on professionals
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());

create policy "public read professional_services" on professional_services
  for select using (professional_id in (select id from professionals where active = true));
create policy "dona gerencia professional_services" on professional_services
  for all to authenticated
  using (professional_id in (select id from professionals where studio_id = meu_studio_id()))
  with check (professional_id in (select id from professionals where studio_id = meu_studio_id()));

-- ------------------------------------------------------------
-- 4. HORÁRIOS OCUPADOS v2 (por profissional)
-- Agendamentos sem profissional (modo solo/legado) bloqueiam todos.
-- ------------------------------------------------------------
drop function if exists public.horarios_ocupados(uuid, date);

create or replace function public.horarios_ocupados(
  p_studio uuid,
  p_data date,
  p_professional uuid default null
)
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
    and (
      p_professional is null
      or a.professional_id = p_professional
      or a.professional_id is null
    )
$$;

revoke all on function public.horarios_ocupados(uuid, date, uuid) from public;
grant execute on function public.horarios_ocupados(uuid, date, uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. CRIAR AGENDAMENTO v5 (ciente da profissional)
-- ------------------------------------------------------------
drop function if exists public.criar_agendamento(text, text, text, uuid, date, time);

create or replace function public.criar_agendamento(
  p_slug text,
  p_nome text,
  p_telefone text,
  p_service_id uuid,
  p_data date,
  p_horario time,
  p_professional uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamp;
  v_studio uuid;
  v_wh jsonb;
  v_plan text;
  v_until date;
  v_criado timestamptz;
  v_dia jsonb;
  v_abre time;
  v_fecha time;
  v_client uuid;
  v_dur int;
  v_price decimal;
  v_fim time;
  v_id uuid;
  v_prof_wh jsonb;
  v_tem_mapa boolean;
begin
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = '' then
    raise exception 'dados_invalidos';
  end if;

  v_agora := (now() at time zone 'America/Sao_Paulo');

  if p_data < v_agora::date then raise exception 'data_passada'; end if;
  if p_data = v_agora::date and p_horario <= v_agora::time then
    raise exception 'horario_passado';
  end if;

  select id, working_hours, plan, plan_until, created_at
    into v_studio, v_wh, v_plan, v_until, v_criado
  from studios where slug = p_slug and active = true;
  if v_studio is null then raise exception 'studio_invalido'; end if;

  if not (
    (v_plan = 'trial' and v_criado + interval '14 days' > now())
    or (v_plan in ('basico', 'pro') and (v_until is null or v_until >= v_agora::date))
  ) then
    raise exception 'assinatura_expirada';
  end if;

  -- profissional (se informada): pertence ao studio, ativa, faz o serviço
  if p_professional is not null then
    select working_hours into v_prof_wh
    from professionals
    where id = p_professional and studio_id = v_studio and active = true;
    if not found then raise exception 'profissional_invalida'; end if;

    select exists (select 1 from professional_services where professional_id = p_professional)
      into v_tem_mapa;
    if v_tem_mapa and not exists (
      select 1 from professional_services
      where professional_id = p_professional and service_id = p_service_id
    ) then
      raise exception 'profissional_nao_faz_servico';
    end if;

    -- horário próprio da profissional, se configurado
    if v_prof_wh is not null then v_wh := v_prof_wh; end if;
  end if;

  v_dia := v_wh -> extract(dow from p_data)::int::text;
  if v_dia is null or jsonb_typeof(v_dia) = 'null' then
    raise exception 'dia_fechado';
  end if;
  v_abre := (v_dia->>'start')::time;
  v_fecha := (v_dia->>'end')::time;

  select duration_minutes, price into v_dur, v_price
  from services
  where id = p_service_id and studio_id = v_studio and active = true;
  if v_dur is null then raise exception 'servico_invalido'; end if;

  v_fim := p_horario + make_interval(mins => v_dur);

  if p_horario < v_abre or v_fim > v_fecha or v_fim <= p_horario then
    raise exception 'fora_do_horario';
  end if;

  -- conflito na agenda DA PROFISSIONAL (ou do studio, se solo)
  if exists (
    select 1 from appointments
    where studio_id = v_studio
      and date = p_data
      and status <> 'cancelado'
      and p_horario < end_time
      and v_fim > start_time
      and (
        p_professional is null
        or professional_id = p_professional
        or professional_id is null
      )
  ) then
    raise exception 'horario_ocupado';
  end if;

  select id into v_client from clients
  where studio_id = v_studio and phone = trim(p_telefone) limit 1;
  if v_client is null then
    insert into clients (studio_id, name, phone)
    values (v_studio, trim(p_nome), trim(p_telefone))
    returning id into v_client;
  end if;

  insert into appointments
    (studio_id, client_id, service_id, professional_id, date, start_time, end_time, status, price_at_time)
  values
    (v_studio, v_client, p_service_id, p_professional, p_data, p_horario, v_fim, 'pendente', v_price)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.criar_agendamento(text, text, text, uuid, date, time, uuid) from public;
grant execute on function public.criar_agendamento(text, text, text, uuid, date, time, uuid) to anon, authenticated;
