"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentRow, PatientLite, InsurerLite, OrderLite, ServiceLite } from "@/types/agenda";
import {
  AREA_LABELS,
  STATUS_META,
  STATUS_ORDER,
  AREA_FILTERS,
  weekDays,
  toDateKey,
  addDays,
  fmtDayChip,
  fmtLongDate,
  fmtTime,
} from "@/lib/utils/agenda";
import { updateAppointmentStatus } from "@/server/actions/appointments";
import { NuevoTurnoForm } from "./NuevoTurnoForm";

const navBtn =
  "w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 trans border border-line";
const chip = "inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5";

const H0 = 8;
const H1 = 20;
const PX = 54;
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AgendaBoard({
  appointments,
  patients,
  insurers,
  orders,
  services,
}: {
  appointments: AppointmentRow[];
  patients: PatientLite[];
  insurers: InsurerLite[];
  orders: OrderLite[];
  services: ServiceLite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"week" | "day">("week");
  const [ref, setRef] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [area, setArea] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const days = useMemo(() => weekDays(ref), [ref]);

  const countByDay = useMemo(() => {
    const m: Record<string, number> = {};
    appointments.forEach((a) => {
      const k = toDateKey(new Date(a.start_at));
      m[k] = (m[k] ?? 0) + 1;
    });
    return m;
  }, [appointments]);

  const areaMatch = (a: AppointmentRow) => area === "all" || a.area === area;

  const dayAppts = useMemo(
    () =>
      appointments
        .filter((a) => toDateKey(new Date(a.start_at)) === selected)
        .filter(areaMatch)
        .sort((x, y) => x.start_at.localeCompare(y.start_at)),
    [appointments, selected, area]
  );

  const weekAppts = useMemo(
    () => appointments.filter((a) => a.status !== "cancelled").filter(areaMatch),
    [appointments, area]
  );

  const onStatus = (id: string, status: string) =>
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, status);
      if (res?.error) alert("No se pudo cambiar el estado: " + res.error);
      router.refresh();
    });

  const patientName = (a: AppointmentRow) =>
    a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Paciente";

  const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
  const rangeLabel = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[5].getDate()}/${days[5].getMonth() + 1}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button className={navBtn} onClick={() => setRef(addDays(ref, -7))} aria-label="Semana anterior">‹</button>
          <button className={navBtn} onClick={() => setRef(addDays(ref, 7))} aria-label="Semana siguiente">›</button>
          <button
            className="rounded-lg px-3 h-8 text-[12.5px] font-semibold border border-line trans hover:bg-surface-2"
            onClick={() => { const t = new Date(); setRef(t); setSelected(toDateKey(t)); }}
          >
            Hoy
          </button>
          <span className="text-[13px] text-muted tnum ml-1">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {(["week", "day"] as const).map((k) => {
              const on = view === k;
              return (
                <button key={k} onClick={() => setView(k)} className="text-[12.5px] font-semibold px-3 py-1 rounded-lg trans"
                  style={on ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
                  {k === "week" ? "Semana" : "Día"}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-3.5 py-2 text-sm text-white trans"
            style={{ background: "var(--teal)" }}
          >
            {showForm ? "Cerrar" : "+ Nuevo turno"}
          </button>
        </div>
      </div>

      {/* Filtro por especialidad */}
      <div className="flex items-center gap-1 p-1 rounded-xl2 w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {AREA_FILTERS.map((f) => {
          const on = area === f.key;
          return (
            <button key={f.key} onClick={() => setArea(f.key)} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg trans"
              style={on ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {showForm && (
        <NuevoTurnoForm
          patients={patients}
          insurers={insurers}
          orders={orders}
          services={services}
          defaultDate={selected}
          onDone={() => { setShowForm(false); router.refresh(); }}
        />
      )}

      {view === "week" ? (
        /* ---------- Vista semanal ---------- */
        <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 760 }}>
              {/* Encabezado de días */}
              <div className="grid border-b border-line" style={{ gridTemplateColumns: "56px repeat(6,1fr)" }}>
                <div />
                {days.map((d, i) => {
                  const k = toDateKey(d);
                  const isToday = k === toDateKey(new Date());
                  return (
                    <button key={k} onClick={() => { setSelected(k); setView("day"); }} className="text-center py-2.5 border-l border-line trans hover:bg-surface-2"
                      style={isToday ? { background: "var(--primary-soft)" } : {}}>
                      <div className="text-[11px] font-semibold text-muted uppercase">{DAY_LABELS[i]}</div>
                      <div className="font-display font-bold text-[15px] tnum" style={isToday ? { color: "var(--primary-ink)" } : {}}>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              {/* Grilla horaria */}
              <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(6,1fr)" }}>
                <div>
                  {hours.map((h) => (
                    <div key={h} style={{ height: PX }} className="relative">
                      <span className="absolute -top-2 right-2 text-[10.5px] text-muted tnum">{String(h).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>
                {days.map((d) => {
                  const k = toDateKey(d);
                  const isToday = k === toDateKey(new Date());
                  const dayList = weekAppts.filter((a) => toDateKey(new Date(a.start_at)) === k);
                  return (
                    <div key={k} className="relative border-l border-line" style={isToday ? { background: "var(--primary-soft)" } : {}}>
                      {hours.map((h) => <div key={h} style={{ height: PX }} className="border-b border-line" />)}
                      {dayList.map((a) => {
                        const start = new Date(a.start_at);
                        const end = new Date(a.end_at);
                        const top = (start.getHours() + start.getMinutes() / 60 - H0) * PX;
                        const dur = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000);
                        const col = STATUS_META[a.status].fg;
                        return (
                          <button
                            key={a.id}
                            onClick={() => { setSelected(k); setView("day"); }}
                            className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden trans hover:brightness-[1.03]"
                            style={{ top, height: dur * PX - 4, background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${col}` }}
                          >
                            <div className="text-[10.5px] font-bold tnum leading-tight" style={{ color: col }}>{fmtTime(a.start_at)}</div>
                            <div className="text-[11.5px] font-semibold truncate leading-tight">{patientName(a).split(" ")[0]}</div>
                            <div className="text-[10px] text-muted truncate">{AREA_LABELS[a.area]}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {weekAppts.length === 0 && <div className="px-5 py-6 text-center text-[13px] text-muted">Sin turnos esta semana para este filtro.</div>}
        </div>
      ) : (
        /* ---------- Vista por día ---------- */
        <>
          <div className="flex gap-2 flex-wrap">
            {days.map((d) => {
              const k = toDateKey(d);
              const on = k === selected;
              return (
                <button key={k} onClick={() => setSelected(k)} className="rounded-xl2 border px-3 py-2 text-center trans min-w-[86px]"
                  style={on ? { background: "var(--primary-soft)", borderColor: "var(--primary)", color: "var(--primary-ink)" } : { background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-[12.5px] font-semibold">{fmtDayChip(d)}</div>
                  <div className="text-[11px] text-muted">{countByDay[k] ?? 0} turnos</div>
                </button>
              );
            })}
          </div>

          <section className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-display font-bold text-[15px]">{fmtLongDate(new Date(`${selected}T00:00:00`))}</h2>
              <span className="text-xs text-muted font-medium">{dayAppts.length} turnos</span>
            </div>

            {dayAppts.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-muted">Sin turnos para este día / filtro.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {dayAppts.map((a) => {
                  const st = STATUS_META[a.status];
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-4 md:px-5 py-3.5">
                      <div className="w-14 text-center shrink-0">
                        <div className="font-display font-bold text-[15px] tnum leading-none">{fmtTime(a.start_at)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14.5px] truncate">{patientName(a)}</div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className={chip} style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>{AREA_LABELS[a.area]}</span>
                          <span className={chip} style={a.coverage_type === "obra_social" ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                            {a.coverage_type === "obra_social" ? "Obra social" : "Particular"}
                          </span>
                          {a.treatment_order_id && <span className={chip} style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>Bono</span>}
                        </div>
                      </div>
                      <span className={chip} style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                      <select
                        value={a.status}
                        disabled={pending}
                        onChange={(e) => onStatus(a.id, e.target.value)}
                        className="bg-surface-2 border border-line rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-primary trans"
                        title="Cambiar estado"
                      >
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <p className="text-[11.5px] text-muted leading-snug">
        Al marcar un turno como <b>Atendido</b>, si tiene bono asociado se descuenta 1 sesión automáticamente. Tocá un bloque de la vista semanal para abrir ese día y cambiar estados.
      </p>
    </div>
  );
}
