-- =============================================================================
-- VitaeGest · 0010_portal_publico_mis_turnos.sql
-- Aditivo e idempotente. Aplicar en producción y en el proyecto demo.
--   1) portal_context ahora devuelve `scope` (del token) y `appointments`
--      (próximos turnos del paciente con su estado) → sección "Mis Turnos".
--   2) professionals.booking_slug: enlace público de agendamiento por profesional.
--   3) RPC public_booking_slots + public_request_appointment: alta de paciente
--      nuevo + turno pendiente desde una landing pública, sin login.
-- =============================================================================
begin;

-- 2) Slug público por profesional (único, aleatorio).
alter table public.professionals
  add column if not exists booking_slug text unique default encode(gen_random_bytes(6), 'hex');
-- Backfill defensivo por si alguna fila quedó sin slug.
update public.professionals set booking_slug = encode(gen_random_bytes(6), 'hex')
  where booking_slug is null;

-- 1) portal_context ampliado: + scope + appointments (próximos, no cancelados).
create or replace function public.portal_context(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare tok public.patient_portal_tokens; pl public.exercise_plans; result jsonb;
begin
  tok := public.portal_resolve(p_token);
  if tok.id is null then raise exception 'Token inválido o expirado'; end if;

  select * into pl from public.exercise_plans
    where patient_id = tok.patient_id and is_active = true
    order by created_at desc limit 1;

  select jsonb_build_object(
    'patient', (select jsonb_build_object('first_name', split_part(first_name,' ',1))
                  from public.patients where id = tok.patient_id),
    'scope', tok.scope,
    'plan', to_jsonb(pl),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort)
                        from public.exercise_items i where i.plan_id = pl.id), '[]'::jsonb),
    'logs_today', coalesce((select jsonb_agg(to_jsonb(l))
                        from public.exercise_logs l
                        where l.patient_id = tok.patient_id and l.log_date = current_date), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c))
                        from (select * from public.patient_checkins
                               where patient_id = tok.patient_id
                               order by checkin_date desc limit 7) c), '[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(jsonb_build_object(
                        'id', a.id, 'start_at', a.start_at, 'status', a.status,
                        'area', a.area, 'reason', a.reason) order by a.start_at)
                        from public.appointments a
                        where a.patient_id = tok.patient_id
                          and a.status <> 'cancelled'
                          and a.start_at >= (now() - interval '12 hours')), '[]'::jsonb)
  ) into result;
  return result;
end; $$;

-- 3a) Disponibilidad pública por slug (misma lógica TZ que el portal).
create or replace function public.public_booking_slots(p_slug text, p_date date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pid uuid; cfg public.schedule_settings; res jsonb;
begin
  select id into v_pid from public.professionals where booking_slug = p_slug;
  if v_pid is null then raise exception 'Enlace inválido'; end if;
  select * into cfg from public.schedule_settings where professional_id = v_pid;
  if cfg.id is null or not cfg.booking_enabled then return '[]'::jsonb; end if;
  if not (extract(isodow from p_date)::int = any(cfg.working_days)) then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'time', to_char(slot,'HH24:MI'),
           'free', (select count(*) from public.appointments a
                      where a.professional_id = v_pid
                        and a.status <> 'cancelled'
                        and (a.start_at at time zone 'America/Argentina/Buenos_Aires')::date = p_date
                        and (a.start_at at time zone 'America/Argentina/Buenos_Aires')::time = slot::time
                   ) < cfg.max_per_slot
         ) order by slot), '[]'::jsonb)
    into res
    from generate_series((p_date + cfg.work_start)::timestamp,
                         (p_date + cfg.work_end)::timestamp - make_interval(mins => cfg.slot_minutes),
                         make_interval(mins => cfg.slot_minutes)) as slot;
  return res;
end; $$;

-- 3b) Alta de paciente nuevo + turno pendiente desde la landing pública.
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

  -- Dedupe por teléfono; si no existe, se crea el paciente.
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

  -- Anti-spam.
  select count(*) into pend from public.appointments a
    where a.patient_id = v_patient and a.source = 'patient' and a.status = 'pending';
  if pend >= 3 then raise exception 'Ya hay varias solicitudes pendientes con estos datos'; end if;

  -- Cupo del horario.
  select count(*) into cnt from public.appointments a
    where a.professional_id = v_pid and a.status <> 'cancelled' and a.start_at = p_start;
  if cnt >= cfg.max_per_slot then raise exception 'Ese horario ya no está disponible'; end if;

  insert into public.appointments (professional_id, patient_id, start_at, end_at, status, area, source, coverage_type, reason)
  values (v_pid, v_patient, p_start,
          p_start + make_interval(mins => coalesce(cfg.slot_minutes, 45)),
          'pending', coalesce(p_area, 'general'), 'patient', 'particular', nullif(trim(p_reason),''));

  -- Token de portal para que siga su turno (reusa el activo si existe).
  select token into v_token from public.patient_portal_tokens
    where patient_id = v_patient and is_active limit 1;
  if v_token is null then
    insert into public.patient_portal_tokens (professional_id, patient_id, scope)
    values (v_pid, v_patient, 'both') returning token into v_token;
  end if;

  return jsonb_build_object('ok', true, 'portal_token', v_token);
end; $$;

grant execute on function public.public_booking_slots(text, date)                                              to anon, authenticated;
grant execute on function public.public_request_appointment(text, text, text, text, text, timestamptz, specialty_area, text) to anon, authenticated;

commit;
