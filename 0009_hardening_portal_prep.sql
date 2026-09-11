-- =============================================================================
-- VitaeGest · 0009_hardening_portal_prep.sql
-- Blindaje de Nivel 1 que además deja lista la integración del Portal (Nivel 2).
-- Aditivo e idempotente. Aplicar en producción y en el proyecto demo.
--   1) Fix de zona horaria (America/Argentina/Buenos_Aires) en las RPC del portal.
--   2) Guardarraíles de reserva online (horizonte, día laborable, anti-spam).
--   3) Índice para la bandeja de turnos autoagendados.
--   4) Endurecimiento de patient_portal_tokens.
-- =============================================================================
begin;

-- 3) Índice para "turnos reservados por pacientes, a confirmar".
create index if not exists idx_appointments_source_status
  on public.appointments(professional_id, source, status);

-- 4) Tokens del portal: caducidad por defecto + marca de último uso + (opcional)
--    un único token activo por paciente.
alter table public.patient_portal_tokens
  add column if not exists last_used_at timestamptz;
alter table public.patient_portal_tokens
  alter column expires_at set default (now() + interval '180 days');
-- Opinado (comentá si preferís permitir varios tokens activos por paciente):
create unique index if not exists uq_portal_token_active_per_patient
  on public.patient_portal_tokens(patient_id) where is_active;

-- 1) + 2) RPC de disponibilidad de turnos, corregida por zona horaria.
create or replace function public.portal_available_slots(p_token text, p_date date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare tok public.patient_portal_tokens; cfg public.schedule_settings; res jsonb;
begin
  tok := public.portal_resolve(p_token);
  if tok.id is null then raise exception 'Token inválido o expirado'; end if;
  select * into cfg from public.schedule_settings where professional_id = tok.professional_id;
  if cfg.id is null or not cfg.booking_enabled then return '[]'::jsonb; end if;
  if not (extract(isodow from p_date)::int = any(cfg.working_days)) then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'time', to_char(slot,'HH24:MI'),
           'free', (select count(*) from public.appointments a
                      where a.professional_id = tok.professional_id
                        and a.status <> 'cancelled'
                        -- Comparar en horario Argentina, no en UTC del servidor.
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

-- RPC de solicitud de turno, con guardarraíles.
create or replace function public.portal_request_appointment(p_token text, p_start timestamptz, p_area specialty_area, p_dur int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  tok public.patient_portal_tokens; cfg public.schedule_settings;
  cnt int; pend int; newid uuid;
  v_date date; v_today date;
begin
  tok := public.portal_resolve(p_token);
  if tok.id is null then raise exception 'Token inválido o expirado'; end if;
  select * into cfg from public.schedule_settings where professional_id = tok.professional_id;
  if cfg.id is null or not cfg.booking_enabled then raise exception 'Las reservas online no están habilitadas'; end if;

  -- Fecha del turno interpretada en horario Argentina.
  v_date  := (p_start at time zone 'America/Argentina/Buenos_Aires')::date;
  v_today := (now()   at time zone 'America/Argentina/Buenos_Aires')::date;

  if v_date < v_today or v_date > v_today + cfg.booking_horizon_days then
    raise exception 'La fecha está fuera del período de reserva permitido';
  end if;
  if not (extract(isodow from v_date)::int = any(cfg.working_days)) then
    raise exception 'Ese día no está habilitado para turnos';
  end if;

  -- Anti-spam: máximo de solicitudes pendientes por paciente.
  select count(*) into pend from public.appointments a
    where a.patient_id = tok.patient_id and a.source = 'patient' and a.status = 'pending';
  if pend >= 3 then raise exception 'Ya tenés varias solicitudes pendientes de confirmación'; end if;

  -- Cupo del horario.
  select count(*) into cnt from public.appointments a
    where a.professional_id = tok.professional_id and a.status <> 'cancelled' and a.start_at = p_start;
  if cnt >= cfg.max_per_slot then raise exception 'Ese horario ya no está disponible'; end if;

  insert into public.appointments (professional_id, patient_id, start_at, end_at, status, area, source, coverage_type)
  values (tok.professional_id, tok.patient_id, p_start,
          p_start + make_interval(mins => coalesce(p_dur, cfg.slot_minutes)), 'pending', p_area, 'patient', 'particular')
  returning id into newid;
  return newid;
end; $$;

-- Re-otorgar permisos (create or replace conserva grants, pero por las dudas).
grant execute on function public.portal_available_slots(text, date)                              to anon, authenticated;
grant execute on function public.portal_request_appointment(text, timestamptz, specialty_area, int) to anon, authenticated;

commit;
