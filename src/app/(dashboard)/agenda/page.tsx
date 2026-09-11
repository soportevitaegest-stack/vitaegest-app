import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { AgendaBoard } from "@/components/agenda/AgendaBoard";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/utils/agenda";
import type { AppointmentRow, PatientLite, InsurerLite, OrderLite, ServiceLite } from "@/types/agenda";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: appts }, { data: patients }, { data: insurers }, { data: orders }, { data: services }, { data: tpl }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, start_at, end_at, status, area, reason, coverage_type, insurer_id, treatment_order_id, source, patients(first_name, last_name, phone)"
        )
        .order("start_at", { ascending: true }),
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
    ]);

  const reminderTemplate = (tpl as { body?: string } | null)?.body || DEFAULT_REMINDER_TEMPLATE;

  return (
    <>
      <Topbar title="Agenda" subtitle="Turnos y estados" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <AgendaBoard
          appointments={(appts ?? []) as unknown as AppointmentRow[]}
          patients={(patients ?? []) as PatientLite[]}
          insurers={(insurers ?? []) as InsurerLite[]}
          orders={(orders ?? []) as OrderLite[]}
          services={(services ?? []) as ServiceLite[]}
          reminderTemplate={reminderTemplate}
        />
      </main>
    </>
  );
}
