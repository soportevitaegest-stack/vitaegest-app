"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSchedule } from "@/server/actions/config";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

const DOW: [number, string][] = [
  [1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [7, "Dom"],
];

export type ScheduleData = {
  work_start: string;
  work_end: string;
  slot_minutes: number;
  max_per_slot: number;
  working_days: number[];
  booking_enabled: boolean;
  booking_horizon_days: number;
};

const DEFAULTS: ScheduleData = {
  work_start: "08:00",
  work_end: "20:00",
  slot_minutes: 60,
  max_per_slot: 1,
  working_days: [1, 2, 3, 4, 5, 6],
  booking_enabled: false,
  booking_horizon_days: 14,
};

export function AgendaConfigForm({ initial }: { initial: Partial<ScheduleData> | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [s, setS] = useState<ScheduleData>({ ...DEFAULTS, ...(initial ?? {}) });
  const set = <K extends keyof ScheduleData>(k: K, v: ScheduleData[K]) => setS((p) => ({ ...p, [k]: v }));
  const toggleDay = (n: number) =>
    set("working_days", s.working_days.includes(n) ? s.working_days.filter((x) => x !== n) : [...s.working_days, n].sort((a, b) => a - b));

  const onSave = () =>
    start(async () => {
      const res = await saveSchedule(s);
      if (res?.error) { alert("No se pudo guardar: " + res.error); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
        <h3 className="font-display font-bold text-[15px] mb-1">Días y horarios de atención</h3>
        <p className="text-[12.5px] text-muted mb-3">Definí cuándo atendés y el tamaño de los bloques.</p>

        <div className="mb-4">
          <span className={lbl}>Días de atención</span>
          <div className="flex flex-wrap gap-1.5">
            {DOW.map(([n, l]) => {
              const on = s.working_days.includes(n);
              return (
                <button key={n} type="button" onClick={() => toggleDay(n)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full trans"
                  style={on ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <label className="block"><span className={lbl}>Horario desde</span><input type="time" className={input} value={s.work_start} onChange={(e) => set("work_start", e.target.value)} /></label>
          <label className="block"><span className={lbl}>Horario hasta</span><input type="time" className={input} value={s.work_end} onChange={(e) => set("work_end", e.target.value)} /></label>
          <label className="block"><span className={lbl}>Duración del bloque</span>
            <select className={input} value={s.slot_minutes} onChange={(e) => set("slot_minutes", Number(e.target.value))}>
              <option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
            </select>
          </label>
          <label className="block"><span className={lbl}>Turnos por bloque</span><input type="number" min={1} max={6} className={input} value={s.max_per_slot} onChange={(e) => set("max_per_slot", Math.max(1, Number(e.target.value) || 1))} /></label>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-[13.5px] font-semibold">Reservas online del paciente</div>
            <p className="text-[12px] text-muted mt-0.5">Permití que el paciente saque turnos desde su portal, según esta disponibilidad.</p>
          </div>
          <input type="checkbox" className="w-5 h-5" checked={s.booking_enabled} onChange={(e) => set("booking_enabled", e.target.checked)} />
        </label>
        {s.booking_enabled && (
          <label className="block mt-3"><span className={lbl}>Anticipación máxima para reservar (días)</span>
            <input type="number" min={1} max={60} className={input} value={s.booking_horizon_days} onChange={(e) => set("booking_horizon_days", Math.max(1, Number(e.target.value) || 14))} />
          </label>
        )}
      </div>

      <div className="rounded-xl2 border border-line p-3 text-[12px] text-muted" style={{ background: "var(--surface-2)" }}>
        Resumen: <b className="text-ink">{s.working_days.length}</b> días/semana · bloques de <b className="text-ink">{s.slot_minutes} min</b> · <b className="text-ink">{s.max_per_slot}</b> turno(s) por bloque · reservas online <b style={{ color: s.booking_enabled ? "var(--teal-ink)" : "var(--muted)" }}>{s.booking_enabled ? "habilitadas" : "deshabilitadas"}</b>.
      </div>

      <div className="flex items-center justify-end gap-2.5">
        {saved && <span className="text-[12px] font-semibold" style={{ color: "var(--teal-ink)" }}>Guardado ✓</span>}
        <button onClick={onSave} disabled={pending} className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-5 py-2.5 text-sm text-white trans disabled:opacity-50" style={{ background: "var(--teal)" }}>
          {pending ? "Guardando…" : "Guardar agenda"}
        </button>
      </div>
    </div>
  );
}
