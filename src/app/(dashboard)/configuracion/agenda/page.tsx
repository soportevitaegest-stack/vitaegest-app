import { createClient } from "@/lib/supabase/server";
import { SedesSection } from "@/components/config/SedesSection";
import { HorariosSemana } from "@/components/config/HorariosSemana";
import type { Bloque, Sede } from "@/lib/agenda";

export const metadata = { title: "Agenda · Configuración" };

/**
 * Configuración → Agenda.
 *
 * Primero los lugares, después los horarios: el orden de la página es el orden
 * en que hay que pensarlo, porque cada tramo se asigna a un lugar.
 */
export default async function ConfiguracionAgenda() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // Selects en una sola línea literal: concatenarlos rompe la inferencia de
  // tipos del cliente sin tipar y TypeScript devuelve GenericStringError.
  const [sedesRes, bloquesRes, cfgRes] = await Promise.all([
    supabase
      .from("locations")
      .select("id, professional_id, name, address, notes, phone, color, is_active, is_default, sort")
      .order("is_default", { ascending: false })
      .order("sort", { ascending: true }),
    supabase
      .from("schedule_blocks")
      .select("id, location_id, weekday, start_time, end_time, slot_minutes, max_per_slot, is_active")
      .eq("is_active", true)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("schedule_settings")
      .select("slot_minutes, max_per_slot, booking_enabled, booking_horizon_days")
      .eq("professional_id", auth.user.id)
      .single(),
  ]);

  const sedes = (sedesRes.data ?? []) as unknown as Sede[];
  const bloques = (bloquesRes.data ?? []) as unknown as Bloque[];
  const cfg = (cfgRes.data ?? null) as unknown as {
    slot_minutes: number;
    booking_enabled: boolean;
  } | null;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6">
      <header className="mb-8">
        {/* Usamos text-ink para que sea negro de día y blanco de noche */}
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Tu agenda</h1>
        {/* Usamos text-muted para el texto secundario */}
        <p className="mt-2 text-muted">
          Dónde atendés y en qué horarios. Es lo que ven tus pacientes cuando
          piden turno, así que conviene que esté fiel a la realidad.
        </p>
      </header>

      <div className="space-y-6">
        <SedesSection sedes={sedes} />

        <HorariosSemana
          sedes={sedes}
          bloquesIniciales={bloques}
          duracionPorDefecto={cfg?.slot_minutes ?? 45}
        />
      </div>

      {!cfg?.booking_enabled && (
        <p className="mt-6 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted">
          Las reservas online están apagadas. Mientras estén así, estos horarios
          organizan tu agenda pero tus pacientes no pueden pedir turno solas.
        </p>
      )}
    </main>
  );
}
