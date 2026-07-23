-- ============================================================
-- SIGNATURE NAILS • MONETIZAÇÃO (2-monetizacao.sql)
-- Rodar no SQL Editor DEPOIS do schema.sql
--
-- 1. Coluna plan_until (validade da assinatura paga)
-- 2. Agendamento recusa studios com trial/assinatura expirados
--    (bloqueio no servidor — não dá para burlar pelo navegador)
--
-- Como liberar uma assinante que pagou:
--   Table Editor > studios > linha dela >
--   plan = 'basico'  e  plan_until = data do próximo vencimento
-- ============================================================

alter table studios add column if not exists plan_until date;

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

  -- ASSINATURA: trial de 14 dias OU plano pago dentro da validade
  if not (
    (v_plan = 'trial' and v_criado + interval '14 days' > now())
    or (v_plan in ('basico', 'pro') and (v_until is null or v_until >= v_agora::date))
  ) then
    raise exception 'assinatura_expirada';
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
