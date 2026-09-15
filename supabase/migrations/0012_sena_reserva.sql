-- =============================================================================
-- VitaeGest · 0012_sena_reserva.sql
-- Seña / reserva del turno (ADITIVA e IDEMPOTENTE).
--
-- Qué agrega:
--   1) payment_settings  → datos de cobro del profesional (alias, CBU, titular,
--      link propio de Mercado Pago) + slots preparados para Checkout Pro.
--   2) schedule_settings → si cobra seña, cuánto y cuántas horas retiene el turno.
--   3) appointments      → estado de la seña de ESE turno (monto congelado).
--   4) payments.kind     → separa la seña del cobro de la sesión.
--   5) RPCs públicas     → la landing /agendar informa la seña y devuelve los
--      datos de pago; las privadas marcan pagada / eximida.
--   6) release_expired_deposits() → libera el cupo de las señas vencidas.
--
-- Regla de negocio elegida: el turno con seña entra 'pending' + deposit 'pending'
-- y OCUPA el cupo hasta que venza. El profesional confirma cuando ve la plata.
--
-- Rollback: 0012_sena_reserva.down.sql
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type deposit_status as enum (
    'none',      -- este turno no lleva seña
    'pending',   -- esperando el pago
    'paid',      -- la profesional confirmó que entró
    'waived',    -- eximida a mano (paciente conocida, obra social, etc.)
    'expired'    -- venció el plazo sin pagar
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_kind as enum ('session', 'deposit');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 1) PAYMENT_SETTINGS · cómo cobra cada profesional (1 fila por tenant)
--    Tabla aparte, no columnas en `professionals`: el token de Mercado Pago
--    NO puede viajar en cada select del perfil.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_settings (
  professional_id  uuid primary key references public.professionals(id) on delete cascade,

  -- Transferencia (etapa 1 · funciona el día 1, sin integración)
  transfer_enabled boolean not null default true,
  bank_alias       text,          -- ej: "ana.lopez.kine"
  bank_cbu         text,          -- CBU / CVU
  bank_holder      text,          -- titular de la cuenta
  bank_name        text,          -- banco o billetera
  bank_doc         text,          -- CUIT/CUIL del titular (algunos bancos lo piden)

  -- Link de cobro propio de Mercado Pago, pegado a mano (etapa 1)
  mp_link_enabled  boolean not null default false,
  mp_link          text,          -- https://mpago.la/...

  -- Checkout Pro (etapa 2 · preparado, apagado)
  -- El access token se guarda cifrado por la app antes de escribir acá.
  -- NUNCA se expone en una RPC pública ni llega al navegador.
  mp_checkout_enabled boolean not null default false,
  mp_access_token_enc text,
  mp_public_key       text,
  mp_user_id          text,

  instructions     text,          -- texto libre que ve la paciente al reservar
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_payment_settings_updated_at on public.payment_settings;
create trigger trg_payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();

alter table public.payment_settings enable row level security;
do $$ begin
  create policy "tenant all" on public.payment_settings
    for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Fila vacía para cada profesional existente (y para los nuevos, más abajo).
insert into public.payment_settings (professional_id)
  select id from public.professionals
  on conflict (professional_id) do nothing;


-- ---------------------------------------------------------------------------
-- 2) SCHEDULE_SETTINGS · configuración de la seña
-- ---------------------------------------------------------------------------
alter table public.schedule_settings
  add column if not exists deposit_enabled    boolean       not null default false,
  add column if not exists deposit_amount     numeric(12,2) not null default 0,
  add column if not exists deposit_hold_hours int           not null default 24,
  add column if not exists deposit_note       text;

do $$ begin
  alter table public.schedule_settings
    add constraint chk_deposit_amount check (deposit_amount >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.schedule_settings
    add constraint chk_deposit_hold check (deposit_hold_hours between 1 and 168);
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 3) APPOINTMENTS · estado de la seña de ese turno
--    deposit_amount se congela al reservar: si mañana sube el precio, este
--    turno mantiene lo que se le informó a la paciente.
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists deposit_status  deposit_status not null default 'none',
  add column if not exists deposit_amount  numeric(12,2)  not null default 0,
  add column if not exists deposit_due_at  timestamptz,
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists deposit_method  payment_method,
  add column if not exists deposit_ref     text;   -- nº de operación / comprobante

