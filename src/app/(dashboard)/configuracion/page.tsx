import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { ConfigTabs } from "@/components/config/ConfigTabs";
import type { Insurer } from "@/components/config/InsurersPanel";
import type { Service } from "@/components/config/ServicesPanel";
import type { ScheduleData } from "@/components/config/AgendaConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: prof }, { data: insurers }, { data: services }, { data: schedule }, { data: tpl }] =
    await Promise.all([
      user
        ? supabase.from("professionals").select("full_name, license_number, clinic_name, specialties").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("insurers").select("id, name, plan, region, default_copay, default_stamp").order("name"),
      supabase.from("services").select("id, name, area, price, duration_min").order("name"),
      user
        ? supabase
            .from("schedule_settings")
            .select("work_start, work_end, slot_minutes, max_per_slot, working_days, booking_enabled, booking_horizon_days")
            .eq("professional_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
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

  const reminderTemplate = (tpl as { body?: string } | null)?.body ?? null;

  const p = (prof as { full_name?: string; license_number?: string; clinic_name?: string; specialties?: string[] } | null) ?? {};
  const profile = {
    full_name: p.full_name ?? "",
    license_number: p.license_number ?? "",
    clinic_name: p.clinic_name ?? "",
    specialties: (p.specialties ?? []) as string[],
  };

  return (
    <>
      <Topbar title="Configuración" subtitle="Perfil, aranceles, obras sociales y agenda" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <ConfigTabs
          profile={profile}
          insurers={(insurers ?? []) as Insurer[]}
          services={(services ?? []) as Service[]}
          schedule={(schedule ?? null) as Partial<ScheduleData> | null}
          reminderTemplate={reminderTemplate}
        />
      </main>
    </>
  );
}
