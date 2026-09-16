import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { ConfigTabs } from "@/components/config/ConfigTabs";
import { CobrosSection } from "@/components/config/CobrosSection";
import type { Insurer } from "@/components/config/InsurersPanel";
import type { Service } from "@/components/config/ServicesPanel";
import type { ScheduleData } from "@/components/config/AgendaConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Aquí agregamos la búsqueda de los datos de cobro (payment_settings) y los campos nuevos de la agenda
  const [{ data: prof }, { data: insurers }, { data: services }, { data: schedule }, { data: tpl }, { data: pay }] =
    await Promise.all([
      user
        ? supabase.from("professionals").select("full_name, license_number, clinic_name, specialties, booking_slug").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("insurers").select("id, name, plan, region, default_copay, default_stamp").order("name"),
      supabase.from("services").select("id, name, area, price, duration_min").order("name"),
      user
        ? supabase
            .from("schedule_settings")
            .select("work_start, work_end, slot_minutes, max_per_slot, working_days, booking_enabled, booking_horizon_days, deposit_enabled, deposit_amount, deposit_hold_hours, deposit_note")
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
      user
        ? supabase
            .from("payment_settings")
            .select("*")
            .eq("professional_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const reminderTemplate = (tpl as { body?: string } | null)?.body ?? null;

  const p = (prof as { full_name?: string; license_number?: string; clinic_name?: string; specialties?: string[]; booking_slug?: string } | null) ?? {};
  const profile = {
    full_name: p.full_name ?? "",
    license_number: p.license_number ?? "",
    clinic_name: p.clinic_name ?? "",
    specialties: (p.specialties ?? []) as string[],
  };
  const bookingSlug = p.booking_slug ?? null;

  return (
    <>
      <Topbar title="Configuración" subtitle="Perfil, aranceles, obras sociales, agenda y cobros" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6 flex flex-col gap-8" style={{ background: "var(--canvas)" }}>
        <ConfigTabs
          profile={profile}
          insurers={(insurers ?? []) as Insurer[]}
          services={(services ?? []) as Service[]}
          schedule={(schedule ?? null) as Partial<ScheduleData> | null}
          reminderTemplate={reminderTemplate}
          bookingSlug={bookingSlug}
        />
        
        {/* NUEVO BLOQUE DE SEÑAS Y COBROS INYECTADO AQUÍ */}
        <div className="mt-4">
          <CobrosSection
            deposit={{
              enabled: schedule?.deposit_enabled ?? false,
              amount: Number(schedule?.deposit_amount ?? 0),
              holdHours: schedule?.deposit_hold_hours ?? 24,
              note: schedule?.deposit_note ?? "",
            }}
            payment={{
              transferEnabled: pay?.transfer_enabled ?? true,
              bankAlias: pay?.bank_alias ?? "",
              bankCbu: pay?.bank_cbu ?? "",
              bankHolder: pay?.bank_holder ?? "",
              bankName: pay?.bank_name ?? "",
              bankDoc: pay?.bank_doc ?? "",
              mpLinkEnabled: pay?.mp_link_enabled ?? false,
              mpLink: pay?.mp_link ?? "",
              instructions: pay?.instructions ?? "",
              mpCheckoutEnabled: pay?.mp_checkout_enabled ?? false,
            }}
          />
        </div>
      </main>
    </>
  );
}