create index if not exists idx_appointments_deposit_pending
  on public.appointments (professional_id, deposit_due_at)
  where deposit_status = 'pending';


-- ---------------------------------------------------------------------------
-- 4) PAYMENTS · distinguir seña de sesión + trazas de Mercado Pago
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists kind              payment_kind not null default 'session',
  add column if not exists mp_preference_id  text,
  add column if not exists mp_payment_id     text;

create index if not exists idx_payments_kind on public.payments(professional_id, kind);
create index if not exists idx_payments_mp on public.payments(mp_payment_id);


-- ---------------------------------------------------------------------------
-- 5) Trigger: fila de payment_settings al crear un profesional nuevo
--    (extiende handle_new_user sin pisarlo: trigger propio sobre professionals)
-- ---------------------------------------------------------------------------
create or replace function public.fn_init_payment_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.payment_settings (professional_id) values (NEW.id)
    on conflict (professional_id) do nothing;
  return NEW;
end; $$;

drop trigger if exists trg_init_payment_settings on public.professionals;
create trigger trg_init_payment_settings after insert on public.professionals
  for each row execute function public.fn_init_payment_settings();


-- ---------------------------------------------------------------------------
-- 6) Helper interno: arma el bloque de datos de pago que SÍ puede ver el público
--    (nunca toca mp_access_token_enc)
-- ---------------------------------------------------------------------------
create or replace function public.fn_public_payment_info(p_pid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_build_object(
    'transfer_enabled', ps.transfer_enabled,
    'bank_alias',  ps.bank_alias,
    'bank_cbu',    ps.bank_cbu,
    'bank_holder', ps.bank_holder,
    'bank_name',   ps.bank_name,
    'bank_doc',    ps.bank_doc,
    'mp_link_enabled', ps.mp_link_enabled,
    'mp_link',     case when ps.mp_link_enabled then ps.mp_link else null end,
    'mp_checkout_enabled', ps.mp_checkout_enabled,
    'instructions', ps.instructions
  ), '{}'::jsonb)
  from public.payment_settings ps where ps.professional_id = p_pid;
$$;


