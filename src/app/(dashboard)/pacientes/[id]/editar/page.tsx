import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PacienteForm, type Paciente } from "@/components/patients/PacienteForm";

export const metadata: Metadata = { title: "Editar paciente · VitaeGest" };

export default async function EditarPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // El RLS ya filtra por profesional: si el id es de otra, no devuelve nada.
  // Ojo: el string del select va en UNA sola línea literal. Si lo partís con
  // `"..." + "..."`, Supabase pierde la inferencia de tipos y TypeScript falla
  // el build con GenericStringError.
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, document_id, birth_date, sex, phone, email, address, medical_history, allergies, notes, is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const paciente = data as unknown as Paciente;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-soft">
        <Link href="/pacientes" className="hover:text-primary">
          Pacientes
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/pacientes/${paciente.id}`} className="hover:text-primary">
          {paciente.first_name} {paciente.last_name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">Editar</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink">
          Editar a {paciente.first_name} {paciente.last_name}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          Corregí lo que haga falta. Los cambios no tocan sus evoluciones ni sus turnos.
        </p>
      </header>

      <PacienteForm paciente={paciente} />
    </div>
  );
}
