-- Reverso de 0009_hardening_portal_prep.sql (parcial: revierte objetos aditivos).
-- Las funciones portal_* quedan en su versión corregida; para volver a la anterior
-- reaplicá el cuerpo de 0006_reservas_online.sql.
begin;

drop index if exists public.idx_appointments_source_status;
drop index if exists public.uq_portal_token_active_per_patient;

alter table public.patient_portal_tokens alter column expires_at drop default;
alter table public.patient_portal_tokens drop column if exists last_used_at;

commit;
