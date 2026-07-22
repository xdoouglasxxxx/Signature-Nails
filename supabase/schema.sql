-- ============================================================
-- SAAS BELEZA • SCHEMA V2 MULTI-TENANT (rodar em projeto NOVO)
-- Cada profissional: 1 conta Auth + 1 studio + dados isolados
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- STUDIOS (o "tenant": uma profissional = um studio)
-- ------------------------------------------------------------
create table if not exists studios (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  name text not null,
  specialty text,                    -- ex: "Manicure & Nail Artist"
  bio text,                          -- apresentação da profissional
  specialties text[],                -- ex: {"Alongamento","Esmaltação em gel"}
  certifications text[],
  city text,
  address text,
  phone text,                        -- whatsapp com DDI (só dígitos)
  instagram text,
  facebook text,
  tiktok text,
  website text,
  avatar_url text,                   -- foto de perfil
  cover_url text,                    -- foto de capa
  hero_video_url text,               -- vídeo de abertura (opcional)
  theme jsonb default '{"primary":"#0A1F44","accent":"#C9A86C","bg":"#FDF8F0"}'::jsonb,
  working_hours jsonb default '{
    "0": null,
    "1": {"start":"09:00","end":"19:00"},
    "2": {"start":"09:00","end":"19:00"},
    "3": {"start":"09:00","end":"19:00"},
    "4": {"start":"09:00","end":"19:00"},
    "5": {"start":"09:00","end":"19:00"},
    "6": {"start":"09:00","end":"17:00"}
  }'::jsonb,
  slot_interval_minutes int not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  active boolean not null default true,
  plan text not null default 'trial' check (plan in ('trial','basico','pro','cancelado')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SERVICES
-- ------------------------------------------------------------
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  price decimal(10,2) not null check (price >= 0),
  duration_minutes int not null default 60 check (duration_minutes > 0),
  description text,
  category text,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_services_studio on services (studio_id);

-- ------------------------------------------------------------
-- CLIENTS (clientes finais de cada studio)
-- ------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (studio_id, phone)
);
create index if not exists idx_clients_studio on clients (studio_id);

-- ------------------------------------------------------------
-- APPOINTMENTS
-- ------------------------------------------------------------
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pendente'
    check (status in ('pendente','confirmado','pago','cancelado','no-show')),
  price_at_time decimal(10,2),
  payment_method text,
  created_at timestamptz not null default now()
);
create index if not exists idx_appointments_studio_date on appointments (studio_id, date);

-- ------------------------------------------------------------
-- GALLERY
-- ------------------------------------------------------------
create table if not exists gallery (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  image_url text not null,
  category text check (category in ('trabalho','antes-depois','studio','pessoal') or category is null),
  description text,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_gallery_studio on gallery (studio_id);

-- ------------------------------------------------------------
-- TESTIMONIALS (depoimentos — profissional aprova antes de exibir)
-- ------------------------------------------------------------
create table if not exists testimonials (
  id uuid primary key default uuid_generate_v4(),
  studio_id uuid not null references studios(id) on delete cascade,
  client_name text not null,
  text text not null,
  rating int not null default 5 check (rating between 1 and 5),
  photo_url text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_testimonials_studio on testimonials (studio_id);

-- Anti agendamento duplo por studio
create unique index if not exists idx_agendamento_unico
  on appointments (studio_id, date, start_time)
  where status <> 'cancelado';

-- ============================================================
-- RLS — ISOLAMENTO POR TENANT
-- ============================================================
alter table studios enable row level security;
alter table services enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table gallery enable row level security;
alter table testimonials enable row level security;

-- Função auxiliar: o studio da profissional logada
create or replace function public.meu_studio_id()
returns uuid language sql stable security definer set search_path = public as
$$ select id from studios where owner_id = auth.uid() $$;

-- STUDIOS: público lê studios ativos; dona gerencia o seu; cadastro cria 1
create policy "public read studios" on studios
  for select using (active = true);
create policy "dona atualiza seu studio" on studios
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "cadastro cria studio" on studios
  for insert to authenticated with check (owner_id = auth.uid());

-- SERVICES: público lê ativos de studios ativos; dona gerencia os seus
create policy "public read services" on services
  for select using (active = true and studio_id in (select id from studios where active = true));
create policy "dona gerencia services" on services
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());

-- CLIENTS / APPOINTMENTS: NUNCA públicos; só a dona do studio
create policy "dona gerencia clients" on clients
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());
create policy "dona gerencia appointments" on appointments
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());

