-- =============================================================================
-- VitaeGest · reset_demo.sql   (SOLO proyecto DEMO)
-- Reinicio automático nocturno del escenario de ventas.
-- Requiere haber corrido antes seed_system.sql y seed_demo.sql (que define seed_demo()).
-- =============================================================================

-- 1) Habilitar pg_cron (una sola vez). También podés hacerlo desde
--    Database → Extensions en el panel de Supabase.
create extension if not exists pg_cron;

-- 2) Wrapper de reinicio: seed_demo() ya borra y recarga de forma idempotente.
create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_demo();
end;
$$;

-- 3) Programar todos los días a las 04:00 ART (= 07:00 UTC).
--    Si ya existe un job con este nombre, primero desprogramarlo:
--    select cron.unschedule('reset-demo-diario');
select cron.schedule('reset-demo-diario', '0 7 * * *', $$ select public.reset_demo(); $$);

-- Para verificar los jobs programados:
--   select * from cron.job;
-- Para correr el reinicio a mano en cualquier momento:
--   select public.reset_demo();
