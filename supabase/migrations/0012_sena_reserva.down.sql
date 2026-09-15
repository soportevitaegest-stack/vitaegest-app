-- =============================================================================
-- VitaeGest · 0012_sena_reserva.down.sql  ·  Rollback de la seña de reserva
-- Devuelve las RPC a su forma de la 0010 y saca todo lo agregado.
-- OJO: borra los datos de cobro cargados y el historial de señas.
-- =============================================================================

begin;

-- Cron (si se llegó a agendar)
do $$ begin
  perform cron.unschedule('vitaegest-release-deposits');
exception when others then null; end $$;

drop function if exists public.release_expired_deposits();
drop function if exists public.waive_deposit(uuid, text);
drop function if exists public.mark_deposit_paid(uuid, payment_method, numeric, text);
drop function if exists public.public_booking_info(text);
drop function if exists public.fn_public_payment_info(uuid);

-- Restaurar portal_request_appointment (versión 0006)
create or replace function public.portal_request_appointment(
  p_token text, p_start timestamptz, p_area specialty_area, p_dur int)
returns uuid language plpgsql security definer set search_path = public as $$
declare tok public.patient_portal_tokens; cfg public.schedule_settings; cnt int; newid uuid;
begin
  tok := public.portal_resolve(p_token);
  if tok.id is null then raise exception 'Token inválido o expirado'; end if;
  select * into cfg from public.schedule_settings where professional_id = tok.professional_id;
  if cfg.id is null or not cfg.booking_enabled then raise exception 'Las reservas online no están habilitadas'; end if;
  select count(*) into cnt from public.appointments a
    where a.professional_id = tok.professional_id and a.status <> 'cancelled' and a.start_at = p_start;
  if cnt >= cfg.max_per_slot then raise exception 'Ese horario ya no está disponible'; end if;
  insert into public.appointments (professional_id, patient_id, start_at, end_at, status, area, source, coverage_type)
  values (tok.professional_id, tok.patient_id, p_start,
          p_start + make_interval(mins => coalesce(p_dur, cfg.slot_minutes)), 'pending', p_area, 'patient', 'particular')
  returning id into newid;
  return newid;
end; $$;

-- Restaurar public_request_appointment (versión 0010)
create or replace function public.public_request_appointment(
  p_slug text, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_start timestamptz, p_area specialty_area, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid; cfg public.schedule_settings; v_patient uuid; v_token text;
  v_date date; v_today date; cnt int; pend int;
begin
  select id into v_pid from public.professionals where booking_slug = p_slug;
  if v_pid is null then raise exception 'Enlace inválido'; end if;
  if coalesce(trim(p_first_name),'') = '' or coalesce(trim(p_last_name),'') = '' then
    raise exception 'Ingresá nombre y apellido';
  end if;
  select * into cfg from public.schedule_settings where professional_id = v_pid;
  if cfg.id is null or not cfg.booking_enabled then raise exception 'Las reservas online no están habilitadas'; end if;
  v_date  := (p_start at time zone 'America/Argentina/Buenos_Aires')::date;
  v_today := (now()   at time zone 'America/Argentina/Buenos_Aires')::date;
  if v_date < v_today or v_date > v_today + cfg.booking_horizon_days then
    raise exception 'La fecha está fuera del período de reserva permitido';
  end if;
  if not (extract(isodow from v_date)::int = any(cfg.working_days)) then
    raise exception 'Ese día no está habilitado para turnos';
  end if;
  if coalesce(trim(p_phone),'') <> '' then
    select id into v_patient from public.patients
      where professional_id = v_pid and phone = trim(p_phone) limit 1;
  end if;
  if v_patient is null then
    insert into public.patients (professional_id, first_name, last_name, phone, email)
    values (v_pid, trim(p_first_name), trim(p_last_name),
            nullif(trim(p_phone),''), nullif(trim(p_email),''))
    returning id into v_patient;
  end if;
  select count(*) into pend from public.appointments a
    where a.patient_id = v_patient and a.source = 'patient' and a.status = 'pending';
  if pend >= 3 then raise exception 'Ya hay varias solicitudes pendientes con estos datos'; end if;
  select count(*) into cnt from public.appointments a
    where a.professional_id = v_pid and a.status <> 'cancelled' and a.start_at = p_start;
  if cnt >= cfg.max_per_slot then raise exception 'Ese horario ya no está disponible'; end if;
  insert into public.appointments (professional_id, patient_id, start_at, end_at, status, area, source, coverage_type, reason)
  values (v_pid, v_patient, p_start,
          p_start + make_interval(mins => coalesce(cfg.slot_minutes, 45)),
          'pending', coalesce(p_area, 'general'), 'patient', 'particular', nullif(trim(p_reason),''));
  select token into v_token from public.patient_portal_tokens
    where patient_id = v_patient and is_active limit 1;
  if v_token is null then
    insert into public.patient_portal_tokens (professional_id, patient_id, scope)
    values (v_pid, v_patient, 'both') returning token into v_token;
  end if;
  return jsonb_build_object('ok', true, 'portal_token', v_token);
end; $$;

grant execute on function public.public_request_appointment(text, text, text, text, text, timestamptz, specialty_area, text) to anon, authenticated;
grant execute on function public.portal_request_appointment(text, timestamptz, specialty_area, int) to anon, authenticated;

-- Columnas y tablas
drop trigger if exists trg_init_payment_settings on public.professionals;
drop function if exists public.fn_init_payment_settings();

drop index if exists public.idx_payments_mp;
drop index if exists public.idx_payments_kind;
alter table public.payments
  drop column if exists mp_payment_id,
  drop column if exists mp_preference_id,
  drop column if exists kind;

drop index if exists public.idx_appointments_deposit_pending;
alter table public.appointments
  drop column if exists deposit_ref,
  drop column if exists deposit_method,
  drop column if exists deposit_paid_at,
  drop column if exists deposit_due_at,
  drop column if exists deposit_amount,
  drop column if exists deposit_status;

alter table public.schedule_settings
  drop constraint if exists chk_deposit_hold,
  drop constraint if exists chk_deposit_amount;
alter table public.schedule_settings
  drop column if exists deposit_note,
  drop column if exists deposit_hold_hours,
  drop column if exists deposit_amount,
  drop column if exists deposit_enabled;

drop table if exists public.payment_settings;

drop type if exists payment_kind;
drop type if exists deposit_status;

commit;
