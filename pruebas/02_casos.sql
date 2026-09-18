\set ON_ERROR_STOP on
\pset pager off
\set PID '''11111111-1111-1111-1111-111111111111'''
\set TOK '''tok-sofia'''

\echo '=== 1 · BACKFILL: la config vieja se convirtió en bloques ==='
select l.name as sede, l.is_default, count(b.id) as bloques
  from public.locations l
  left join public.schedule_blocks b on b.location_id = l.id
 where l.professional_id = :PID
 group by l.name, l.is_default;

select weekday, to_char(start_time,'HH24:MI') as desde, to_char(end_time,'HH24:MI') as hasta
  from public.schedule_blocks where professional_id = :PID order by weekday;

\echo '=== 2 · El turno viejo adoptó la sede por defecto ==='
select (a.location_id is not null) as tiene_sede, l.name
  from public.appointments a left join public.locations l on l.id = a.location_id
 where a.professional_id = :PID;

\echo '=== 3 · Las columnas viejas siguen coherentes ==='
select working_days, to_char(work_start,'HH24:MI') as ini, to_char(work_end,'HH24:MI') as fin
  from public.schedule_settings where professional_id = :PID;

\echo '=== 4 · Disponibilidad: lunes 09:00-19:00 cada 45 min = 13 slots ==='
select jsonb_array_length(public.public_booking_slots('anaslug', date '2026-10-05')) as slots_lunes,
       jsonb_array_length(public.public_booking_slots('anaslug', date '2026-10-04')) as slots_domingo;

\echo '=== 5 · El turno de las 12:00 aparece ocupado ==='
select s->>'time' as hora, s->>'free' as libre
  from jsonb_array_elements(public.public_booking_slots('anaslug', date '2026-10-05')) s
 where s->>'time' in ('11:15','12:00','12:45');

-- ── Ahora la configuración nueva ───────────────────────────────────────────
\echo '=== 6 · Segunda sede + jornada partida ==='
insert into public.locations (id, professional_id, name, address, color, sort)
values ('33333333-3333-3333-3333-333333333333', :PID, 'Espacio Norte', 'Av. Norte 1200', '#E8705F', 1);

delete from public.schedule_blocks where professional_id = :PID;

-- Lunes y miércoles en el Centro, 09 a 13
insert into public.schedule_blocks (professional_id, location_id, weekday, start_time, end_time, slot_minutes)
select :PID, (select id from public.locations where professional_id = :PID and is_default), d, '09:00', '13:00', 60
  from unnest(array[1,3]::smallint[]) d;

-- Martes y jueves en el Norte, 14 a 20
insert into public.schedule_blocks (professional_id, location_id, weekday, start_time, end_time, slot_minutes)
select :PID, '33333333-3333-3333-3333-333333333333', d, '14:00', '20:00', 60
  from unnest(array[2,4]::smallint[]) d;

-- Viernes partido: mañana en el Centro, tarde en el Norte
insert into public.schedule_blocks (professional_id, location_id, weekday, start_time, end_time, slot_minutes)
values (:PID, (select id from public.locations where professional_id = :PID and is_default), 5, '09:00','12:00', 60),
       (:PID, '33333333-3333-3333-3333-333333333333', 5, '16:00','20:00', 60);

select weekday,
       to_char(start_time,'HH24:MI') || '-' || to_char(end_time,'HH24:MI') as tramo,
       (select name from public.locations where id = location_id) as sede
  from public.schedule_blocks where professional_id = :PID
 order by weekday, start_time;

\echo '=== 7 · Las columnas viejas se resincronizaron solas ==='
select working_days, to_char(work_start,'HH24:MI') as ini, to_char(work_end,'HH24:MI') as fin
  from public.schedule_settings where professional_id = :PID;

\echo '=== 8 · Slots del viernes (jornada partida): 3 a la mañana + 4 a la tarde ==='
select s->>'time' as hora, s->>'location_name' as sede
  from jsonb_array_elements(public.public_booking_slots('anaslug', date '2026-10-09')) s;

\echo '=== 9 · Filtrado por sede: solo el Norte del viernes ==='
select count(*) as slots_norte
  from jsonb_array_elements(
    public.public_booking_slots('anaslug', date '2026-10-09',
                                '33333333-3333-3333-3333-333333333333')) s;

\echo '=== 10 · Martes: solo tarde, en el Norte ==='
select min(s->>'time') as primero, max(s->>'time') as ultimo, count(*) as total,
       min(s->>'location_name') as sede
  from jsonb_array_elements(public.public_booking_slots('anaslug', date '2026-10-06')) s;

\echo '=== 11 · public_booking_info lista las sedes ==='
select jsonb_pretty(public.public_booking_info('anaslug') -> 'locations');

