"use client";

import { useState, useTransition } from "react";
import { getSlots, requestAppointment } from "@/server/actions/portal";
import { fmtTime, fmtDayChip } from "@/lib/utils/agenda";
import type { Slot, PortalAppointment } from "@/types/portal";

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";

// Estado del turno visto por el paciente.
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pendiente de confirmación", bg: "var(--amber-soft)", fg: "var(--amber)" },
  confirmed: { label: "Confirmado", bg: "var(--emerald-soft)", fg: "var(--emerald-ink)" },
  attended: { label: "Atendido", bg: "var(--primary-soft)", fg: "var(--primary-ink)" },
  no_show: { label: "Ausente", bg: "var(--coral-soft)", fg: "var(--coral-ink)" },
};

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PortalBooking({
  token,
  appointments,
  defaultArea,
}: {
  token: string;
  appointments: PortalAppointment[];
  defaultArea: string;
}) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState(tomorrowKey());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const loadSlots = () =>
    start(async () => {
      setError(null);
      setConfirmed(null);
      setSlots(null);
      const res = await getSlots(token, date);
      if (res.error) { setError(res.error); return; }
      setSlots(res.slots ?? []);
    });

  const book = (time: string) =>
    start(async () => {
      setError(null);
      const res = await requestAppointment(token, date, time, defaultArea);
      if (res.error) { setError(res.error); return; }
      setConfirmed(time);
      const r = await getSlots(token, date);
      if (!r.error) setSlots(r.slots ?? []);
    });

  const free = (slots ?? []).filter((s) => s.free);

  return (
    <div className="flex flex-col gap-4">
      {/* --- Mis turnos --- */}
      <div className={card}>
        <h2 className="font-display font-bold text-[15px] mb-3">Mis turnos</h2>
        {appointments.length === 0 ? (
          <p className="text-[13px] text-muted">Todavía no tenés turnos. Pedí uno abajo 👇</p>
        ) : (
          <div className="flex flex-col gap-2">
            {appointments.map((a) => {
              const st = STATUS[a.status] ?? { label: a.status, bg: "var(--surface-2)", fg: "var(--muted)" };
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl2 border border-line px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
                  <div className="text-center shrink-0 w-14">
                    <div className="text-[11px] font-semibold text-muted uppercase">{fmtDayChip(new Date(a.start_at))}</div>
                    <div className="font-display font-bold text-[15px] tnum leading-none">{fmtTime(a.start_at)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {a.reason && <div className="text-[13px] font-medium truncate">{a.reason}</div>}
                    <span className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5 mt-0.5" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Pedir un turno --- */}
      <div className={card}>
        <h2 className="font-display font-bold text-[15px] mb-1">Pedir un turno</h2>
        <p className="text-[12.5px] text-muted mb-4">Elegí un día y horario. Tu turno queda <b>pendiente</b> hasta que tu kinesiólogo/a lo confirme.</p>

        <div className="flex items-end gap-2.5 mb-4">
          <label className="block flex-1">
            <span className="block text-[12.5px] font-semibold mb-1.5">Día</span>
            <input
              type="date"
              value={date}
              min={tomorrowKey()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm outline-none focus:border-primary trans"
            />
          </label>
          <button
            onClick={loadSlots}
            disabled={pending}
            className="rounded-xl2 px-4 py-2.5 text-sm font-semibold text-white trans disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {pending ? "Buscando…" : "Ver horarios"}
          </button>
        </div>

        {confirmed && (
          <div className="rounded-xl2 px-3 py-2.5 text-[13px] font-medium mb-3" style={{ background: "var(--emerald-soft)", color: "var(--emerald-ink)" }}>
            ✓ ¡Listo! Solicitaste el turno de las <b>{confirmed} hs</b>. Va a aparecer arriba como pendiente.
          </div>
        )}
        {error && (
          <div className="rounded-xl2 px-3 py-2.5 text-[13px] font-medium mb-3" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            {error}
          </div>
        )}

        {slots !== null && (
          free.length === 0 ? (
            <p className="text-[13px] text-muted text-center py-4">No hay horarios disponibles ese día. Probá con otra fecha.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {free.map((s) => (
                <button
                  key={s.time}
                  onClick={() => book(s.time)}
                  disabled={pending}
                  className="rounded-xl2 border border-line py-2.5 text-[13px] font-semibold tnum trans hover:border-primary disabled:opacity-50"
                  style={{ background: "var(--surface-2)" }}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
