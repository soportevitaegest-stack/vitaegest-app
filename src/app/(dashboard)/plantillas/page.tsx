import { createClient } from "@/lib/supabase/server";
import { PlantillasManager } from "@/components/templates/PlantillasManager";
import type { Area, Plantilla } from "@/server/actions/exerciseTemplates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plantillas · VitaeGest" };

/**
 * Plantillas de ejercicios y pautas.
 *
 * Esta es la ruta que faltaba: el menú lateral la enlazaba pero la página
 * nunca se había construido, y por eso daba 404.
 */
export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // Selects en una sola línea literal: concatenados, el cliente sin tipar
  // devuelve GenericStringError y el build se cae.
  const [plantillasRes, perfilRes] = await Promise.all([
    supabase
      .from("exercise_templates")
      .select("id, professional_id, area, name, description, items, is_system, is_active")
      .eq("is_active", true)
      .order("is_system", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("professionals")
      .select("specialties")
      .eq("id", auth.user.id)
      .single(),
  ]);

  const plantillas = (plantillasRes.data ?? []) as unknown as Plantilla[];
  const especialidades = ((perfilRes.data as unknown as { specialties: string[] } | null)
    ?.specialties ?? []) as Area[];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Plantillas de ejercicios y pautas
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Armá una vez las indicaciones que repetís siempre y después asignalas
          en dos clics desde la ficha de cada paciente.
        </p>
      </header>

      <PlantillasManager plantillas={plantillas} especialidades={especialidades} />
    </main>
  );
}
