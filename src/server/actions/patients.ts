"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Actions del módulo Pacientes. Escriben con el cliente de servidor
// autenticado; RLS garantiza que professional_id = auth.uid().

export type ActionState = { error?: string } | null;

export async function createPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  if (!first_name || !last_name) return { error: "Nombre y apellido son obligatorios." };

  const { error } = await supabase.from("patients").insert({
    professional_id: user.id, // explícito; RLS igual lo valida contra auth.uid()
    first_name,
    last_name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    birth_date: String(formData.get("birth_date") ?? "") || null,
    sex: String(formData.get("sex") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    medical_background: {
      antecedentes: String(formData.get("antecedentes") ?? "").trim(),
      alergias: String(formData.get("alergias") ?? "").trim(),
    },
  });

  if (error) return { error: "No se pudo crear el paciente: " + error.message };

  revalidatePath("/pacientes");
  redirect("/pacientes");
}

export async function togglePatientActive(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("patients").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
}

// Elimina el paciente. Si tiene turnos o cobros asociados, la FK (on delete
// restrict) lo impide → devolvemos un mensaje sugiriendo desactivar.
export async function deletePatient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) {
    return {
      error:
        "No se puede eliminar: el paciente tiene turnos o cobros asociados. Podés desactivarlo en su lugar.",
    };
  }
  revalidatePath("/pacientes");
  return {};
}
