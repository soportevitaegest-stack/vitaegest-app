import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { PlantillasManager } from "@/components/templates/PlantillasManager";
import type { Area, Plantilla } from "@/server/actions/exerciseTemplates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plantillas · VitaeGest" };

/**
 * Plantillas de ejercicios y pautas.
 *
 * Estructura igual que el resto del sistema: <Topbar> + <main> con el scroll.
 * El Topbar es el que trae el botón ☰ del menú en celular; sin él, la página
 * queda sin forma de volver al menú y hay que usar la flecha del navegador.
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
    <>
      <Topbar
        title="Plantillas"
        subtitle="Ejercicios y pautas que armás una vez y asignás en dos clics"
      />

      <main
        className="flex-1 overflow-y-auto px-5 py-6 md:px-7"
        style={{ background: "var(--canvas)" }}
      >
        <div className="mx-auto w-full max-w-5xl">
          <PlantillasManager plantillas={plantillas} especialidades={especialidades} />
        </div>
      </main>
    </>
  );
}
