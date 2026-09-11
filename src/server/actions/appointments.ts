"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server Actions del módulo Agenda. RLS garantiza professional_id = auth.uid().

export type ApptActionState = { error?: string; ok?: boolean } | null;

export async function createAppointment(
  _prev: ApptActionState,
  formData: FormData
): Promise<ApptActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const patient_id = String(formData.get("patient_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const duration = Number(formData.get("duration") ?? 45) || 45;
  const area = String(formData.get("area") ?? "general");
  const status = String(formData.get("status") ?? "confirmed");
  const coverage_type = String(formData.get("coverage_type") ?? "particular");
  const insurer_id =
    coverage_type === "obra_social" ? String(formData.get("insurer_id") ?? "") || null : null;
  const treatment_order_id = String(formData.get("treatment_order_id") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!patient_id) return { error: "Elegí un paciente." };
  if (!date || !time) return { error: "Ingresá fecha y horario." };

  const startAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startAt.getTime())) return { error: "Fecha u horario inválidos." };
  const endAt = new Date(startAt.getTime() + duration * 60000);

  const { error } = await supabase.from("appointments").insert({
    professional_id: user.id,
    patient_id,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status,
    area,
    reason,
    coverage_type,
    insurer_id,
    treatment_order_id,
    source: "professional",
  });

  if (error) return { error: "No se pudo crear el turno: " + error.message };

  revalidatePath("/agenda");
  return { ok: true };
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
