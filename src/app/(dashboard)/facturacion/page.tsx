import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { BillingBoard } from "@/components/billing/BillingBoard";
import type { PaymentRow } from "@/types/billing";
import type { PatientLite, InsurerLite } from "@/types/agenda";

export const dynamic = "force-dynamic";

export default async function FacturacionPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: patients }, { data: insurers }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, copay_amount, stamp_amount, total_amount, status, method, coverage_type, insurer_id, paid_at, created_at, patients(first_name, last_name)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("patients").select("id, first_name, last_name").order("last_name"),
    supabase.from("insurers").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <Topbar title="Facturación" subtitle="Cobros, obras sociales y bonos" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <BillingBoard
          payments={(payments ?? []) as unknown as PaymentRow[]}
          patients={(patients ?? []) as PatientLite[]}
          insurers={(insurers ?? []) as InsurerLite[]}
        />
      </main>
    </>
  );
}
