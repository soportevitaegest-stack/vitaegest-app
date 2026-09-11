"use client";

import { useState, useTransition } from "react";
import { getSlots, requestAppointment } from "@/server/actions/portal";
import type { Slot } from "@/types/portal";

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";

// yyyy-mm-dd de mañana (en la zona del navegador; el server valida en ART).
function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PortalBooking({ token, defaultArea }: { token: string; defaultArea: string }) {
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
      // Refrescar disponibilidad para que el horario tomado desaparezca.
      const r = await getSlots(token, date);
      if (!r.error) setSlots(r.slots ?? []);
    });

  const free = (slots ?? []).filter((s) => s.free);

  return (
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
          ✓ ¡Listo! Solicitaste el turno de las <b>{confirmed} hs</b>. Queda pendiente de confirmación.
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
  );
}
