"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { createEvolution, type EvoActionState } from "@/server/actions/evolutions";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-4 py-2.5 text-sm text-white trans disabled:opacity-50"
      style={{ background: "var(--teal)" }}
    >
      {pending ? "Guardando…" : "Guardar evolución"}
    </button>
  );
}

export function NuevaEvolucionForm({
  patientId,
  today,
}: {
  patientId: string;
  today: string;
}) {
  const [state, formAction] = useFormState<EvoActionState, FormData>(createEvolution, null);
  const [eva, setEva] = useState(5);
  const evaTone = eva >= 7 ? "var(--rose)" : eva >= 4 ? "var(--amber)" : "var(--emerald)";

  return (
    <form action={formAction} className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-4 max-w-2xl">
      <input type="hidden" name="patient_id" value={patientId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <label className="block"><span className={lbl}>Fecha</span><input name="date" type="date" className={input} defaultValue={today} /></label>
      </div>

      {/* EVA */}
      <div className="rounded-xl2 border border-line p-3.5" style={{ background: "var(--surface-2)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] font-semibold">Escala de dolor (EVA)</span>
          <span className="font-display font-extrabold text-lg tnum" style={{ color: evaTone }}>
            {eva}<span className="text-muted text-sm font-semibold">/10</span>
          </span>
        </div>
        <input type="range" name="eva" min={0} max={10} step={1} value={eva} onChange={(e) => setEva(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-[10.5px] text-muted mt-1"><span>Sin dolor</span><span>Máximo</span></div>
      </div>

      {/* Tratamiento realizado */}
      <div className="rounded-xl2 border p-3.5" style={{ borderColor: "var(--teal)", background: "var(--teal-soft)" }}>
        <label className="block">
          <span className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--teal-ink)" }}>Tratamiento realizado en la sesión</span>
          <textarea name="treatment_done" className={input + " min-h-[70px] resize-none"} placeholder="Técnicas/prácticas ejecutadas hoy (ej: electroestimulación 15 min, biofeedback, drenaje…)" />
        </label>
      </div>

      {/* SOAP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <label className="block"><span className={lbl}>S · Subjetivo</span><textarea name="s" className={input + " min-h-[70px] resize-none"} placeholder="Relato del paciente…" /></label>
        <label className="block"><span className={lbl}>O · Objetivo</span><textarea name="o" className={input + " min-h-[70px] resize-none"} placeholder="Hallazgos de la evaluación…" /></label>
        <label className="block"><span className={lbl}>A · Evaluación</span><textarea name="a" className={input + " min-h-[70px] resize-none"} placeholder="Diagnóstico kinésico…" /></label>
        <label className="block"><span className={lbl}>P · Plan</span><textarea name="p" className={input + " min-h-[70px] resize-none"} placeholder="Conducta / próximos pasos…" /></label>
      </div>

      {state?.error && (
        <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          {state.error}
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-1">
        <Link href={`/pacientes/${patientId}`} className="inline-flex items-center rounded-xl2 px-4 py-2.5 text-sm font-semibold border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
          Cancelar
        </Link>
        <SubmitBtn />
      </div>
    </form>
  );
}
