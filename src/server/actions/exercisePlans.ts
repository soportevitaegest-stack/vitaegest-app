"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Gestor de Ejercicios/Pautas (panel del profesional). Guarda la rutina del
// paciente en exercise_plans + exercise_items, que es lo que consume el portal.

export type PlanItemInput = { name: string; detail: string };

export async function savePatientPlan(
  patientId: string,
  data: { title: string; area: string; items: PlanItemInput[] }
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const title = data.title.trim() || "Plan de ejercicios";
  const items = data.items.filter((i) => i.name.trim());

  // Buscar el plan activo del paciente (último) o crear uno nuevo.
  const { data: planRow } = await supabase
    .from("exercise_plans")
    .select("id")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let planId = (planRow as { id?: string } | null)?.id ?? null;

  if (planId) {
    await supabase.from("exercise_plans").update({ title, area: data.area }).eq("id", planId);
    // Reemplaza los ítems (se regenera la rutina completa).
    await supabase.from("exercise_items").delete().eq("plan_id", planId);
  } else {
    const { data: created, error } = await supabase
      .from("exercise_plans")
      .insert({ professional_id: user.id, patient_id: patientId, title, area: data.area, is_active: true })
      .select("id")
      .single();
    if (error) return { error: "No se pudo crear el plan: " + error.message };
    planId = (created as { id: string }).id;
  }

  if (items.length) {
    const rows = items.map((i, idx) => ({
      plan_id: planId,
      professional_id: user.id,
      patient_id: patientId,
      name: i.name.trim(),
      detail: i.detail.trim() || null,
      sort: idx,
    }));
    const { error } = await supabase.from("exercise_items").insert(rows);
    if (error) return { error: "No se pudieron guardar las pautas: " + error.message };
  }

  revalidatePath(`/pacientes/${patientId}`);
  return { ok: true };
}

// Guarda la rutina actual como una plantilla propia del profesional (reutilizable).
export async function saveAsTemplate(data: {
  name: string;
  area: string;
  description: string;
  items: PlanItemInput[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };
  if (!data.name.trim()) return { error: "Poné un nombre a la plantilla." };

  const { error } = await supabase.from("exercise_templates").insert({
    professional_id: user.id,
    area: data.area,
    name: data.name.trim(),
    description: data.description.trim() || null,
    items: data.items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), detail: i.detail.trim() })),
    is_system: false,
  });
  if (error) return { error: "No se pudo guardar la plantilla: " + error.message };
  revalidatePath("/pacientes");
  return { ok: true };
}
