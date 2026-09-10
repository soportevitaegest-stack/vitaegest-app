import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PatientSearch } from "@/components/patients/PatientSearch";
import { createClient } from "@/lib/supabase/server";
import type { Patient } from "@/types/domain";

export const dynamic = "force-dynamic"; // depende de la sesión (RLS)

// Lista de pacientes del profesional (RLS filtra por auth.uid()).
export default async function PacientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, first_name, last_name, document_id, birth_date, sex, phone, email, notes, is_active, medical_background, treatment_orders(total_sessions, used_sessions, status)"
    )
    .order("last_name", { ascending: true });

  const patients = (data ?? []) as unknown as Patient[];

  return (
    <>
      <Topbar title="Pacientes" subtitle={`${patients.length} fichas activas`} />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg">Mis pacientes</h2>
            <p className="text-[13px] text-muted">Fichas e historias clínicas</p>
          </div>
          <Link
            href="/pacientes/nuevo"
            className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-3.5 py-2.5 text-sm text-white trans"
            style={{ background: "var(--teal)" }}
          >
            + Nuevo paciente
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl2 px-3 py-2 text-[13px]" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            No se pudieron cargar los pacientes: {error.message}
          </div>
        ) : (
          <PatientSearch patients={patients} />
        )}
      </main>
    </>
  );
}
