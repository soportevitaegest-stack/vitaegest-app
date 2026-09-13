"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Gestión del enlace del portal desde el panel del profesional (autenticado).
// Reutiliza el token activo del paciente o crea uno nuevo (la columna `token`
// tiene default gen_random_bytes; el índice único garantiza uno activo por
// paciente, así que primero reusamos el existente).
// scope: "both" = piso pélvico (turnos + ejercicios + diario);
//        "exercises" = dermatofuncional (turnos + ejercicios/pautas, sin diario).
export async function ensurePortalToken(
  patientId: string,
  scope: "both" | "exercises" = "both"
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: existing } = await supabase
    .from("patient_portal_tokens")
    .select("id, token")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const ex = existing as { id: string; token: string } | null;
  if (ex?.token) {
    // Actualiza el tipo de seguimiento por si el profesional lo cambió.
    await supabase.from("patient_portal_tokens").update({ scope }).eq("id", ex.id);
    revalidatePath(`/pacientes/${patientId}`);
    return { token: ex.token };
  }

  const { data, error } = await supabase
    .from("patient_portal_tokens")
    .insert({ professional_id: user.id, patient_id: patientId, scope })
    .select("token")
    .single();

  if (error) return { error: "No se pudo generar el enlace: " + error.message };
  revalidatePath(`/pacientes/${patientId}`);
  return { token: (data as { token: string }).token };
}

// Revoca el enlace: da de baja el/los token(s) activo(s). El enlace deja de
// funcionar de inmediato (portal_resolve exige is_active).
export async function revokePortalToken(patientId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase
    .from("patient_portal_tokens")
    .update({ is_active: false })
    .eq("patient_id", patientId)
    .eq("is_active", true);
  if (error) return { error: "No se pudo revocar el enlace: " + error.message };
  revalidatePath(`/pacientes/${patientId}`);
  return { ok: true };
}

// Rota el enlace: baja el actual y emite uno nuevo (nuevo token). El enlace
// anterior queda inválido. Respeta el índice "un token activo por paciente".
export async function rotatePortalToken(
  patientId: string,
  scope: "both" | "exercises" = "both"
): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  await supabase
    .from("patient_portal_tokens")
    .update({ is_active: false })
    .eq("patient_id", patientId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("patient_portal_tokens")
    .insert({ professional_id: user.id, patient_id: patientId, scope })
    .select("token")
    .single();
  if (error) return { error: "No se pudo rotar el enlace: " + error.message };
  revalidatePath(`/pacientes/${patientId}`);
  return { token: (data as { token: string }).token };
}
