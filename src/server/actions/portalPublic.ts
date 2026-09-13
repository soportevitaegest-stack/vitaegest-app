"use server";

import { createPortalClient } from "@/lib/supabase/portal";
import { localToUtcISO } from "@/lib/utils/tz";
import type { Slot } from "@/types/portal";

// Agendamiento PÚBLICO (paciente nuevo, sin login) por slug del profesional.
// Usa las RPC SECURITY DEFINER public_booking_slots / public_request_appointment.

function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("inválido") || m.includes("invalido")) return "El enlace no es válido. Verificá la dirección.";
  if (m.includes("no están habilitadas")) return "Este profesional no tiene las reservas online activas.";
  if (m.includes("nombre y apellido")) return "Ingresá tu nombre y apellido.";
  if (m.includes("período") || m.includes("fuera")) return "Esa fecha está fuera del período disponible.";
  if (m.includes("no está habilitado")) return "Ese día no está disponible para turnos.";
  if (m.includes("pendientes")) return "Ya hay solicitudes pendientes con estos datos.";
  if (m.includes("disponible")) return "Ese horario ya fue tomado. Elegí otro, por favor.";
  return "No se pudo completar la solicitud. Intentá de nuevo.";
}

export async function getPublicSlots(slug: string, date: string): Promise<{ slots?: Slot[]; error?: string }> {
  const supabase = createPortalClient();
  const { data, error } = await supabase.rpc("public_booking_slots", { p_slug: slug, p_date: date });
  if (error) return { error: humanize(error.message) };
  return { slots: (data ?? []) as Slot[] };
}

export type PublicBookingForm = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  reason: string;
};

export async function requestPublicAppointment(
  slug: string,
  f: PublicBookingForm
): Promise<{ ok?: boolean; error?: string; portalToken?: string }> {
  if (!f.first_name.trim() || !f.last_name.trim()) return { error: "Ingresá tu nombre y apellido." };
  const start = localToUtcISO(f.date, f.time);
  if (!start) return { error: "Fecha u horario inválidos." };

  const supabase = createPortalClient();
  const { data, error } = await supabase.rpc("public_request_appointment", {
    p_slug: slug,
    p_first_name: f.first_name,
    p_last_name: f.last_name,
    p_phone: f.phone || null,
    p_email: f.email || null,
    p_start: start,
    p_area: "general",
    p_reason: f.reason || null,
  });
  if (error) return { error: humanize(error.message) };
  const portalToken = (data as { portal_token?: string } | null)?.portal_token;
  return { ok: true, portalToken };
}
