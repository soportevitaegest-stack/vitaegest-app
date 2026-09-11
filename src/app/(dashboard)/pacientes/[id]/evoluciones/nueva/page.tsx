import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NuevaEvolucionForm } from "@/components/clinical/NuevaEvolucionForm";

export const dynamic = "force-dynamic";

export default async function NuevaEvolucionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, last_name")
    .eq("id", params.id)
    .single();

  if (!patient) notFound();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Topbar title="Nueva evolución" subtitle={`${patient.first_name} ${patient.last_name}`} />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <div className="mb-4">
          <Link href={`/pacientes/${params.id}`} className="text-[13px] font-semibold" style={{ color: "var(--primary-ink)" }}>
            ← Volver a la ficha
          </Link>
        </div>
        <NuevaEvolucionForm patientId={params.id} today={today} />
      </main>
    </>
  );
}
