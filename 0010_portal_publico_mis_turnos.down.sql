-- Reverso de 0010 (parcial). portal_context vuelve a su versión previa reaplicando
-- 0004; acá solo se quitan los objetos aditivos.
begin;
drop function if exists public.public_request_appointment(text, text, text, text, text, timestamptz, specialty_area, text);
drop function if exists public.public_booking_slots(text, date);
alter table public.professionals drop column if exists booking_slug;
commit;
