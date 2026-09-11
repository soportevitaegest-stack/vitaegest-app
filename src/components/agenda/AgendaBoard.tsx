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
import { clockInTZ } from "@/lib/utils/tz";
import { updateAppointmentStatus } from "@/server/actions/appointments";
import { NuevoTurnoForm } from "./NuevoTurnoForm";
import { EditarTurnoForm } from "./EditarTurnoForm";
import { WhatsappReminderButton } from "./WhatsappReminderButton";

const navBtn =
  "w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 trans border border-line";
const chip = "inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5";

// Rango horario visible y alto de cada franja (px).
const H0 = 8;
const H1 = 20;
const PX = 56;
const GUT = 56; // ancho de la columna de horas
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AgendaBoard({
  appointments,
  patients,
  insurers,
  orders,
  services,
  reminderTemplate,
}: {
  appointments: AppointmentRow[];
  patients: PatientLite[];
  insurers: InsurerLite[];
  orders: OrderLite[];
  services: ServiceLite[];
  reminderTemplate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"week" | "day">("week");
  const [ref, setRef] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [area, setArea] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);

  const days = useMemo(() => weekDays(ref), [ref]);
  const hours = useMemo(() => Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i), []);
  const trackH = (hours.length - 1) * PX; // alto útil de la grilla (última etiqueta al pie)

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

  // Bandeja: turnos que reservó el paciente (autogestión) y esperan confirmación.
  const pendingSelf = useMemo(
    () =>
      appointments
        .filter((a) => a.source === "patient" && a.status === "pending")
        .sort((x, y) => x.start_at.localeCompare(y.start_at)),
    [appointments]
  );

  const onStatus = (id: string, status: string) =>
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, status);
      if (res?.error) alert("No se pudo cambiar el estado: " + res.error);
      router.refresh();
    });

  const patientName = (a: AppointmentRow) =>
    a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Paciente";

  const openEdit = (a: AppointmentRow) => {
    setShowForm(false);
    setEditing(a);
    setView("day");
    setSelected(toDateKey(new Date(a.start_at)));
  };

  const rangeLabel = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[5].getDate()}/${days[5].getMonth() + 1}`;

  // Posición vertical (px) de un turno dentro de la grilla, acotada al rango visible.
  const blockGeom = (a: AppointmentRow) => {
    const s = clockInTZ(a.start_at);
    const e = clockInTZ(a.end_at);
    const startH = s.h + s.m / 60;
    const endH = e.h + e.m / 60;
    const top = Math.max(0, (startH - H0) * PX);
    const rawH = Math.max(0.5, endH - startH) * PX;
    const height = Math.max(20, Math.min(rawH, trackH - top));
    return { top, height };
  };

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
            onClick={() => { setEditing(null); setShowForm((v) => !v); }}
            className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-3.5 py-2 text-sm text-white trans"
            style={{ background: "var(--teal)" }}
          >
            {showForm ? "Cerrar" : "+ Nuevo turno"}
          </button>
        </div>
      </div>

      {/* Bandeja de autoagendados pendientes de confirmación */}
      {pendingSelf.length > 0 && (
        <div className="rounded-xl3 border p-4" style={{ background: "var(--amber-soft)", borderColor: "var(--amber)" }}>
          <h3 className="font-display font-bold text-[13.5px] mb-2.5 flex items-center gap-2" style={{ color: "var(--amber)" }}>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[11px]" style={{ background: "var(--amber)" }}>{pendingSelf.length}</span>
            Turnos reservados por pacientes · a confirmar
          </h3>
          <div className="flex flex-col gap-2">
            {pendingSelf.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl2 border border-line px-3 py-2 flex-wrap" style={{ background: "var(--surface)" }}>
                <span className="text-[12.5px] font-bold tnum whitespace-nowrap">{fmtDayChip(new Date(a.start_at))} · {fmtTime(a.start_at)}</span>
                <span className="text-[13px] font-semibold flex-1 min-w-[120px] truncate">{patientName(a)}</span>
                {a.reason && <span className="text-[12px] text-muted truncate max-w-[220px]">{a.reason}</span>}
                <button
                  onClick={() => openEdit(a)}
                  className="text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 text-white trans"
                  style={{ background: "var(--teal)" }}
                >
                  Revisar y completar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por especialidad */}
      <div className="flex items-center gap-1 p-1 rounded-xl2 w-fit overflow-x-auto max-w-full" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {AREA_FILTERS.map((f) => {
          const on = area === f.key;
          return (
            <button key={f.key} onClick={() => setArea(f.key)} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg trans whitespace-nowrap"
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
          services={services}
          defaultDate={selected}
          onDone={() => { setShowForm(false); router.refresh(); }}
        />
      )}

      {editing && (
        <EditarTurnoForm
          appt={editing}
          services={services}
          insurers={insurers}
          onDone={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {view === "week" ? (
        /* ---------- Vista semanal ---------- */
        <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 760 }}>
              {/* Cabecera de días (fila separada, no comparte contexto con los bloques) */}
              <div className="grid border-b border-line" style={{ gridTemplateColumns: `${GUT}px repeat(6,1fr)` }}>
                <div />
                {days.map((d, i) => {
                  const k = toDateKey(d);
                  const isToday = k === toDateKey(new Date());
                  return (
                    <button
                      key={k}
                      onClick={() => { setSelected(k); setView("day"); }}
                      className="text-center py-2.5 border-l border-line trans hover:bg-surface-2"
                      style={isToday ? { background: "var(--primary-soft)" } : {}}
                    >
                      <div className="text-[11px] font-semibold text-muted uppercase">{DAY_LABELS[i]}</div>
                      <div className="font-display font-bold text-[15px] tnum" style={isToday ? { color: "var(--primary-ink)" } : {}}>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Cuerpo: columna de horas + 6 pistas de día, cada una de alto fijo */}
              <div className="grid pt-2.5" style={{ gridTemplateColumns: `${GUT}px repeat(6,1fr)` }}>
                {/* Columna de horas */}
                <div className="relative" style={{ height: trackH + PX / 2 }}>
                  {hours.map((h, i) => (
                    <div key={h} className="absolute right-2 text-[10.5px] text-muted tnum" style={{ top: i * PX, transform: "translateY(-50%)" }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* Pistas por día */}
                {days.map((d) => {
                  const k = toDateKey(d);
                  const isToday = k === toDateKey(new Date());
                  const list = weekAppts.filter((a) => toDateKey(new Date(a.start_at)) === k);
                  return (
                    <div
                      key={k}
                      className="relative border-l border-line overflow-hidden"
                      style={{ height: trackH + PX / 2, background: isToday ? "var(--primary-soft)" : undefined }}
                    >
                      {/* líneas de hora */}
                      {hours.map((h, i) => (
                        <div key={h} className="absolute left-0 right-0 border-t border-line" style={{ top: i * PX }} />
                      ))}
                      {/* bloques de turno */}
                      {list.map((a) => {
                        const { top, height } = blockGeom(a);
                        const col = STATUS_META[a.status].fg;
                        return (
                          <button
                            key={a.id}
                            onClick={() => openEdit(a)}
                            title={`${patientName(a)} · ${fmtTime(a.start_at)} — tocá para editar`}
                            className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden trans hover:brightness-[1.03]"
                            style={{ top, height, background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${col}` }}
                          >
                            <div className="text-[10.5px] font-bold tnum leading-tight" style={{ color: col }}>{fmtTime(a.start_at)}</div>
                            <div className="text-[11.5px] font-semibold truncate leading-tight">{patientName(a).split(" ")[0]}</div>
                            {height > 42 && <div className="text-[10px] text-muted truncate">{AREA_LABELS[a.area]}</div>}
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
                    <div key={a.id} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 flex-wrap">
                      <div className="w-14 text-center shrink-0">
                        <div className="font-display font-bold text-[15px] tnum leading-none">{fmtTime(a.start_at)}</div>
                      </div>
                      <div className="flex-1 min-w-[140px]">
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
                      <div className="flex items-center gap-2">
                        <WhatsappReminderButton appt={a} template={reminderTemplate} />
                        <button
                          onClick={() => openEdit(a)}
                          className="text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border border-line trans hover:bg-surface-2"
                          style={{ color: "var(--primary-ink)" }}
                        >
                          Editar
                        </button>
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
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <p className="text-[11.5px] text-muted leading-snug">
        Tocá un turno de la vista semanal para <b>editar</b> día y horario. Al marcarlo como <b>Atendido</b>, si tiene bono asociado se descuenta 1 sesión automáticamente. El botón de WhatsApp abre el chat con el mensaje de recordatorio ya redactado.
      </p>
    </div>
  );
}
