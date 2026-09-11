"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentRow } from "@/types/agenda";
import { AREA_OPTIONS, STATUS_ORDER, STATUS_META, toDateKey } from "@/lib/utils/agenda";
import { updateAppointment } from "@/server/actions/appointments";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

// Duración inicial en minutos a partir de start/end del turno.
const minutesBetween = (a: string, b: string) =>
  Math.max(15, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function EditarTurnoForm({ appt, onDone }: { appt: AppointmentRow; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialDur = minutesBetween(appt.start_at, appt.end_at);
  const [date, setDate] = useState(() => toDateKey(new Date(appt.start_at)));
  const [time, setTime] = useState(() => hhmm(appt.start_at));
  const [duration, setDuration] = useState(String(initialDur));
  const [area, setArea] = useState<string>(appt.area);
  const [status, setStatus] = useState<string>(appt.status);

  const patientName = appt.patients
    ? `${appt.patients.first_name} ${appt.patients.last_name}`
    : "Paciente";

  const onSave = () =>
    start(async () => {
      setError(null);
      const res = await updateAppointment(appt.id, {
        date,
        time,
        duration: Number(duration) || 45,
        area,
        status,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-[15px]">Editar turno</h3>
        <span className="text-[12.5px] text-muted truncate">{patientName}</span>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <label className="block">
          <span className={lbl}>Fecha</span>
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Horario</span>
          <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Duración</span>
          <select className={input} value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Estado</span>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block col-span-2">
          <span className={lbl}>Área</span>
          <select className={input} value={area} onChange={(e) => setArea(e.target.value)}>
            {AREA_OPTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center rounded-xl2 px-4 py-2.5 text-sm font-semibold border border-line"
          style={{ background: "var(--surface-2)", color: "var(--ink)" }}
        >
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
