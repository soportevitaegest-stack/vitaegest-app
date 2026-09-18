import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { AgendaBoard } from "@/components/agenda/AgendaBoard";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/utils/agenda";
import type { AppointmentRow, PatientLite, InsurerLite, OrderLite, ServiceLite } from "@/types/agenda";
import { FiltroSede } from "@/components/agenda/FiltroSede"; // <-- INJERTO 1: Importamos el filtro

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: { sede?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // INJERTO 2: Leemos si hay un filtro de sede en la URL
  const sedeFiltro = searchParams?.sede; 

  // INJERTO 3: Separamos la consulta de turnos para poder filtrarla y le agregamos "location_id"
  let turnosQuery = supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, status, area, reason, coverage_type, insurer_id, treatment_order_id, service_id, source, location_id, patients(first_name, last_name, phone), treatment_orders(order_number, total_sessions, used_sessions, status)"
    )
    .order("start_at", { ascending: true });

  if (sedeFiltro) {
    turnosQuery = turnosQuery.eq("location_id", sedeFiltro);
  }

  const [
    { data: appts },
    { data: patients },
    { data: insurers },
    { data: orders },
    { data: services },
    { data: tpl },
    { data: sedes } // <-- INJERTO 4: Traemos las sedes
  ] = await Promise.all([
    turnosQuery,
    supabase.from("patients").select("id, first_name, last_name").order("last_name"),
    supabase.from("insurers").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("treatment_orders")
      .select("id, patient_id, total_sessions, used_sessions, status, insurer_id")
      .eq("status", "active"),
    supabase.from("services").select("id, name, area, price").eq("is_active", true).order("name"),
    user
      ? supabase
          .from("reminder_templates")
          .select("body")
          .eq("professional_id", user.id)
          .eq("is_default", true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("locations")
      .select("id, professional_id, name, address, notes, phone, color, is_active, is_default, sort")
      .eq("is_active", true)
  ]);

  const reminderTemplate = (tpl as { body?: string } | null)?.body || DEFAULT_REMINDER_TEMPLATE;

  return (
    <>
      <Topbar title="Agenda" subtitle="Turnos y estados" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        
        {/* INJERTO 5: Ponemos los botones para filtrar arriba del tablero */}
        <div className="mb-4">
           <FiltroSede sedes={sedes ?? []} />
        </div>

        <AgendaBoard
          appointments={(appts ?? []) as unknown as AppointmentRow[]}
          patients={(patients ?? []) as PatientLite[]}
          insurers={(insurers ?? []) as InsurerLite[]}
          orders={(orders ?? []) as OrderLite[]}
          services={(services ?? []) as ServiceLite[]}
          reminderTemplate={reminderTemplate}
          sedes={sedes ?? []} // Le pasamos las sedes al tablero por si las necesita
        />
      </main>
    </>
  );
}