-- GALLERY: público lê; dona gerencia
create policy "public read gallery" on gallery
  for select using (studio_id in (select id from studios where active = true));
create policy "dona gerencia gallery" on gallery
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());

-- TESTIMONIALS: público lê só aprovados; visitante pode enviar; dona gerencia
create policy "public read testimonials" on testimonials
  for select using (approved = true and studio_id in (select id from studios where active = true));
create policy "visitante envia depoimento" on testimonials
  for insert to anon with check (approved = false);
create policy "dona gerencia testimonials" on testimonials
  for all to authenticated using (studio_id = meu_studio_id()) with check (studio_id = meu_studio_id());

-- ============================================================
-- VIEW pública de horários ocupados (sem dados pessoais)
-- ============================================================
create or replace view public.horarios_ocupados as
  select studio_id, date, start_time, end_time
  from appointments
  where status <> 'cancelado';
grant select on public.horarios_ocupados to anon, authenticated;

-- ============================================================
-- FUNÇÃO DE AGENDAMENTO v3 (multi-tenant, identifica pelo slug)
-- ============================================================
create or replace function public.criar_agendamento(
  p_slug text,
  p_nome text,
  p_telefone text,
  p_service_id uuid,
  p_data date,
  p_horario time
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
  v_dia jsonb;
  v_abre time;
  v_fecha time;
  v_client uuid;
  v_dur int;
  v_price decimal;
  v_fim time;
  v_id uuid;
begin
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = '' then
    raise exception 'dados_invalidos';
  end if;

  v_agora := (now() at time zone 'America/Sao_Paulo');

  if p_data < v_agora::date then raise exception 'data_passada'; end if;
  if p_data = v_agora::date and p_horario <= v_agora::time then
    raise exception 'horario_passado';
  end if;

  -- identifica o studio pelo slug
  select id, working_hours into v_studio, v_wh
  from studios where slug = p_slug and active = true;
  if v_studio is null then raise exception 'studio_invalido'; end if;

  v_dia := v_wh -> extract(dow from p_data)::int::text;
  if v_dia is null or jsonb_typeof(v_dia) = 'null' then
    raise exception 'dia_fechado';
  end if;
  v_abre := (v_dia->>'start')::time;
  v_fecha := (v_dia->>'end')::time;

  -- serviço precisa ser DESTE studio
  select duration_minutes, price into v_dur, v_price
  from services
  where id = p_service_id and studio_id = v_studio and active = true;
  if v_dur is null then raise exception 'servico_invalido'; end if;

  v_fim := p_horario + make_interval(mins => v_dur);

  if p_horario < v_abre or v_fim > v_fecha or v_fim <= p_horario then
    raise exception 'fora_do_horario';
  end if;

  if exists (
    select 1 from appointments
    where studio_id = v_studio
      and date = p_data
      and status <> 'cancelado'
      and p_horario < end_time
      and v_fim > start_time
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
    (studio_id, client_id, service_id, date, start_time, end_time, status, price_at_time)
  values
    (v_studio, v_client, p_service_id, p_data, p_horario, v_fim, 'pendente', v_price)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.criar_agendamento(text, text, text, uuid, date, time) from public;
grant execute on function public.criar_agendamento(text, text, text, uuid, date, time) to anon, authenticated;

-- ============================================================
-- STORAGE — bucket "media", uma pasta por studio
-- Caminhos: {studio_id}/avatar.jpg, {studio_id}/gallery/..., etc.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "midia publica"
  on storage.objects for select
  using (bucket_id = 'media');

-- cada profissional só grava/apaga dentro da SUA pasta
create policy "dona envia midia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select id::text from studios where owner_id = auth.uid())
  );

create policy "dona atualiza midia"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select id::text from studios where owner_id = auth.uid())
  );

create policy "dona remove midia"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select id::text from studios where owner_id = auth.uid())
  );
