"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action del módulo Historia Clínica · Evoluciones.
// Guarda SOAP en columnas propias, la EVA dentro de structured_data (jsonb)
// y el tratamiento del día en treatment_done (columna de la migración 0008).

export type EvoActionState = { error?: string } | null;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export async function createEvolution(
  _prev: EvoActionState,
  formData: FormData
): Promise<EvoActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const patient_id = String(formData.get("patient_id") ?? "");
  if (!patient_id) return { error: "Falta el paciente." };

  const date = String(formData.get("date") ?? "");
  const eva = Math.max(0, Math.min(10, Number(formData.get("eva") ?? 0) || 0));
  const evolution_date = date
    ? new Date(`${date}T12:00:00`).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from("clinical_evolutions").insert({
    professional_id: user.id,
    patient_id,
    evolution_date,
    soap_subjective: clean(formData.get("s")),
    soap_objective: clean(formData.get("o")),
    soap_assessment: clean(formData.get("a")),
    soap_plan: clean(formData.get("p")),
    treatment_done: clean(formData.get("treatment_done")),
    structured_data: { eva },
  });

  if (error) return { error: "No se pudo guardar la evolución: " + error.message };

  revalidatePath(`/pacientes/${patient_id}`);
  redirect(`/pacientes/${patient_id}`);
}
