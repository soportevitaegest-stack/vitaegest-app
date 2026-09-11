import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { EvaluacionesTabs } from "@/components/clinical/EvaluacionesTabs";

export const dynamic = "force-dynamic";

type AssessmentRow = { kind: string; data: Record<string, string | string[]> | null };

export default async function EvaluacionesPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: patient }, { data: prof }, { data: assessments }] = await Promise.all([
    supabase.from("patients").select("first_name, last_name").eq("id", params.id).single(),
    user
      ? supabase.from("professionals").select("specialties").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("clinical_assessments").select("kind, data").eq("patient_id", params.id),
  ]);

  if (!patient) notFound();

  const initial: Record<string, Record<string, string | string[]>> = {};
  ((assessments ?? []) as AssessmentRow[]).forEach((a) => {
    initial[a.kind] = a.data ?? {};
  });

  const specialties = ((prof as { specialties?: string[] } | null)?.specialties ?? []) as string[];

  return (
    <>
      <Topbar title="Ficha clínica especializada" subtitle={`${patient.first_name} ${patient.last_name}`} />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <div className="mb-4">
          <Link href={`/pacientes/${params.id}`} className="text-[13px] font-semibold" style={{ color: "var(--primary-ink)" }}>
            ← Volver a la ficha
          </Link>
        </div>
        <EvaluacionesTabs patientId={params.id} specialties={specialties} initial={initial} />
      </main>
    </>
  );
}
