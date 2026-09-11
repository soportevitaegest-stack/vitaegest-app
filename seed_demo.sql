-- =============================================================================
-- VitaeGest · seed_demo.sql   (SOLO entorno DEMO — nunca en un cliente real)
--
-- Define la función public.seed_demo() con el escenario de ventas y la ejecuta
-- una vez. La función es IDEMPOTENTE: borra los datos de negocio del profesional
-- demo (el más antiguo) y los vuelve a cargar. El job nocturno la reutiliza.
--
-- Requiere: esquema aplicado + haber creado la cuenta demo (auth) + seed_system.sql.
-- =============================================================================

-- Salvaguarda aditiva (por si no se aplicó 0005/0006).
alter table public.appointments
  add column if not exists area specialty_area not null default 'general';

create or replace function public.seed_demo()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_pid  uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid;
  i_osde uuid; i_ioma uuid; i_pami uuid; i_swiss uuid;
  o1 uuid; o3 uuid; o4 uuid; o6 uuid;
  pl1 uuid; pl4 uuid; pl6 uuid;
  v_diary uuid;
  d0 date := current_date;
begin
  -- Profesional demo: el más antiguo de la tabla.
  select id into v_pid from public.professionals order by created_at asc limit 1;
  if v_pid is null then
    raise notice 'No hay ningún profesional. Registrá la cuenta demo (auth) y volvé a correr.';
    return;
  end if;

  -- Desactivar triggers de la agenda para poder cargar estados finales.
  alter table public.appointments disable trigger trg_consume_order;
  alter table public.appointments disable trigger trg_slot_capacity;

  -- Limpieza idempotente (hijos → padres).
  delete from public.exercise_logs         where professional_id = v_pid;
  delete from public.exercise_items        where professional_id = v_pid;
  delete from public.exercise_plans        where professional_id = v_pid;
  delete from public.patient_checkins      where professional_id = v_pid;
  delete from public.voiding_diary_entries where professional_id = v_pid;
  delete from public.voiding_diaries       where professional_id = v_pid;
  delete from public.patient_portal_tokens where professional_id = v_pid;
  delete from public.clinical_assessments  where professional_id = v_pid;
  delete from public.clinical_evolutions   where professional_id = v_pid;
  delete from public.attachments           where professional_id = v_pid;
  delete from public.payments              where professional_id = v_pid;
  delete from public.appointments          where professional_id = v_pid;
  delete from public.treatment_orders      where professional_id = v_pid;
  delete from public.services              where professional_id = v_pid;
  delete from public.patients              where professional_id = v_pid;
  delete from public.insurers              where professional_id = v_pid;

  -- Perfil, agenda y catálogos.
  update public.professionals
     set full_name = coalesce(nullif(full_name,''), 'Klga. Valeria Méndez'),
         license_number = coalesce(license_number, 'M.N. 12.345'),
         clinic_name = coalesce(clinic_name, 'VitaeGest · Consultorio Kinésico'),
         specialties = array['pelvic_perineal','dermatofunctional']
   where id = v_pid;

  insert into public.schedule_settings (professional_id, work_start, work_end, slot_minutes,
                                        max_per_slot, working_days, booking_enabled, booking_horizon_days)
  values (v_pid, '08:00', '20:00', 60, 1, '{1,2,3,4,5,6}', true, 14)
  on conflict (professional_id) do update
     set work_start=excluded.work_start, work_end=excluded.work_end, slot_minutes=excluded.slot_minutes,
         max_per_slot=excluded.max_per_slot, working_days=excluded.working_days,
         booking_enabled=excluded.booking_enabled, booking_horizon_days=excluded.booking_horizon_days;

  insert into public.insurers (professional_id, name, plan, region, default_copay, default_stamp, source)
    values (v_pid,'OSDE','Plan 210','CABA',2000,0,'manual')            returning id into i_osde;
  insert into public.insurers (professional_id, name, plan, region, default_copay, default_stamp, source)
    values (v_pid,'IOMA',null,'Buenos Aires',0,0,'manual')             returning id into i_ioma;
  insert into public.insurers (professional_id, name, plan, region, default_copay, default_stamp, source)
    values (v_pid,'PAMI',null,'CABA',2500,800,'manual')                returning id into i_pami;
  insert into public.insurers (professional_id, name, plan, region, default_copay, default_stamp, source)
    values (v_pid,'Swiss Medical','SMG20','CABA',1800,600,'manual')    returning id into i_swiss;

  insert into public.services (professional_id, name, area, price, duration_min) values
    (v_pid,'Sesión piso pélvico','pelvic_perineal',18000,45),
    (v_pid,'Drenaje linfático manual','dermatofunctional',22000,45),
    (v_pid,'Radiofrecuencia corporal','dermatofunctional',22000,45),
    (v_pid,'Rehabilitación deportiva','sports',16000,60),
    (v_pid,'Kinesiología respiratoria','respiratory',15000,30);

  -- Pacientes.
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Lucía','Fernández','1988-04-12','F','+5491151234567','Rehabilitación de piso pélvico posparto',
            '{"antecedentes":"Sin patologías relevantes. 2 partos vaginales.","cirugias":"—","medicacion":"—","alergias":"Ninguna"}'::jsonb)
    returning id into p1;
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Martín','Gómez','1981-07-03','M','+5491159872211','Drenaje y cicatrización post-quirúrgica (abdominal)','{}'::jsonb)
    returning id into p2;
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Sofía','Ramírez','1997-02-20','F','+5491154458890','Reeducación de rodilla post-esguince LCA','{}'::jsonb)
    returning id into p3;
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Diego','Torres','1974-09-15','M','+5491153301002','Disfunción pélvico-perineal post-prostatectomía','{}'::jsonb)
    returning id into p4;
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Camila','Ruiz','1992-11-05','F','+5491157764521','Fibro edema gelóide (celulitis grado II)','{}'::jsonb)
    returning id into p5;
  insert into public.patients (professional_id, first_name, last_name, birth_date, sex, phone, notes, medical_background)
    values (v_pid,'Julián','Sosa','1965-06-22','M','+5491152107788','Kinesiología respiratoria — EPOC estable','{}'::jsonb)
    returning id into p6;

  -- Bonos / órdenes (o4 en su última sesión).
  insert into public.treatment_orders (professional_id, patient_id, insurer_id, order_number, total_sessions, used_sessions, status)
    values (v_pid,p1,i_osde,'A-10234',10,6,'active')  returning id into o1;
  insert into public.treatment_orders (professional_id, patient_id, insurer_id, order_number, total_sessions, used_sessions, status)
    values (v_pid,p3,null,'PART-0031',8,3,'active')   returning id into o3;
  insert into public.treatment_orders (professional_id, patient_id, insurer_id, order_number, total_sessions, used_sessions, status)
    values (v_pid,p4,i_pami,'P-55120',12,11,'active') returning id into o4;
  insert into public.treatment_orders (professional_id, patient_id, insurer_id, order_number, total_sessions, used_sessions, status)
    values (v_pid,p6,i_ioma,'I-77045',10,4,'active')  returning id into o6;

  -- Agenda de HOY.
  insert into public.appointments (professional_id, patient_id, start_at, end_at, status, area, reason,
                                    coverage_type, insurer_id, treatment_order_id, source) values
    (v_pid,p1,(d0+time '09:00'),(d0+time '09:45'),'confirmed','pelvic_perineal',   'Control piso pélvico','obra_social',i_osde,o1,'professional'),
    (v_pid,p2,(d0+time '10:00'),(d0+time '10:45'),'pending',  'dermatofunctional', 'Drenaje post-qx','particular',null,null,'professional'),
    (v_pid,p3,(d0+time '11:00'),(d0+time '12:00'),'confirmed','sports',            'Rehabilitación rodilla','particular',null,o3,'professional'),
    (v_pid,p4,(d0+time '12:00'),(d0+time '12:45'),'attended', 'pelvic_perineal',   'Sesión post-prostatectomía','obra_social',i_pami,null,'professional'),
    (v_pid,p5,(d0+time '15:00'),(d0+time '15:45'),'pending',  'dermatofunctional', 'Radiofrecuencia','particular',null,null,'patient'),
    (v_pid,p6,(d0+time '16:30'),(d0+time '17:00'),'confirmed','respiratory',       'Control respiratorio','obra_social',i_ioma,o6,'professional');

  -- Cobros (2 pendientes = $44.000).
  insert into public.payments (professional_id, patient_id, amount, status, method,
                               coverage_type, insurer_id, copay_amount, stamp_amount, paid_at, notes) values
    (v_pid,p4,18000,'paid','cash',       'obra_social',i_pami,2500,800, now(),                 'Sesión piso pélvico'),
    (v_pid,p1,18000,'paid','transfer',   'obra_social',i_osde,2000,0,   now(),                 'Sesión piso pélvico'),
    (v_pid,p2,22000,'unpaid',null,       'particular', null,  0,   0,   null,                  'Drenaje linfático — por cobrar'),
    (v_pid,p3,16000,'paid','mercadopago','particular', null,  0,   0,   now() - interval '1 day','Rehabilitación deportiva'),
    (v_pid,p5,22000,'unpaid',null,       'obra_social',i_ioma,0,   0,   null,                  'Radiofrecuencia — por cobrar'),
    (v_pid,p6,15000,'paid','cash',       'obra_social',i_ioma,1800,600, now() - interval '2 day','Kinesiología respiratoria'),
    (v_pid,p1,22000,'paid','mercadopago','particular', null,  0,   0,   now() - interval '3 day','Sesión dermatofuncional');

  -- Evaluaciones especializadas.
  insert into public.clinical_assessments (professional_id, patient_id, kind, data) values
    (v_pid,p1,'uro_anamnesis','{"menarca":"13","ciclo":"Regular","gestas":"2","partos":"2","cesareas":"0","tipo_parto":"Vaginal","iu_tipo":["Esfuerzo"],"urgencia_mic":"Leve","nocturia":"1","liquidos_ml":"1500","actividad":"Moderada"}'::jsonb),
    (v_pid,p1,'uro_physical','{"diastasis":"Umbilical","diastasis_cm":"2 dedos","transverso":"Deficiente","tono_abd":"Normal","oxford":"3","perfect_P":"4","perfect_E":"5","perfect_R":"3","perfect_F":"3","tono_pelv":"Normotónico","popq":"Grado I","nucleo_fibroso":"Normotono","respiracion":"Costal"}'::jsonb),
    (v_pid,p5,'dermo_corporal','{"pefe":["PEFE","Fibrosis"],"pefe_loc":"Muslos y glúteos","adiposidad":"Localizada","flacidez":"Cutánea","estrias":"Blancas","piel":"Mixta","peso":"68","talla":"165","imc":"25","grasa":"32"}'::jsonb);

  -- Diario miccional de Lucía.
  insert into public.voiding_diaries (professional_id, patient_id, start_date, days)
    values (v_pid, p1, d0, 3) returning id into v_diary;
  insert into public.voiding_diary_entries (professional_id, patient_id, diary_id, entry_at, urine_ml, urgency, leak, liquid_type, liquid_ml, bristol) values
    (v_pid,p1,v_diary,(d0+time '07:30'),250,2,'N','Agua',200,4),
    (v_pid,p1,v_diary,(d0+time '10:15'),180,3,'E','Mate',500,null),
    (v_pid,p1,v_diary,(d0+time '13:40'),220,2,'N','Agua',250,null);

  -- Portales: tokens + planes + ítems + logs de HOY + check-ins.
  insert into public.patient_portal_tokens (professional_id, patient_id, token, scope)
    values (v_pid,p1,'vg-lf7a2c','both');
  insert into public.exercise_plans (professional_id, patient_id, title, area)
    values (v_pid,p1,'Plan de suelo pélvico','pelvic_perineal') returning id into pl1;
  insert into public.exercise_items (plan_id, professional_id, patient_id, name, detail, sort) values
    (pl1,v_pid,p1,'Kegel sostenido','3 series x 10 (6 seg)',0),
    (pl1,v_pid,p1,'Contracción rápida','3 series x 15',1),
    (pl1,v_pid,p1,'Respiración diafragmática','5 minutos',2);
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p1,id,d0,true,'Media','Sentí menos pérdida hoy' from public.exercise_items where plan_id=pl1 and name='Kegel sostenido';
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p1,id,d0,true,'Fácil','' from public.exercise_items where plan_id=pl1 and name='Respiración diafragmática';
  insert into public.patient_checkins (professional_id, patient_id, checkin_date, mood, notes)
    values (v_pid,p1,d0,'Bien','Buen día, sin escapes en la mañana');

  insert into public.patient_portal_tokens (professional_id, patient_id, token, scope)
    values (v_pid,p4,'vg-d4x9k1','exercises');
  insert into public.exercise_plans (professional_id, patient_id, title, area)
    values (v_pid,p4,'Rehabilitación post-prostatectomía','pelvic_perineal') returning id into pl4;
  insert into public.exercise_items (plan_id, professional_id, patient_id, name, detail, sort) values
    (pl4,v_pid,p4,'Contracción rápida','3 series x 15',0),
    (pl4,v_pid,p4,'Kegel sostenido','3 series x 8 (5 seg)',1),
    (pl4,v_pid,p4,'Coordinación tos-contracción','2 series x 10',2),
    (pl4,v_pid,p4,'Higiene miccional programada','Cada 3 h',3);
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p4,id,d0,true,'Media','Mejor control esta mañana' from public.exercise_items where plan_id=pl4 and name='Contracción rápida';
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p4,id,d0,true,'Difícil','' from public.exercise_items where plan_id=pl4 and name='Kegel sostenido';
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p4,id,d0,true,'Media','' from public.exercise_items where plan_id=pl4 and name='Coordinación tos-contracción';
  insert into public.patient_checkins (professional_id, patient_id, checkin_date, mood, notes)
    values (v_pid,p4,d0,'Regular','Alguna pérdida al toser');

  insert into public.patient_portal_tokens (professional_id, patient_id, token, scope)
    values (v_pid,p6,'vg-j6r3m8','exercises');
  insert into public.exercise_plans (professional_id, patient_id, title, area)
    values (v_pid,p6,'Plan respiratorio','respiratory') returning id into pl6;
  insert into public.exercise_items (plan_id, professional_id, patient_id, name, detail, sort) values
    (pl6,v_pid,p6,'Respiración diafragmática','5 min · 2 veces/día',0),
    (pl6,v_pid,p6,'Entrenamiento muscular inspiratorio','2 series x 15',1),
    (pl6,v_pid,p6,'Marcha progresiva','15 min diarios',2);
  insert into public.exercise_logs (professional_id, patient_id, item_id, log_date, completed, difficulty, notes)
    select v_pid,p6,id,d0,true,'Fácil','Menos disnea al caminar' from public.exercise_items where plan_id=pl6 and name='Respiración diafragmática';
  insert into public.patient_checkins (professional_id, patient_id, checkin_date, mood, notes)
    values (v_pid,p6,d0,'Bien','Tos controlada');

  -- Reactivar triggers.
  alter table public.appointments enable trigger trg_consume_order;
  alter table public.appointments enable trigger trg_slot_capacity;

  raise notice 'Seed demo cargado para profesional %.', v_pid;
end;
$fn$;

-- Ejecución inicial.
select public.seed_demo();