-- ---------------------------------------------------------------------------
-- 7) RPC pública: qué necesita saber la landing /agendar/<slug> ANTES de reservar
-- ---------------------------------------------------------------------------
create or replace function public.public_booking_info(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_pid uuid; cfg public.schedule_settings; prof public.professionals;
begin
  select * into prof from public.professionals where booking_slug = p_slug;
  if prof.id is null then raise exception 'Enlace inválido'; end if;
  v_pid := prof.id;
  select * into cfg from public.schedule_settings where professional_id = v_pid;

  return jsonb_build_object(
    'professional', jsonb_build_object(
        'full_name',   prof.full_name,
        'clinic_name', prof.clinic_name,
        'timezone',    prof.timezone),
    'booking_enabled',      coalesce(cfg.booking_enabled, false),
    'booking_horizon_days', coalesce(cfg.booking_horizon_days, 14),
    'slot_minutes',         coalesce(cfg.slot_minutes, 45),
    'deposit', jsonb_build_object(
        'enabled',     coalesce(cfg.deposit_enabled, false),
        'amount',      coalesce(cfg.deposit_amount, 0),
        'hold_hours',  coalesce(cfg.deposit_hold_hours, 24),
        'note',        cfg.deposit_note),
    'payment', case when coalesce(cfg.deposit_enabled, false)
                    then public.fn_public_payment_info(v_pid)
                    else '{}'::jsonb end
  );
end; $$;


-- ---------------------------------------------------------------------------
-- 8) public_request_appointment v2 · ahora aplica la seña y devuelve los datos
--    de pago. Misma firma que la 0010: no rompe al cliente existente, solo
--    agrega claves al JSON de respuesta.
-- ---------------------------------------------------------------------------
create or replace function public.public_request_appointment(
  p_slug text, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_start timestamptz, p_area specialty_area, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid; cfg public.schedule_settings; v_patient uuid; v_token text;
  v_date date; v_today date; cnt int; pend int;
  v_appt uuid; v_dep_status deposit_status := 'none';
  v_dep_amount numeric(12,2) := 0; v_dep_due timestamptz;
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

  -- Seña: se congela el monto vigente y se fija el vencimiento.
  if coalesce(cfg.deposit_enabled, false) and coalesce(cfg.deposit_amount, 0) > 0 then
    v_dep_status := 'pending';
    v_dep_amount := cfg.deposit_amount;
    -- Nunca vence después de que empiece el turno.
    v_dep_due := least(now() + make_interval(hours => cfg.deposit_hold_hours), p_start);
  end if;

  insert into public.appointments (
      professional_id, patient_id, start_at, end_at, status, area, source,
      coverage_type, reason, deposit_status, deposit_amount, deposit_due_at)
  values (v_pid, v_patient, p_start,
          p_start + make_interval(mins => coalesce(cfg.slot_minutes, 45)),
          'pending', coalesce(p_area, 'general'), 'patient', 'particular',
          nullif(trim(p_reason),''), v_dep_status, v_dep_amount, v_dep_due)
  returning id into v_appt;

  -- Token de portal para que siga su turno (reusa el activo si existe).
  select token into v_token from public.patient_portal_tokens
    where patient_id = v_patient and is_active limit 1;
  if v_token is null then
    insert into public.patient_portal_tokens (professional_id, patient_id, scope)
    values (v_pid, v_patient, 'both') returning token into v_token;
  end if;

  return jsonb_build_object(
    'ok', true,
    'portal_token', v_token,
    'appointment_id', v_appt,
    'deposit', jsonb_build_object(
        'required', v_dep_status = 'pending',
        'amount',   v_dep_amount,
        'due_at',   v_dep_due,
        'note',     cfg.deposit_note),
    'payment', case when v_dep_status = 'pending'
                    then public.fn_public_payment_info(v_pid)
                    else '{}'::jsonb end
  );
end; $$;


-- ---------------------------------------------------------------------------
-- 9) portal_request_appointment v2 · misma lógica de seña para la paciente
--    que ya tiene portal.
-- ---------------------------------------------------------------------------
create or replace function public.portal_request_appointment(
  p_token text, p_start timestamptz, p_area specialty_area, p_dur int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  tok public.patient_portal_tokens; cfg public.schedule_settings; cnt int; newid uuid;
  v_dep_status deposit_status := 'none'; v_dep_amount numeric(12,2) := 0; v_dep_due timestamptz;
begin
  tok := public.portal_resolve(p_token);
  if tok.id is null then raise exception 'Token inválido o expirado'; end if;
  select * into cfg from public.schedule_settings where professional_id = tok.professional_id;
  if cfg.id is null or not cfg.booking_enabled then raise exception 'Las reservas online no están habilitadas'; end if;
  select count(*) into cnt from public.appointments a
    where a.professional_id = tok.professional_id and a.status <> 'cancelled' and a.start_at = p_start;
  if cnt >= cfg.max_per_slot then raise exception 'Ese horario ya no está disponible'; end if;

  if coalesce(cfg.deposit_enabled, false) and coalesce(cfg.deposit_amount, 0) > 0 then
    v_dep_status := 'pending';
    v_dep_amount := cfg.deposit_amount;
    v_dep_due := least(now() + make_interval(hours => cfg.deposit_hold_hours), p_start);
  end if;

  insert into public.appointments (
      professional_id, patient_id, start_at, end_at, status, area, source, coverage_type,
      deposit_status, deposit_amount, deposit_due_at)
  values (tok.professional_id, tok.patient_id, p_start,
          p_start + make_interval(mins => coalesce(p_dur, cfg.slot_minutes)),
          'pending', p_area, 'patient', 'particular',
          v_dep_status, v_dep_amount, v_dep_due)
  returning id into newid;
  return newid;
end; $$;


-- ---------------------------------------------------------------------------
-- 10) RPCs privadas del panel. SECURITY INVOKER a propósito:
--     el RLS existente ya impide tocar turnos de otra profesional.
-- ---------------------------------------------------------------------------

