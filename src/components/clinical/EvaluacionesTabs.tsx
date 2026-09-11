"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SchemaForm } from "./SchemaForm";
import { saveAssessment } from "@/server/actions/assessments";
import { sectionsForSpecialties } from "@/lib/clinical/schemas";

type ValuesByKind = Record<string, Record<string, string | string[]>>;

export function EvaluacionesTabs({
  patientId,
  specialties,
  initial,
}: {
  patientId: string;
  specialties: string[];
  initial: ValuesByKind;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sections = useMemo(() => sectionsForSpecialties(specialties), [specialties]);
  const [active, setActive] = useState(sections[0]?.kind ?? "general");
  const [values, setValues] = useState<ValuesByKind>(() => ({ ...initial }));
  const [saved, setSaved] = useState(false);

  const current = sections.find((s) => s.kind === active) ?? sections[0];
  const vals = values[active] ?? {};

  const setField = (k: string, v: string | string[]) =>
    setValues((prev) => ({ ...prev, [active]: { ...(prev[active] ?? {}), [k]: v } }));

  const onSave = () =>
    startTransition(async () => {
      const res = await saveAssessment(patientId, active, values[active] ?? {});
      if (res?.error) {
        alert("No se pudo guardar: " + res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Solapas de secciones */}
      <div className="flex gap-1.5 flex-wrap p-1 rounded-xl2 w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {sections.map((s) => {
          const on = s.kind === active;
          return (
            <button
              key={s.kind}
              onClick={() => setActive(s.kind)}
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg trans"
              style={on ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Formulario de la sección activa */}
      <section className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px]">{current?.label}</h3>
          <div className="flex items-center gap-2">
            {saved && <span className="text-[12px] font-semibold" style={{ color: "var(--teal-ink)" }}>Guardado ✓</span>}
            <button
              onClick={onSave}
              disabled={pending}
              className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-4 py-2 text-sm text-white trans disabled:opacity-50"
              style={{ background: "var(--teal)" }}
            >
              {pending ? "Guardando…" : "Guardar sección"}
            </button>
          </div>
        </div>

        {current && <SchemaForm schema={current.schema} values={vals} onField={setField} />}
      </section>

      <p className="text-[11.5px] text-muted leading-snug">
        Cada sección se guarda por separado en <code>clinical_assessments</code> (una fila por tipo de evaluación). Los
        campos se almacenan como JSONB, así que agregar o quitar campos no requiere tocar la base.
      </p>
    </div>
  );
}
