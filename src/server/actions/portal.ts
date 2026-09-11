"use server";

import { revalidatePath } from "next/cache";
import { createPortalClient } from "@/lib/supabase/portal";
import { localToUtcISO } from "@/lib/utils/tz";
import type { Slot } from "@/types/portal";

// Server Actions del Portal del Paciente. Todas operan por TOKEN contra las RPC
// SECURITY DEFINER; el token es la credencial (viaja en la URL del portal).

type Res = { ok?: boolean; error?: string };

// Traduce errores de las RPC a mensajes claros para el paciente.
function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("token")) return "El enlace no es válido o expiró. Pedile uno nuevo a tu kinesiólogo/a.";
  if (m.includes("no están habilitadas")) return "Tu profesional todavía no habilitó las reservas online.";
  if (m.includes("período de reserva") || m.includes("fuera del")) return "Esa fecha está fuera del período disponible para reservar.";
  if (m.includes("no está habilitado")) return "Ese día no está disponible para turnos.";
  if (m.includes("pendientes")) return "Ya tenés varias solicitudes pendientes de confirmación.";
  if (m.includes("disponible")) return "Ese horario ya fue tomado. Elegí otro, por favor.";
  return "No se pudo completar la acción. Intentá de nuevo.";
}

export async function getSlots(token: string, date: string): Promise<{ slots?: Slot[]; error?: string }> {
  const supabase = createPortalClient();
  const { data, error } = await supabase.rpc("portal_available_slots", { p_token: token, p_date: date });
  if (error) return { error: humanize(error.message) };
  return { slots: (data ?? []) as Slot[] };
}

export async function requestAppointment(
  token: string,
  date: string,
  time: string,
  area: string
): Promise<Res> {
  const start = localToUtcISO(date, time);
  if (!start) return { error: "Fecha u horario inválidos." };
  const supabase = createPortalClient();
  const { error } = await supabase.rpc("portal_request_appointment", {
    p_token: token,
    p_start: start,
    p_area: area || "general",
    p_dur: null,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/p/${token}`);
  return { ok: true };
}

export async function logExercise(
  token: string,
  itemId: string,
  completed: boolean,
  difficulty: string,
  notes: string
): Promise<Res> {
  const supabase = createPortalClient();
  const { error } = await supabase.rpc("portal_log_exercise", {
    p_token: token,
    p_item: itemId,
    p_completed: completed,
    p_difficulty: difficulty || null,
    p_notes: notes || null,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/p/${token}`);
  return { ok: true };
}

export type DiaryInput = {
  time: string;
  urine_ml: number | null;
  urgency: number | null;
  leak: string | null;
  liquid_type: string | null;
  liquid_ml: number | null;
  bristol: number | null;
};

export async function addDiaryEntry(token: string, d: DiaryInput): Promise<Res> {
  const supabase = createPortalClient();
  // entry_at: hoy + hora (ART) → UTC; si no hay hora, la base usa now().
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const entryAt = d.time ? localToUtcISO(`${y}-${m}-${day}`, d.time) : null;

  const { error } = await supabase.rpc("portal_add_diary_entry", {
    p_token: token,
    p_urine: d.urine_ml,
    p_urgency: d.urgency,
    p_leak: d.leak,
    p_liquid_type: d.liquid_type,
    p_liquid_ml: d.liquid_ml,
    p_bristol: d.bristol,
    p_entry_at: entryAt,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/p/${token}`);
  return { ok: true };
}

export async function doCheckin(token: string, mood: string, notes: string): Promise<Res> {
  const supabase = createPortalClient();
  const { error } = await supabase.rpc("portal_checkin", {
    p_token: token,
    p_mood: mood || null,
    p_notes: notes || null,
  });
  if (error) return { error: humanize(error.message) };
  revalidatePath(`/p/${token}`);
  return { ok: true };
}