-- Marca la seña como cobrada, deja el registro en `payments` (kind='deposit')
-- y confirma el turno en el mismo movimiento.
create or replace function public.mark_deposit_paid(
  p_appointment uuid,
  p_method payment_method default 'transfer',
  p_amount numeric default null,
  p_ref text default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare a public.appointments; v_amount numeric(12,2); v_payment uuid;
begin
  select * into a from public.appointments where id = p_appointment;
  if a.id is null then raise exception 'Turno inexistente o sin acceso'; end if;
  if a.deposit_status = 'paid' then raise exception 'Esta seña ya figura cobrada'; end if;

  v_amount := coalesce(p_amount, a.deposit_amount, 0);

  update public.appointments
     set deposit_status = 'paid',
         deposit_paid_at = now(),
         deposit_method  = p_method,
         deposit_ref     = nullif(trim(p_ref), ''),
         deposit_amount  = v_amount,
         status = case when status = 'pending' then 'confirmed'::appointment_status else status end
   where id = p_appointment;

  insert into public.payments (
      professional_id, patient_id, appointment_id, kind, amount,
      status, method, paid_at, notes)
  values (a.professional_id, a.patient_id, a.id, 'deposit', v_amount,
          'paid', p_method, now(),
          coalesce('Seña de reserva' || case when p_ref is not null then ' · ' || p_ref else '' end,
                   'Seña de reserva'))
  returning id into v_payment;

  return jsonb_build_object('ok', true, 'payment_id', v_payment, 'amount', v_amount);
end; $$;

-- Exime la seña (paciente conocida, obra social, lo que sea) y confirma.
create or replace function public.waive_deposit(p_appointment uuid, p_reason text default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
begin
  update public.appointments
     set deposit_status = 'waived',
         deposit_ref = nullif(trim(p_reason), ''),
         status = case when status = 'pending' then 'confirmed'::appointment_status else status end
   where id = p_appointment;
  if not found then raise exception 'Turno inexistente o sin acceso'; end if;
  return jsonb_build_object('ok', true);
end; $$;


-- ---------------------------------------------------------------------------
-- 11) Liberar señas vencidas.
--     Cancela el turno (libera el cupo) y marca la seña 'expired'.
--     Se puede llamar a mano desde el panel, o agendar con pg_cron.
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_deposits()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with vencidas as (
    update public.appointments
       set deposit_status = 'expired',
           status = 'cancelled',
           notes = concat_ws(E'\n', notes, 'Cancelado automáticamente: la seña no se pagó a tiempo.')
     where deposit_status = 'pending'
       and deposit_due_at is not null
       and deposit_due_at < now()
       and status in ('pending', 'confirmed')
    returning 1)
  select count(*) into n from vencidas;
  return n;
end; $$;

-- Agendalo una vez por hora (opcional, requiere pg_cron habilitado):
--   select cron.schedule('vitaegest-release-deposits', '5 * * * *',
--                        $$select public.release_expired_deposits();$$);


-- ---------------------------------------------------------------------------
-- 12) Grants
-- ---------------------------------------------------------------------------
grant execute on function public.public_booking_info(text)                                 to anon, authenticated;
grant execute on function public.public_request_appointment(text, text, text, text, text, timestamptz, specialty_area, text) to anon, authenticated;
grant execute on function public.portal_request_appointment(text, timestamptz, specialty_area, int) to anon, authenticated;
grant execute on function public.mark_deposit_paid(uuid, payment_method, numeric, text)    to authenticated;
grant execute on function public.waive_deposit(uuid, text)                                 to authenticated;
grant execute on function public.release_expired_deposits()                                to authenticated;

-- fn_public_payment_info es un helper interno: NO se expone a anon.
revoke execute on function public.fn_public_payment_info(uuid) from anon, authenticated;

commit;

-- =============================================================================
-- Notas
--  * El turno con seña pendiente OCUPA el cupo hasta `deposit_due_at`. Es
--    deliberado: si no retuviera el horario, la seña no serviría para nada.
--  * `deposit_amount` queda congelado en el turno. Cambiar el precio en
--    Configuración no altera las reservas ya tomadas.
--  * `mp_access_token_enc` se escribe SIEMPRE cifrado desde la app y nunca se
--    lee desde el navegador: solo lo toca el Route Handler del servidor.
--  * Las señas cobradas entran en `payments` con kind='deposit', así el módulo
--    de facturación las suma sin tratarlas como una sesión más.
-- =============================================================================
