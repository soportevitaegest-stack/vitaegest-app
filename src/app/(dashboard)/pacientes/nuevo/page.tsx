"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Topbar } from "@/components/layout/Topbar";
import { createPatient, type ActionState } from "@/server/actions/patients";

// NEXT 14 / REACT 18: se usan useFormState + useFormStatus de "react-dom".
// (En React 19 esto sería useActionState.)
const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const label = "block text-[12.5px] font-semibold text-ink mb-1.5";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-4 py-2.5 text-sm text-white trans disabled:opacity-50"
      style={{ background: "var(--teal)" }}
    >
      {pending ? "Guardando…" : "Crear paciente"}
    </button>
  );
}

export default function NuevoPacientePage() {
  const [state, formAction] = useFormState<ActionState, FormData>(createPatient, null);

  return (
    <>
      <Topbar title="Nuevo paciente" subtitle="Alta de ficha" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <form action={formAction} className="max-w-2xl bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block"><span className={label}>Nombre</span><input name="first_name" className={input} required /></label>
            <label className="block"><span className={label}>Apellido</span><input name="last_name" className={input} required /></label>
            <label className="block"><span className={label}>Teléfono</span><input name="phone" className={input} placeholder="+54 9 11 …" /></label>
            <label className="block"><span className={label}>Email</span><input name="email" type="email" className={input} /></label>
            <label className="block"><span className={label}>Fecha de nacimiento</span><input name="birth_date" type="date" className={input} /></label>
            <label className="block"><span className={label}>Sexo</span>
              <select name="sex" className={input} defaultValue="">
                <option value="">—</option><option value="F">F</option><option value="M">M</option><option value="X">X</option>
              </select>
            </label>
          </div>
          <label className="block"><span className={label}>Motivo de consulta</span><textarea name="notes" className={input + " min-h-[64px] resize-none"} /></label>
          <label className="block"><span className={label}>Antecedentes generales</span><textarea name="antecedentes" className={input + " min-h-[64px] resize-none"} placeholder="Patológicos, quirúrgicos, familiares…" /></label>
          <label className="block"><span className={label}>Alergias</span><input name="alergias" className={input} /></label>

          {state?.error && (
            <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <Link href="/pacientes" className="inline-flex items-center rounded-xl2 px-4 py-2.5 text-sm font-semibold border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
              Cancelar
            </Link>
            <SubmitButton />
          </div>
        </form>
      </main>
    </>
  );
}
