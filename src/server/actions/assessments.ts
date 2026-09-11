"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Guarda (upsert) una evaluación especializada en clinical_assessments.
// Una fila por (patient_id, kind); la unique constraint permite el upsert.
export async function saveAssessment(
  patientId: string,
  kind: string,
  data: Record<string, unknown>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("clinical_assessments").upsert(
    {
      professional_id: user.id,
      patient_id: patientId,
      kind,
      data,
      assessed_at: new Date().toISOString(),
    },
    { onConflict: "patient_id,kind" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/pacientes/${patientId}/evaluaciones`);
  revalidatePath(`/pacientes/${patientId}`);
  return {};
}
