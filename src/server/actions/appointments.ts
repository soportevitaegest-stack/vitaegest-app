"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localToUtcISO, addMinutesISO, weeklyDates } from "@/lib/utils/tz";

// Server Actions del módulo Agenda. RLS garantiza professional_id = auth.uid().
// Todas las fechas entran como (date 'yyyy-MM-dd' + time 'HH:mm') en horario
// Argentina y se guardan como instante UTC (timestamptz).

export type ApptActionState = { error?: string; ok?: boolean; created?: number } | null;

type NewPatient = { first_name: string; last_name: string; phone: string };

export type NewApptInput = {
  patientId: string; // "" si se crea uno nuevo
  newPatient: NewPatient | null;
  date: string;
  time: string;
  duration: number;
  area: string;
  status: string;
  serviceId: string | null;
  coverageType: "particular" | "obra_social";
  insurerId: string | null;
  orderNumber: string | null; // número de orden/bono (OS)
  sessions: number; // cantidad de sesiones indicadas
  recurrent: boolean; // agendar el bloque semanal completo
  generatePayment: boolean; // sólo particular
  amount: number; // valor particular
  reason: string | null;
};

export async function createAppointment(input: NewApptInput): Promise<ApptActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  if (!input.date || !input.time) return { error: "Ingresá fecha y horario." };

  // 1) Resolver paciente: usar el existente o crear uno nuevo al vuelo.
  let patientId = input.patientId;
  if (!patientId && input.newPatient) {
    const np = input.newPatient;
    if (!np.first_name.trim() || !np.last_name.trim())
      return { error: "Para crear el paciente ingresá nombre y apellido." };
    const { data: created, error: pErr } = await supabase
      .from("patients")
      .insert({
        professional_id: user.id,
        first_name: np.first_name.trim(),
        last_name: np.last_name.trim(),
        phone: np.phone.trim() || null,
      })
      .select("id")
      .single();
    if (pErr) return { error: "No se pudo crear el paciente: " + pErr.message };
    patientId = created!.id;
  }
  if (!patientId) return { error: "Elegí un paciente o creá uno nuevo." };

  const isOS = input.coverageType === "obra_social";
  const insurerId = isOS ? input.insurerId || null : null;
  const sessions = Math.max(1, Math.floor(input.sessions || 1));
  const apptCount = input.recurrent ? sessions : 1;

  // 2) Orden de tratamiento / bono: se crea cuando hay control de sesiones
  //    (más de una) o cuando es por obra social (para asociar el nº de orden).
  let orderId: string | null = null;
  if (sessions > 1 || isOS) {
    const { data: order, error: oErr } = await supabase
      .from("treatment_orders")
      .insert({
        professional_id: user.id,
        patient_id: patientId,
        insurer_id: insurerId,
        order_number: input.orderNumber?.trim() || null,
        total_sessions: sessions,
        status: "active",
      })
      .select("id")
      .single();
    if (oErr) return { error: "No se pudo crear la orden/bono: " + oErr.message };
    orderId = order!.id;
  }

  // 3) Generar el/los turno(s). Recurrente = mismo día de semana y horario.
  const dates = weeklyDates(input.date, apptCount);
  const rows = dates.map((d) => {
    const startAt = localToUtcISO(d, input.time)!;
    return {
      professional_id: user.id,
      patient_id: patientId,
      start_at: startAt,
      end_at: addMinutesISO(startAt, input.duration || 45),
      status: input.status,
      area: input.area,
      reason: input.reason?.trim() || null,
      coverage_type: input.coverageType,
      insurer_id: insurerId,
      treatment_order_id: orderId,
      service_id: input.serviceId || null,
      source: "professional",
    };
  });

  const { data: inserted, error } = await supabase.from("appointments").insert(rows).select("id, start_at");
  if (error) return { error: "No se pudo crear el turno: " + error.message };

  // 4) Cobros particulares (opcional): uno por sesión agendada.
  if (!isOS && input.generatePayment && input.amount > 0 && inserted?.length) {
    const payments = inserted.map((a) => ({
      professional_id: user.id,
      patient_id: patientId,
      appointment_id: a.id,
      amount: input.amount,
      coverage_type: "particular",
      service_id: input.serviceId || null,
      treatment_order_id: orderId,
      status: "unpaid",
    }));
    await supabase.from("payments").insert(payments);
    revalidatePath("/facturacion");
  }

  revalidatePath("/agenda");
  revalidatePath("/pacientes");
  return { ok: true, created: inserted?.length ?? 0 };
}

// Edición / carga diferida de un turno ya creado. Permite completar los datos
// que faltan cuando el paciente se auto-agendó (estado, tratamiento, cobertura,
// nº de orden y cantidad de sesiones), además de mover día y horario.
export type EditApptInput = {
  date: string;
  time: string;
  duration: number;
  area: string;
  status: string;
  serviceId: string | null;
  coverageType: "particular" | "obra_social";
  insurerId: string | null;
  orderNumber: string | null;
  sessions: number;
  reason: string | null;
};

export async function updateAppointment(
  id: string,
  currentOrderId: string | null,
  d: EditApptInput
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  if (!d.date || !d.time) return { error: "Ingresá fecha y horario." };
  const startAt = localToUtcISO(d.date, d.time);
  if (!startAt) return { error: "Fecha u horario inválidos." };
  const endAt = addMinutesISO(startAt, d.duration || 45);

  const isOS = d.coverageType === "obra_social";
  const insurerId = isOS ? d.insurerId || null : null;
  const sessions = Math.max(1, Math.floor(d.sessions || 1));

  // Orden/bono: actualizar la existente o crear una nueva si ahora corresponde.
  let orderId = currentOrderId;
  if (currentOrderId) {
    // No permitir bajar el total por debajo de las sesiones ya consumidas.
    const { data: ord } = await supabase
      .from("treatment_orders")
      .select("used_sessions")
      .eq("id", currentOrderId)
      .maybeSingle();
    const used = (ord as { used_sessions?: number } | null)?.used_sessions ?? 0;
    await supabase
      .from("treatment_orders")
      .update({
        insurer_id: insurerId,
        order_number: d.orderNumber?.trim() || null,
        total_sessions: Math.max(sessions, used || 1),
      })
      .eq("id", currentOrderId);
  } else if (sessions > 1 || isOS || (d.orderNumber && d.orderNumber.trim())) {
    const { data: order, error: oErr } = await supabase
      .from("treatment_orders")
      .insert({
        professional_id: user.id,
        patient_id: (await supabase.from("appointments").select("patient_id").eq("id", id).single()).data?.patient_id,
        insurer_id: insurerId,
        order_number: d.orderNumber?.trim() || null,
        total_sessions: sessions,
        status: "active",
      })
      .select("id")
      .single();
    if (oErr) return { error: "No se pudo crear la orden/bono: " + oErr.message };
    orderId = order!.id;
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      start_at: startAt,
      end_at: endAt,
      area: d.area,
      status: d.status,
      service_id: d.serviceId || null,
      coverage_type: d.coverageType,
      insurer_id: insurerId,
      treatment_order_id: orderId,
      reason: d.reason?.trim() || null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo guardar el turno: " + error.message };
  revalidatePath("/agenda");
  return {};
}

// Cambia el estado del turno. Al pasar a 'attended', el trigger de la base
// (trg_consume_order) descuenta 1 sesión del bono asociado, si lo hay.
export async function updateAppointmentStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/agenda");
  return {};
}
