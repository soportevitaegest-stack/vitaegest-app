-- =============================================================================
-- VitaeGest · 0011_plantillas_ejercicios.sql
-- Aditivo e idempotente. Gestor de Ejercicios/Pautas (Nivel 1).
--   1) Tabla exercise_templates: plantillas de rutinas/pautas. Sistema
--      (professional_id = null) o propias del profesional.
--   2) Plantillas de SISTEMA precargadas: movilización venosa, rutina facial,
--      suelo pélvico básico.
-- La rutina asignada al paciente sigue en exercise_plans + exercise_items
-- (lo que ya consume el portal); el gestor clona una plantilla y la guarda ahí.
-- =============================================================================
begin;

create table if not exists public.exercise_templates (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete cascade, -- null = sistema
  area            specialty_area not null default 'general',
  name            text not null,
  description     text,
  items           jsonb not null default '[]'::jsonb,  -- [{name, detail}]
  is_system       boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_ex_templates_professional on public.exercise_templates(professional_id);
create index if not exists idx_ex_templates_area on public.exercise_templates(area);

drop trigger if exists trg_ex_templates_updated_at on public.exercise_templates;
create trigger trg_ex_templates_updated_at before update on public.exercise_templates
  for each row execute function public.set_updated_at();

alter table public.exercise_templates enable row level security;

do $$ begin
  create policy "ex_templates - select own or system" on public.exercise_templates
    for select using (professional_id = auth.uid() or professional_id is null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ex_templates - insert own" on public.exercise_templates
    for insert with check (professional_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ex_templates - update own" on public.exercise_templates
    for update using (professional_id = auth.uid()) with check (professional_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ex_templates - delete own" on public.exercise_templates
    for delete using (professional_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Plantillas de sistema (idempotente).
delete from public.exercise_templates where is_system = true;
insert into public.exercise_templates (professional_id, area, name, description, items, is_system) values
(null, 'dermatofunctional', 'Movilización venosa (insuficiencia venosa)',
 'Pautas domiciliarias para insuficiencia venosa / edema de miembros inferiores.',
 '[{"name":"Bombeo de tobillos","detail":"Sentada o acostada, flexioná y extendé los pies 2 min, 3 veces al día."},
   {"name":"Elevación de piernas","detail":"Acostada con las piernas elevadas sobre almohadas, 15 min por la tarde."},
   {"name":"Caminata suave","detail":"20 min diarios a ritmo cómodo para activar la bomba muscular de la pantorrilla."},
   {"name":"Automasaje ascendente","detail":"Desde el tobillo hacia la rodilla, movimientos suaves, 5 min."},
   {"name":"Hidratación y descanso activo","detail":"Tomá agua durante el día; evitá estar mucho tiempo de pie sin moverte."}]'::jsonb, true),
(null, 'dermatofunctional', 'Rutina facial domiciliaria',
 'Pautas de cuidado y automasaje facial entre sesiones.',
 '[{"name":"Limpieza suave","detail":"Mañana y noche con producto neutro, sin frotar."},
   {"name":"Automasaje ascendente","detail":"Movimientos del centro hacia afuera y de abajo hacia arriba, 5 min."},
   {"name":"Gimnasia facial","detail":"Ejercicios de mejillas y frente, 2 series de 10, una vez al día."},
   {"name":"Protección solar","detail":"FPS 30+ todas las mañanas; reaplicar si hay exposición."},
   {"name":"Hidratación nocturna","detail":"Crema hidratante por la noche."}]'::jsonb, true),
(null, 'pelvic_perineal', 'Suelo pélvico básico',
 'Rutina domiciliaria de base para reeducación del piso pélvico.',
 '[{"name":"Kegel sostenido","detail":"3 series de 10 contracciones sostenidas 6 seg, con 6 seg de descanso."},
   {"name":"Contracción rápida","detail":"3 series de 15 contracciones rápidas."},
   {"name":"Respiración diafragmática","detail":"5 minutos, coordinando la espiración con la contracción."},
   {"name":"Higiene miccional","detail":"Evitá ir al baño \"por las dudas\"; respetá los intervalos indicados."}]'::jsonb, true);

commit;
