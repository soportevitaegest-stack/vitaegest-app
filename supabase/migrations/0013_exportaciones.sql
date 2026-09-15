-- =============================================================================
-- VitaeGest · 0013_exportaciones.sql
-- Exportación de datos (ADITIVA, solo lectura, IDEMPOTENTE).
--
-- Tres cosas:
--   1) export_billing()         → facturación de un período, lista para Excel/PDF
--   2) export_patient_record()  → historia clínica completa de UNA paciente
--   3) export_backup_part()     → backup total, por partes, para llevarse todo
--
-- TODAS son SECURITY INVOKER a propósito: corren con los permisos de quien
-- llama, así el RLS existente (professional_id = auth.uid()) hace el trabajo.
-- Ninguna profesional puede exportar datos de otra, aunque pase un id ajeno.
--
-- Rollback: 0013_exportaciones.down.sql
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) FACTURACIÓN POR PERÍODO
--    Una fila por cobro, con todo lo que el contador o la obra social pide.
--    p_kind: 'all' | 'session' | 'deposit'
--    p_status: null = todos; si no, el payment_status exacto.
-- ---------------------------------------------------------------------------
create or replace function public.export_billing(
  p_from   date,
  p_to     date,
  p_kind   text default 'all',
  p_status text default null)
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.fecha, t.paciente), '[]'::jsonb)
  from (
    select
      coalesce(pay.paid_at, pay.created_at)                        as fecha_iso,
      to_char(coalesce(pay.paid_at, pay.created_at)
                at time zone 'America/Argentina/Buenos_Aires',
              'DD/MM/YYYY')                                        as fecha,
      to_char(a.start_at at time zone 'America/Argentina/Buenos_Aires',
              'DD/MM/YYYY HH24:MI')                                as turno,
      (p.last_name || ', ' || p.first_name)                        as paciente,
      p.document_id                                                as documento,
      case pay.kind when 'deposit' then 'Seña' else 'Sesión' end   as concepto,
      s.name                                                       as prestacion,
      case pay.coverage_type when 'obra_social' then 'Obra social'
                             else 'Particular' end                 as cobertura,
      i.name                                                       as obra_social,
      i.plan                                                       as plan,
      o.order_number                                               as orden,
      pay.amount                                                   as honorarios,
      pay.copay_amount                                             as coseguro,
      pay.stamp_amount                                             as estampilla,
      pay.total_amount                                             as total,
      pay.currency                                                 as moneda,
      case pay.status when 'paid'     then 'Pagado'
                      when 'partial'  then 'Parcial'
                      when 'refunded' then 'Reembolsado'
                      else 'Sin pagar' end                         as estado,
      case pay.method when 'cash'        then 'Efectivo'
                      when 'transfer'    then 'Transferencia'
                      when 'mercadopago' then 'Mercado Pago'
                      when 'card'        then 'Tarjeta'
                      when 'other'       then 'Otro'
                      else '' end                                  as medio,
      pay.notes                                                    as observaciones
    from public.payments pay
    join public.patients p            on p.id = pay.patient_id
    left join public.appointments a   on a.id = pay.appointment_id
    left join public.services s       on s.id = pay.service_id
    left join public.insurers i       on i.id = pay.insurer_id
    left join public.treatment_orders o on o.id = pay.treatment_order_id
    where (coalesce(pay.paid_at, pay.created_at)
             at time zone 'America/Argentina/Buenos_Aires')::date
          between p_from and p_to
      and (p_kind = 'all' or pay.kind::text = p_kind)
      and (p_status is null or pay.status::text = p_status)
  ) t;
$$;

