-- Banco de pruebas: reconstruye lo mínimo del esquema VitaeGest que toca la 0014.
create extension if not exists pgcrypto;

create schema if not exists auth;
-- Stub de auth.uid(): devuelve lo que dejemos en la variable de sesión.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin NEW.updated_at := now(); return NEW; end; $$;

do $$ begin create type specialty_area as enum ('general','pelvic_perineal','dermatofunctional'); exception when duplicate_object then null; end $$;
do $$ begin create type appointment_status as enum ('pending','confirmed','attended','cancelled','no_show'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('cash','transfer','card','mercadopago','other'); exception when duplicate_object then null; end $$;
do $$ begin create type deposit_status as enum ('none','pending','paid','waived','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_kind as enum ('session','deposit'); exception when duplicate_object then null; end $$;

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  full_name text, clinic_name text, license_number text, phone text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  specialties text[] not null default '{}',
  booking_slug text unique default encode(gen_random_bytes(6),'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  first_name text, last_name text, phone text, email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patient_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16),'hex'),
  scope text not null default 'both',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.portal_resolve(p_token text)
returns public.patient_portal_tokens language sql stable as $$
  select * from public.patient_portal_tokens where token = p_token and is_active limit 1;
$$;

create table public.schedule_settings (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.professionals(id) on delete cascade,
  work_start time not null default '08:00',
  work_end   time not null default '20:00',
  slot_minutes int not null default 60,
  max_per_slot int not null default 1,
  working_days int[] not null default '{1,2,3,4,5,6}',
  buffer_minutes int not null default 0,
  booking_enabled boolean not null default false,
  booking_horizon_days int not null default 14,
  deposit_enabled boolean not null default false,
  deposit_amount numeric(12,2) not null default 0,
  deposit_hold_hours int not null default 24,
  deposit_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  start_at timestamptz not null,
  end_at   timestamptz not null,
  status appointment_status not null default 'pending',
  area specialty_area not null default 'general',
  source text not null default 'professional',
  coverage_type text not null default 'particular',
  reason text, notes text, cancel_reason text,
  deposit_status deposit_status not null default 'none',
  deposit_amount numeric(12,2) not null default 0,
  deposit_due_at timestamptz, deposit_paid_at timestamptz,
  deposit_method payment_method, deposit_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  patient_id uuid, appointment_id uuid,
  kind payment_kind not null default 'session',
  amount numeric(12,2) not null default 0,
  status text not null default 'paid', method payment_method,
  paid_at timestamptz, notes text
);

create table public.payment_settings (
  professional_id uuid primary key references public.professionals(id) on delete cascade,
  transfer_enabled boolean not null default true,
  bank_alias text, bank_cbu text, bank_holder text, bank_name text, bank_doc text,
  mp_link_enabled boolean not null default false, mp_link text,
  mp_checkout_enabled boolean not null default false,
  mp_access_token_enc text, mp_public_key text, mp_user_id text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.fn_public_payment_info(p_pid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_build_object('transfer_enabled', ps.transfer_enabled,
    'bank_alias', ps.bank_alias, 'mp_link_enabled', ps.mp_link_enabled), '{}'::jsonb)
  from public.payment_settings ps where ps.professional_id = p_pid;
$$;

-- Trigger de cupo de la 0006 (tal cual, para verificar que sigue aplicando).
create or replace function public.fn_check_slot_capacity()
returns trigger language plpgsql as $$
declare cap int; cnt int;
begin
  if NEW.status = 'cancelled' then return NEW; end if;
  select coalesce(max_per_slot,1) into cap from public.schedule_settings where professional_id = NEW.professional_id;
  if cap is null then cap := 1; end if;
  select count(*) into cnt from public.appointments a
    where a.professional_id = NEW.professional_id and a.id <> NEW.id
      and a.status <> 'cancelled'
      and tstzrange(a.start_at, a.end_at) && tstzrange(NEW.start_at, NEW.end_at);
  if cnt >= cap then raise exception 'Cupo del horario completo (máximo % por bloque).', cap; end if;
  return NEW;
end; $$;

create trigger trg_slot_capacity
  before insert or update of start_at, end_at, status on public.appointments
  for each row execute function public.fn_check_slot_capacity();

-- Función de la 0012 que la 0014 vuelve a declarar. Se deja igual.
create or replace function public.public_booking_info(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin return '{}'::jsonb; end; $$;

create or replace function public.public_booking_slots(p_slug text, p_date date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin return '[]'::jsonb; end; $$;

create or replace function public.public_request_appointment(
  p_slug text, p_first_name text, p_last_name text, p_phone text, p_email text,
  p_start timestamptz, p_area specialty_area, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin return '{}'::jsonb; end; $$;

create or replace function public.portal_available_slots(p_token text, p_date date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin return '[]'::jsonb; end; $$;

create or replace function public.portal_request_appointment(
  p_token text, p_start timestamptz, p_area specialty_area, p_dur int)
returns uuid language plpgsql security definer set search_path = public as $$
begin return null::uuid; end; $$;

-- ── Datos previos: una profesional "de antes", con la config vieja ──────────
insert into public.professionals (id, full_name, clinic_name, booking_slug)
values ('11111111-1111-1111-1111-111111111111', 'Klga. Ana López', 'Centro Kinésico López', 'anaslug');

insert into public.schedule_settings (professional_id, work_start, work_end, slot_minutes,
                                      max_per_slot, working_days, booking_enabled, booking_horizon_days)
values ('11111111-1111-1111-1111-111111111111', '09:00', '19:00', 45, 1, '{1,2,3,4,5}', true, 21);

insert into public.payment_settings (professional_id)
values ('11111111-1111-1111-1111-111111111111');

insert into public.patients (id, professional_id, first_name, last_name, phone)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Sofía','Ruiz','+5493411500022');

-- Un turno viejo, sin sede, para verificar que el backfill lo adopta.
insert into public.appointments (professional_id, patient_id, start_at, end_at, status)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
        '2026-10-05 12:00:00-03', '2026-10-05 12:45:00-03', 'confirmed');
