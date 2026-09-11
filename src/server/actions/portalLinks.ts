"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Gestión del enlace del portal desde el panel del profesional (autenticado).
// Reutiliza el token activo del paciente o crea uno nuevo (la columna `token`
// tiene default gen_random_bytes; el índice único garantiza uno activo por
// paciente, así que primero reusamos el existente).
export async function ensurePortalToken(
  patientId: string
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: existing } = await supabase
    .from("patient_portal_tokens")
    .select("token")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if ((existing as { token?: string } | null)?.token) {
    return { token: (existing as { token: string }).token };
  }

  const { data, error } = await supabase
    .from("patient_portal_tokens")
    .insert({ professional_id: user.id, patient_id: patientId, scope: "both" })
    .select("token")
    .single();

  if (error) return { error: "No se pudo generar el enlace: " + error.message };
  revalidatePath(`/pacientes/${patientId}`);
  return { token: (data as { token: string }).token };
}