\echo '=== 12 · Reserva pública en el Norte, martes 15:00 ==='
select public.public_request_appointment(
  'anaslug','Mara','Gómez','+549341500999',null,
  '2026-10-06 15:00:00-03'::timestamptz,'pelvic_perineal','Consulta inicial',
  '33333333-3333-3333-3333-333333333333') -> 'location' as sede_asignada;

\echo '=== 13 · El mismo horario ya no está libre ==='
select s->>'free' as libre
  from jsonb_array_elements(public.public_booking_slots('anaslug', date '2026-10-06')) s
 where s->>'time' = '15:00';

\echo '=== 14 · No se puede reservar un horario fuera de tramo (martes 09:00) ==='
do $$ begin
  perform public.public_request_appointment('anaslug','Test','Fuera','+5490001',null,
    '2026-10-06 09:00:00-03'::timestamptz,'general',null,null);
  raise exception 'FALLO: aceptó un horario fuera de tramo';
exception when others then
  if sqlerrm like '%no están habilitados%' then raise notice 'OK · rechazado: %', sqlerrm;
  else raise; end if;
end $$;

\echo '=== 15 · No se puede reservar en una sede donde ese día no atiende ==='
do $$ begin
  perform public.public_request_appointment('anaslug','Test','Sede','+5490002',null,
    '2026-10-06 15:00:00-03'::timestamptz,'general',null,
    (select id from public.locations where name = 'Centro Kinésico López'));
  raise exception 'FALLO: aceptó una sede equivocada';
exception when others then
  if sqlerrm like '%no están habilitados%' then raise notice 'OK · rechazado: %', sqlerrm;
  else raise; end if;
end $$;

\echo '=== 16 · Dos sedes NO duplican la agenda: mismo horario, otra sede ==='
do $$
declare v_start timestamptz := '2026-10-09 16:00:00-03';
begin
  -- Primero se ocupa en el Norte (viernes tarde).
  perform public.public_request_appointment('anaslug','Uno','Norte','+5490003',null,
    v_start,'general',null,'33333333-3333-3333-3333-333333333333');
  -- Ahora se intenta el mismo horario, cualquier sede.
  begin
    perform public.public_request_appointment('anaslug','Dos','Choque','+5490004',null,
      v_start,'general',null,null);
    raise exception 'FALLO: permitió estar en dos lugares a la vez';
  exception when others then
    if sqlerrm like '%ya no está disponible%' or sqlerrm like '%Cupo del horario%'
      then raise notice 'OK · rechazado: %', sqlerrm;
      else raise; end if;
  end;
end $$;

\echo '=== 17 · Bloques superpuestos rechazados, aunque sean de sedes distintas ==='
do $$ begin
  insert into public.schedule_blocks (professional_id, location_id, weekday, start_time, end_time)
  values ('11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333', 1, '12:00', '15:00');
  raise exception 'FALLO: aceptó bloques superpuestos';
exception when others then
  if sqlerrm like '%se superpone%' then raise notice 'OK · rechazado: %', sqlerrm;
  else raise; end if;
end $$;

\echo '=== 18 · Modo compatibilidad: sin bloques, vuelve al rango genérico ==='
do $$
declare v_slots int;
begin
  delete from public.schedule_blocks where professional_id = '11111111-1111-1111-1111-111111111111';
  update public.schedule_settings
     set working_days = '{1,2,3,4,5}', work_start='09:00', work_end='19:00', slot_minutes=45
   where professional_id = '11111111-1111-1111-1111-111111111111';
  select jsonb_array_length(public.public_booking_slots('anaslug', date '2026-10-05')) into v_slots;
  raise notice 'Slots del lunes sin bloques: % (esperado 13)', v_slots;
  if v_slots <> 13 then raise exception 'FALLO: el fallback no devolvió los slots de siempre'; end if;
end $$;

\echo '=== 19 · save_schedule_blocks desde el panel ==='
select set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);
select public.save_schedule_blocks('[
  {"weekday":1,"start":"09:00","end":"13:00"},
  {"weekday":1,"start":"16:00","end":"20:00"},
  {"weekday":3,"start":"09:00","end":"13:00"}
]'::jsonb);

select weekday, to_char(start_time,'HH24:MI')||'-'||to_char(end_time,'HH24:MI') as tramo
  from public.schedule_blocks where professional_id = :PID order by weekday, start_time;

\echo '=== 20 · Portal: disponibilidad y reserva ==='
insert into public.patient_portal_tokens (professional_id, patient_id, token)
values (:PID, '22222222-2222-2222-2222-222222222222', 'tok-sofia');

select jsonb_array_length(public.portal_available_slots('tok-sofia', date '2026-10-05')) as slots_portal_lunes;

\echo '=== TODAS LAS PRUEBAS PASARON ==='
