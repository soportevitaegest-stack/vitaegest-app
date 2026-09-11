"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentRow, ServiceLite, InsurerLite } from "@/types/agenda";
import { AREA_OPTIONS, STATUS_ORDER, STATUS_META } from "@/lib/utils/agenda";
import { dateKeyInTZ, timeInputInTZ } from "@/lib/utils/tz";
import { updateAppointment } from "@/server/actions/appointments";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

const minutesBetween = (a: string, b: string) =>
  Math.max(15, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

export function EditarTurnoForm({
  appt,
  services,
  insurers,
  onDone,
}: {
  appt: AppointmentRow;
  services: ServiceLite[];
  insurers: InsurerLite[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialDur = minutesBetween(appt.start_at, appt.end_at);
  const [date, setDate] = useState(() => dateKeyInTZ(appt.start_at));
  const [time, setTime] = useState(() => timeInputInTZ(appt.start_at));
  const [duration, setDuration] = useState(String(initialDur));
  const [status, setStatus] = useState<string>(appt.status);
  const [serviceId, setServiceId] = useState<string>(appt.service_id ?? "");
  const [area, setArea] = useState<string>(appt.area);
  const [coverage, setCoverage] = useState<"particular" | "obra_social">(appt.coverage_type);
  const [insurerId, setInsurerId] = useState<string>(appt.insurer_id ?? insurers[0]?.id ?? "");
  const [orderNumber, setOrderNumber] = useState<string>(appt.treatment_orders?.order_number ?? "");
  const [sessions, setSessions] = useState<string>(String(appt.treatment_orders?.total_sessions ?? 1));

  const isOS = coverage === "obra_social";
  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const used = appt.treatment_orders?.used_sessions ?? 0;
  const total = appt.treatment_orders?.total_sessions ?? 0;

  const patientName = appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "Paciente";
  const isSelfBooked = appt.source === "patient";

  const onSave = () =>
    start(async () => {
      setError(null);
      const res = await updateAppointment(appt.id, appt.treatment_order_id ?? null, {
        date,
        time,
        duration: Number(duration) || 45,
        area,
        status,
        serviceId: serviceId || null,
        coverageType: coverage,
        insurerId: isOS ? insurerId || null : null,
        orderNumber: isOS ? orderNumber : orderNumber || null,
        sessions: Math.max(1, parseInt(sessions || "1", 10) || 1),
        reason: appt.reason ?? null,
      });
      if (res?.error) { setError(res.error); return; }
      onDone();
      router.refresh();
    });

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-[15px]">Detalle del turno</h3>
          {isSelfBooked && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
              Auto-agendado
            </span>
          )}
        </div>
        <span className="text-[12.5px] text-muted truncate">{patientName}</span>
      </div>

      {isSelfBooked && appt.status === "pending" && (
        <p className="text-[12px] leading-snug rounded-xl2 px-3 py-2" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>
          Este turno lo reservó el paciente. Completá el tratamiento, la cobertura y las sesiones, y confirmalo.
        </p>
      )}

      {/* Fecha / hora / duración / estado */}
      <div className="grid grid-cols-2 gap-3.5">
        <label className="block"><span className={lbl}>Fecha</span><input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="block"><span className={lbl}>Horario</span><input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="block">
          <span className={lbl}>Duración</span>
          <select className={input} value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option>
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Estado</span>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </label>
      </div>

      {/* Tratamiento + área */}
      <div className="grid grid-cols-2 gap-3.5">
        <label className="block col-span-2 sm:col-span-1">
          <span className={lbl}>Tratamiento / prestación</span>
          <select
            className={input}
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              const s = services.find((x) => x.id === e.target.value);
              if (s) setArea(s.area);
            }}
          >
            <option value="">— Sin asignar —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{isOS ? "" : ` · ${money(s.price)}`}</option>
            ))}
          </select>
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className={lbl}>Área</span>
          <select className={input} value={area} onChange={(e) => setArea(e.target.value)}>
            {AREA_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
      </div>

      {/* Cobertura + sesiones */}
      <div className="grid gap-3.5 rounded-xl2 border border-line p-3.5" style={{ background: "var(--surface-2)" }}>
        <div className="flex items-center gap-1 p-1 rounded-xl2 w-fit" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["particular", "obra_social"] as const).map((c) => {
            const on = coverage === c;
            return (
              <button key={c} type="button" onClick={() => setCoverage(c)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg trans"
                style={on ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { color: "var(--muted)" }}>
                {c === "particular" ? "Particular" : "Obra social"}
              </button>
            );
          })}
        </div>

        {isOS && (
          <div className="grid grid-cols-2 gap-3.5">
            <label className="block">
              <span className={lbl}>Obra social</span>
              <select className={input} value={insurerId} onChange={(e) => setInsurerId(e.target.value)}>
                {insurers.length === 0 && <option value="">— Sin obras sociales —</option>}
                {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={lbl}>Número de orden / bono</span>
              <input className={input} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Ej: 0012345" />
            </label>
          </div>
        )}

        <label className="block">
          <span className={lbl}>Cantidad de sesiones indicadas</span>
          <input type="number" min={1} max={60} className={input} value={sessions} onChange={(e) => setSessions(e.target.value)} />
        </label>

        {total > 0 && (
          <div className="rounded-xl2 border border-line p-2.5 flex items-center justify-between" style={{ background: "var(--surface)" }}>
            <span className="text-[12.5px] text-muted">Sesiones consumidas</span>
            <span className="text-[13px] font-bold tnum" style={{ color: "var(--teal-ink)" }}>{used} de {total}</span>
          </div>
        )}
        <p className="text-[11.5px] text-muted leading-snug">Las sesiones se descuentan automáticamente al marcar cada turno como <b>Atendido</b>.</p>
      </div>

      {error && (
        <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-1">
        <button type="button" onClick={onDone} className="inline-flex items-center rounded-xl2 px-4 py-2.5 text-sm font-semibold border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-4 py-2.5 text-sm text-white trans disabled:opacity-50"
          style={{ background: "var(--teal)" }}
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
