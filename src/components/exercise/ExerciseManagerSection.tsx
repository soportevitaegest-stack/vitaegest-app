import { createClient } from "@/lib/supabase/server";
import { ExerciseManager, type Template, type ItemRow } from "./ExerciseManager";

// Server Component: trae el plan activo del paciente + sus pautas + las
// plantillas disponibles (sistema + propias), y monta el editor cliente.
export async function ExerciseManagerSection({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: planRow } = await supabase
    .from("exercise_plans")
    .select("id, title, area")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = planRow as { id: string; title: string; area: string } | null;

  const [{ data: itemsData }, { data: templatesData }] = await Promise.all([
    plan
      ? supabase.from("exercise_items").select("name, detail, sort").eq("plan_id", plan.id).order("sort")
      : Promise.resolve({ data: [] }),
    supabase
      .from("exercise_templates")
      .select("id, name, area, description, items")
      .eq("is_active", true)
      .order("area")
      .order("name"),
  ]);

  const items = ((itemsData ?? []) as { name: string; detail: string | null; sort: number }[]).map((i) => ({
    name: i.name,
    detail: i.detail ?? "",
  })) as ItemRow[];

  const templates = (templatesData ?? []) as Template[];

  return (
    <ExerciseManager
      patientId={patientId}
      initialTitle={plan?.title ?? ""}
      initialArea={plan?.area ?? "dermatofunctional"}
      initialItems={items}
      templates={templates}
    />
  );
}
