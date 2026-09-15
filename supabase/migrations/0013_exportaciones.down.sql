-- =============================================================================
-- VitaeGest · 0013_exportaciones.down.sql · Rollback de las exportaciones
-- Solo borra funciones de lectura: no toca ni un dato.
-- =============================================================================

begin;

drop function if exists public.export_patients_list();
drop function if exists public.export_counts();
drop function if exists public.export_backup_part(text);
drop function if exists public.export_patient_record(uuid);
drop function if exists public.export_billing_summary(date, date, text, text);
drop function if exists public.export_billing(date, date, text, text);

commit;
