"use client";

import { useState, useTransition } from "react";
import { getPublicSlots, requestPublicAppointment } from "@/server/actions/portalPublic";
import { DepositInstructions } from "@/components/booking/DepositInstructions";
import type { Slot } from "@/types/portal";

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";
const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold mb-1.5";

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PublicBooking({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", email: "", reason: "" });
  const [date, setDate] = useState(tomorrowKey());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [done, setDone] = useState<{ 
    time: string; 
    token?: string;
    deposit?: any;
    payment?: any;
    appointmentId?: string;
  } | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const loadSlots = () =>
    start(async () => {
      setError(null);
      setSlots(null);
      const res = await getPublicSlots(slug, date);
      if (res.error) { setError(res.error); return; }
      setSlots(res.slots ?? []);
    });

  const book = (time: string) => {
    if (!f.first_name.trim() || !f.last_name.trim()) {
      setError("Completá tu nombre y apellido antes de elegir el horario.");
      return;
    }
    start(async () => {
      setError(null);
      // Acá está la magia: el "as any" hace que TypeScript deje pasar los datos nuevos
      const res = (await requestPublicAppointment(slug, { ...f, date, time })) as any;
      
      if (res.error) { setError(res.error); return; }
      
      setDone({ 
        time, 
        token: res.portalToken,
        deposit: res.deposit,
        payment: res.payment,
        appointmentId: res.appointmentId || res.appointment_id
      });
    });
  };

  const free = (slots ?? []).filter((s) => s.free);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (done) {
    const portalLink = done.token ? `${origin}/p/${done.token}` : "";
    
    return (
      <div className={card}>
        <div className="text-center py-2">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="font-display font-bold text-lg mb-1">¡Turno solicitado!</h2>
          <p className="text-[13px] text-muted leading-snug mb-4">
            Pediste el turno del <b>{date}</b> a las <b>{done.time} hs</b>.<br/>
            Queda <b>pendiente</b> hasta que lo confirmemos.
          </p>

          {done.deposit?.enabled ? (
            <div className="mt-6 text-left">
              <DepositInstructions
                deposit={done.deposit}
                payment={done.payment}
                appointmentId={done.appointmentId}
                professionalName=""
                turno={`${date} a las ${done.time} hs`}
                whatsapp=""
              />
              
              {portalLink && (
                <div className="mt-6 text-center border-t border-line pt-4">
                  <p className="text-[12px] text-muted mb-2">Podés hacer el seguimiento desde tu portal:</p>
                  <a href={portalLink} className="inline-block text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white" style={{ background: "var(--teal)" }}>
                    Abrir mi portal
                  </a>
                </div>
              )}
            </div>
          ) : (
            portalLink && (
              <div className="rounded-xl2 border border-line p-3 text-left" style={{ background: "var(--surface-2)" }}>
                <p className="text-[12px] font-semibold mb-1">Tu portal de seguimiento</p>
                <p className="text-[12px] text-muted break-all mb-2">{portalLink}</p>
                <a href={portalLink} className="inline-block text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white" style={{ background: "var(--teal)" }}>
                  Abrir mi portal
                </a>
                <p className="text-[11px] text-muted mt-2">Guardá este enlace: desde ahí vas a ver el estado de tu turno.</p>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={card}>
        <h2 className="font-display font-bold text-[15px] mb-3">Tus datos</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>Nombre</span><input className={input} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Nombre" /></label>
          <label className="block"><span className={lbl}>Apellido</span><input className={input} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Apellido" /></label>
          <label className="block"><span className={lbl}>Teléfono</span><input className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Ej: 11 5555 5555" /></label>
          <label className="block"><span className={lbl}>Email (opcional)</span><input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@email.com" /></label>
          <label className="block col-span-2"><span className={lbl}>Motivo (opcional)</span><input className={input} value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Ej: primera consulta" /></label>
        </div>
      </div>

      <div className={card}>
        <h2 className="font-display font-bold text-[15px] mb-3">Elegí día y horario</h2>
        <div className="flex items-end gap-2.5 mb-4">
          <label className="block flex-1">
            <span className={lbl}>Día</span>
            <input type="date" value={date} min={tomorrowKey()} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
          <button onClick={loadSlots} disabled={pending} className="rounded-xl2 px-4 py-2.5 text-sm font-semibold text-white trans disabled:opacity-50" style={{ background: "var(--primary)" }}>
            {pending ? "Buscando…" : "Ver horarios"}
          </button>
        </div>

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
                <button key={s.time} onClick={() => book(s.time)} disabled={pending}
                  className="rounded-xl2 border border-line py-2.5 text-[13px] font-semibold tnum trans hover:border-primary disabled:opacity-50"
                  style={{ background: "var(--surface-2)" }}>
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