-- Totales del mismo período, para la cabecera del PDF y la hoja de resumen.
create or replace function public.export_billing_summary(
  p_from date, p_to date, p_kind text default 'all', p_status text default null)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'desde', p_from, 'hasta', p_to,
    'cobros',      count(*),
    'pacientes',   count(distinct pay.patient_id),
    'honorarios',  coalesce(sum(pay.amount), 0),
    'coseguros',   coalesce(sum(pay.copay_amount), 0),
    'estampillas', coalesce(sum(pay.stamp_amount), 0),
    'total',       coalesce(sum(pay.total_amount), 0),
    'cobrado',     coalesce(sum(pay.total_amount) filter (where pay.status = 'paid'), 0),
    'pendiente',   coalesce(sum(pay.total_amount) filter (where pay.status <> 'paid'), 0),
    'senas',       coalesce(sum(pay.total_amount) filter (where pay.kind = 'deposit'), 0),
    'por_obra_social', coalesce((
        select jsonb_agg(x order by x.total desc) from (
          select coalesce(i2.name, 'Particular') as obra_social,
                 count(*) as cobros,
                 sum(p2.total_amount) as total
          from public.payments p2
          left join public.insurers i2 on i2.id = p2.insurer_id
          where (coalesce(p2.paid_at, p2.created_at)
                   at time zone 'America/Argentina/Buenos_Aires')::date between p_from and p_to
            and (p_kind = 'all' or p2.kind::text = p_kind)
            and (p_status is null or p2.status::text = p_status)
          group by 1) x), '[]'::jsonb)
  )
  from public.payments pay
  where (coalesce(pay.paid_at, pay.created_at)
           at time zone 'America/Argentina/Buenos_Aires')::date between p_from and p_to
    and (p_kind = 'all' or pay.kind::text = p_kind)
    and (p_status is null or pay.status::text = p_status);
$$;


-- ---------------------------------------------------------------------------
-- 2) HISTORIA CLÍNICA DE UNA PACIENTE
--    Todo lo que hace falta para un informe: encabezado del profesional,
--    datos de la paciente, evoluciones SOAP + campos estructurados, turnos,
--    bonos y plan de ejercicios vigente.
-- ---------------------------------------------------------------------------
create or replace function public.export_patient_record(p_patient uuid)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare pac public.patients; result jsonb;
begin
  select * into pac from public.patients where id = p_patient;
  if pac.id is null then raise exception 'Paciente inexistente o sin acceso'; end if;

  select jsonb_build_object(
    'generado_el', now(),
    'profesional', (select jsonb_build_object(
         'full_name', pr.full_name, 'license_number', pr.license_number,
         'clinic_name', pr.clinic_name, 'phone', pr.phone,
         'specialties', to_jsonb(pr.specialties))
       from public.professionals pr where pr.id = pac.professional_id),
    'paciente', jsonb_build_object(
         'nombre', pac.first_name || ' ' || pac.last_name,
         'documento', pac.document_id, 'fecha_nacimiento', pac.birth_date,
         'sexo', pac.sex, 'telefono', pac.phone, 'email', pac.email,
         'direccion', pac.address, 'antecedentes', pac.medical_history,
         'alergias', pac.allergies, 'observaciones', pac.notes,
         'alta', pac.created_at),
    'evoluciones', coalesce((
       select jsonb_agg(jsonb_build_object(
           'fecha', e.evolution_date, 'titulo', e.title,
           'subjetivo', e.soap_subjective, 'objetivo', e.soap_objective,
           'evaluacion', e.soap_assessment, 'plan', e.soap_plan,
           'datos', e.structured_data,
           'plantilla', t.name)
         order by e.evolution_date)
       from public.clinical_evolutions e
       left join public.evaluation_templates t on t.id = e.template_id
       where e.patient_id = p_patient), '[]'::jsonb),
    'turnos', coalesce((
       select jsonb_agg(jsonb_build_object(
           'inicio', a.start_at, 'estado', a.status, 'area', a.area,
           'motivo', a.reason, 'cobertura', a.coverage_type,
           'sena_estado', a.deposit_status, 'sena_monto', a.deposit_amount)
         order by a.start_at)
       from public.appointments a where a.patient_id = p_patient), '[]'::jsonb),
    'bonos', coalesce((
       select jsonb_agg(jsonb_build_object(
           'numero', o.order_number, 'diagnostico', o.diagnosis,
           'derivante', o.prescribed_by, 'total', o.total_sessions,
           'usadas', o.used_sessions, 'restantes', o.remaining_sessions,
           'estado', o.status, 'desde', o.valid_from, 'hasta', o.valid_to,
           'obra_social', i.name)
         order by o.created_at)
       from public.treatment_orders o
       left join public.insurers i on i.id = o.insurer_id
       where o.patient_id = p_patient), '[]'::jsonb),
    'cobros', coalesce((
       select jsonb_agg(jsonb_build_object(
           'fecha', coalesce(pay.paid_at, pay.created_at), 'concepto', pay.kind,
           'total', pay.total_amount, 'estado', pay.status, 'medio', pay.method)
         order by coalesce(pay.paid_at, pay.created_at))
       from public.payments pay where pay.patient_id = p_patient), '[]'::jsonb),
    'adjuntos', coalesce((
       select jsonb_agg(jsonb_build_object(
           'archivo', at.file_name, 'tipo', at.mime_type,
           'tamano', at.size_bytes, 'fecha', at.created_at)
         order by at.created_at)
       from public.attachments at where at.patient_id = p_patient), '[]'::jsonb)
  ) into result;

  return result;
