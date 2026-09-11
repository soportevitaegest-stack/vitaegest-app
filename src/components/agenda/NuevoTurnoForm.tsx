"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { PatientLite, InsurerLite, OrderLite } from "@/types/agenda";
import { AREA_OPTIONS } from "@/lib/utils/agenda";
import { createAppointment, type ApptActionState } from "@/server/actions/appointments";

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
      {pending ? "Guardando…" : "Agendar turno"}
    </button>
  );
}

export function NuevoTurnoForm({
  patients,
  insurers,
  orders,
  defaultDate,
  onDone,
}: {
  patients: PatientLite[];
  insurers: InsurerLite[];
  orders: OrderLite[];
  defaultDate: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<ApptActionState, FormData>(createAppointment, null);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [coverage, setCoverage] = useState("particular");
  const [useBono, setUseBono] = useState(false);

  const bono = useMemo(
    () =>
      orders.find(
        (o) =>
          o.patient_id === patientId &&
          o.status === "active" &&
          o.total_sessions - o.used_sessions > 0
      ),
    [orders, patientId]
  );

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-3.5">
      <h3 className="font-display font-bold text-[15px]">Nuevo turno</h3>

      <label className="block">
        <span className={lbl}>Paciente</span>
        <select name="patient_id" className={input} value={patientId} onChange={(e) => { setPatientId(e.target.value); setUseBono(false); }}>
          {patients.length === 0 && <option value="">— No hay pacientes —</option>}
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3.5">
        <label className="block"><span className={lbl}>Fecha</span><input name="date" type="date" className={input} defaultValue={defaultDate} /></label>
        <label className="block"><span className={lbl}>Horario</span><input name="time" type="time" className={input} defaultValue="09:00" /></label>
        <label className="block">
          <span className={lbl}>Duración</span>
          <select name="duration" className={input} defaultValue="45">
            <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option>
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Estado</span>
          <select name="status" className={input} defaultValue="confirmed">
            <option value="confirmed">Confirmado</option><option value="pending">Pendiente</option>
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Área</span>
          <select name="area" className={input} defaultValue="pelvic_perineal">
            {AREA_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Cobertura</span>
          <select name="coverage_type" className={input} value={coverage} onChange={(e) => setCoverage(e.target.value)}>
            <option value="particular">Particular</option><option value="obra_social">Obra Social</option>
          </select>
        </label>
      </div>

      {coverage === "obra_social" && (
        <label className="block">
          <span className={lbl}>Obra social</span>
          <select name="insurer_id" className={input} defaultValue={insurers[0]?.id ?? ""}>
            {insurers.length === 0 && <option value="">— Sin obras sociales cargadas —</option>}
            {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
      )}

      {bono ? (
        <label className="flex items-center gap-3 rounded-xl2 border border-line p-3 cursor-pointer" style={{ background: "var(--surface-2)" }}>
          <input type="checkbox" checked={useBono} onChange={(e) => setUseBono(e.target.checked)} className="w-4 h-4" />
          <span className="text-[13px]">Descontar de bono activo <b>({bono.total_sessions - bono.used_sessions} sesiones restantes)</b></span>
        </label>
      ) : (
        <p className="text-[12px] text-muted">Este paciente no tiene bono activo.</p>
      )}
      <input type="hidden" name="treatment_order_id" value={useBono && bono ? bono.id : ""} />

      <label className="block"><span className={lbl}>Motivo (opcional)</span><input name="reason" className={input} placeholder="Ej: control, primera consulta…" /></label>

      {state?.error && (
        <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          {state.error}
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-1">
        <button type="button" onClick={onDone} className="inline-flex items-center rounded-xl2 px-4 py-2.5 text-sm font-semibold border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
          Cancelar
        </button>
        <SubmitBtn />
      </div>
    </form>
  );
}