end; $$;


-- ---------------------------------------------------------------------------
-- 3) BACKUP COMPLETO, POR PARTES
--    Una tabla por llamada. Evita el timeout y el payload gigante de traer
--    todo junto. El cliente recorre las partes y arma el ZIP.
--    Whitelist explícita: no hay SQL dinámico con el nombre que venga.
-- ---------------------------------------------------------------------------
create or replace function public.export_backup_part(p_part text)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare r jsonb;
begin
  case p_part
    when 'perfil' then
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into r
        from public.professionals x where x.id = auth.uid();
    when 'pacientes' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.last_name, x.first_name), '[]'::jsonb) into r
        from public.patients x;
    when 'evoluciones' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.evolution_date), '[]'::jsonb) into r
        from public.clinical_evolutions x;
    when 'turnos' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.start_at), '[]'::jsonb) into r
        from public.appointments x;
    when 'cobros' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) into r
        from public.payments x;
    when 'bonos' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) into r
        from public.treatment_orders x;
    when 'obras_sociales' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb) into r
        from public.insurers x;
    when 'prestaciones' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb) into r
        from public.services x;
    when 'adjuntos' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) into r
        from public.attachments x;
    when 'plantillas' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb) into r
        from public.evaluation_templates x where x.professional_id = auth.uid();
    else
      raise exception 'Parte desconocida: %', p_part;
  end case;
  return coalesce(r, '[]'::jsonb);
end; $$;

-- Cuántas filas hay de cada cosa. Sirve para la pantalla previa
-- ("vas a descargar 412 pacientes y 3.108 evoluciones") y para la barra.
create or replace function public.export_counts()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'pacientes',     (select count(*) from public.patients),
    'evoluciones',   (select count(*) from public.clinical_evolutions),
    'turnos',        (select count(*) from public.appointments),
    'cobros',        (select count(*) from public.payments),
    'bonos',         (select count(*) from public.treatment_orders),
    'obras_sociales',(select count(*) from public.insurers),
    'prestaciones',  (select count(*) from public.services),
    'adjuntos',      (select count(*) from public.attachments),
    'plantillas',    (select count(*) from public.evaluation_templates
                        where professional_id = auth.uid())
  );
$$;

-- Padrón simple de pacientes, con la última sesión de cada una.
create or replace function public.export_patients_list()
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t) order by t.apellido, t.nombre), '[]'::jsonb)
  from (
    select p.last_name as apellido, p.first_name as nombre,
           p.document_id as documento, p.birth_date as nacimiento,
           p.phone as telefono, p.email, p.address as direccion,
           case when p.is_active then 'Activa' else 'Inactiva' end as estado,
           to_char(p.created_at at time zone 'America/Argentina/Buenos_Aires',
                   'DD/MM/YYYY') as alta,
           to_char((select max(a.start_at) from public.appointments a
                      where a.patient_id = p.id and a.status = 'attended')
                     at time zone 'America/Argentina/Buenos_Aires',
                   'DD/MM/YYYY') as ultima_sesion,
           (select count(*) from public.appointments a
              where a.patient_id = p.id and a.status = 'attended') as sesiones
    from public.patients p
  ) t;
$$;

grant execute on function public.export_billing(date, date, text, text)         to authenticated;
grant execute on function public.export_billing_summary(date, date, text, text) to authenticated;
grant execute on function public.export_patient_record(uuid)                    to authenticated;
grant execute on function public.export_backup_part(text)                       to authenticated;
grant execute on function public.export_counts()                                to authenticated;
grant execute on function public.export_patients_list()                         to authenticated;

commit;

-- =============================================================================
-- Notas
--  * SECURITY INVOKER + RLS = una profesional solo exporta lo suyo. Si pasa el
--    UUID de una paciente ajena, export_patient_record corta con "sin acceso".
--  * export_backup_part trae una tabla por llamada. Con 400 pacientes y 3.000
--    evoluciones, traer todo en una sola respuesta se pasa del timeout.
--  * Los adjuntos se exportan como metadatos (nombre, tipo, tamaño). Los
--    archivos en sí viven en Storage y se bajan con signed URLs desde la app.
-- =============================================================================
