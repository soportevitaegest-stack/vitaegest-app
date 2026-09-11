"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PatientLite, InsurerLite, ServiceLite } from "@/types/agenda";
import { AREA_OPTIONS } from "@/lib/utils/agenda";
import { createAppointment } from "@/server/actions/appointments";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

// Nombre del día de la semana (en ART) para el texto de recurrencia.
function weekdayName(date: string): string {
  try {
    const d = new Date(`${date}T12:00:00`);
    return (
      new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(d) + "s"
    );
  } catch {
    return "días";
  }
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative w-10 h-6 rounded-full trans shrink-0"
      style={{ background: on ? "var(--teal)" : "var(--border)" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow trans"
        style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

export function NuevoTurnoForm({
  patients,
  insurers,
  services,
  defaultDate,
  onDone,
}: {
  patients: PatientLite[];
  insurers: InsurerLite[];
  services: ServiceLite[];
  defaultDate: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Paciente
  const [patientMode, setPatientMode] = useState<"existing" | "new">(patients.length ? "existing" : "new");
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [np, setNp] = useState({ first_name: "", last_name: "", phone: "" });

  // Turno
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("45");
  const [status, setStatus] = useState("confirmed");
  const [serviceId, setServiceId] = useState("");
  const [area, setArea] = useState<string>("pelvic_perineal");

  // Cobertura + sesiones
  const [coverage, setCoverage] = useState<"particular" | "obra_social">("particular");
  const [insurerId, setInsurerId] = useState(insurers[0]?.id ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [sessions, setSessions] = useState("1");
  const [recurrent, setRecurrent] = useState(false);
  const [genPayment, setGenPayment] = useState(true);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const price = service?.price ?? 0;
  const isOS = coverage === "obra_social";
  const nSessions = Math.max(1, parseInt(sessions || "1", 10) || 1);

  const submit = () =>
    startT(async () => {
      setError(null);
      const res = await createAppointment({
        patientId: patientMode === "existing" ? patientId : "",
        newPatient: patientMode === "new" ? np : null,
        date,
        time,
        duration: Number(duration) || 45,
        area,
        status,
        serviceId: serviceId || null,
        coverageType: coverage,
        insurerId: isOS ? insurerId || null : null,
        orderNumber: isOS ? orderNumber : null,
        sessions: nSessions,
        recurrent,
        generatePayment: !isOS && genPayment,
        amount: isOS ? 0 : price,
        reason: null,
      });
      if (res?.error) { setError(res.error); return; }
      onDone();
      router.refresh();
    });

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-4">
      <h3 className="font-display font-bold text-[15px]">Nuevo turno</h3>

      {/* ---- Paciente ---- */}
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-ink">Paciente</span>
          <button
            type="button"
            onClick={() => setPatientMode((m) => (m === "existing" ? "new" : "existing"))}
            className="text-[12px] font-semibold"
            style={{ color: "var(--primary-ink)" }}
          >
            {patientMode === "existing" ? "＋ Crear nuevo paciente" : "← Elegir existente"}
          </button>
        </div>

        {patientMode === "existing" ? (
          <select className={input} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.length === 0 && <option value="">— No hay pacientes —</option>}
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3 rounded-xl2 border border-line p-3" style={{ background: "var(--surface-2)" }}>
            <label className="block"><span className={lbl}>Nombre</span><input className={input} value={np.first_name} onChange={(e) => setNp({ ...np, first_name: e.target.value })} placeholder="Nombre" /></label>
            <label className="block"><span className={lbl}>Apellido</span><input className={input} value={np.last_name} onChange={(e) => setNp({ ...np, last_name: e.target.value })} placeholder="Apellido" /></label>
            <label className="block col-span-2"><span className={lbl}>Teléfono (opcional)</span><input className={input} value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} placeholder="Ej: 11 5555 5555" /></label>
            <p className="col-span-2 text-[11.5px] text-muted">Se crea el paciente y se agenda el turno en un solo paso.</p>
          </div>
        )}
      </div>

      {/* ---- Prestación / tratamiento ---- */}
      <label className="block">
        <span className={lbl}>Tratamiento / prestación (define área{isOS ? "" : " y valor"})</span>
        <select
          className={input}
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const s = services.find((x) => x.id === e.target.value);
            if (s) setArea(s.area);
          }}
        >
          <option value="">— Elegir del nomenclador —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{isOS ? "" : ` · ${money(s.price)}`}
            </option>
          ))}
        </select>
      </label>

      {/* ---- Fecha / hora / etc ---- */}
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
            <option value="confirmed">Confirmado</option><option value="pending">Pendiente</option>
          </select>
        </label>
        <label className="block col-span-2">
          <span className={lbl}>Área</span>
          <select className={input} value={area} onChange={(e) => setArea(e.target.value)}>
            {AREA_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
      </div>

      {/* ---- Cobertura ---- */}
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

        <div className="grid grid-cols-2 gap-3.5 items-end">
          <label className="block">
            <span className={lbl}>Cantidad de sesiones indicadas</span>
            <input type="number" min={1} max={60} className={input} value={sessions} onChange={(e) => setSessions(e.target.value)} />
          </label>
          <div className="flex items-center gap-3 rounded-xl2 border border-line p-2.5 h-[46px]" style={{ background: "var(--surface)" }}>
            <Toggle on={recurrent} onChange={setRecurrent} />
            <span className="text-[12.5px] font-semibold leading-tight">
              Turno recurrente
              <span className="block text-[11px] font-normal text-muted">semanal, mismo día y hora</span>
            </span>
          </div>
        </div>

        {nSessions > 1 && (
          <p className="text-[11.5px] leading-snug" style={{ color: "var(--primary-ink)" }}>
            {recurrent
              ? `Se agendarán ${nSessions} turnos, uno por semana (${nSessions} ${weekdayName(date)} a las ${time} hs).`
              : `Se registra una orden de ${nSessions} sesiones. Podés agendar el resto más adelante; se descuentan al marcar cada turno como atendido.`}
          </p>
        )}
      </div>

      {/* ---- Valor particular (oculto en OS) ---- */}
      {!isOS ? (
        <div className="rounded-xl2 border p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: "var(--primary-soft)", borderColor: "transparent", color: "var(--primary-ink)" }}>
          <span className="text-[13px]">Valor de la sesión: <b className="tnum">{money(price)}</b></span>
          <label className="flex items-center gap-2 text-[12.5px] font-semibold cursor-pointer">
            <input type="checkbox" checked={genPayment} onChange={(e) => setGenPayment(e.target.checked)} className="w-4 h-4" />
            Generar cobro pendiente {recurrent && nSessions > 1 ? "(por sesión)" : ""}
          </label>
        </div>
      ) : (
        <p className="text-[11.5px] text-muted -mt-1">El valor lo define la obra social, por eso no se muestra el importe particular ni se genera un cobro.</p>
      )}

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
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-4 py-2.5 text-sm text-white trans disabled:opacity-50"
          style={{ background: "var(--teal)" }}
        >
          {pending ? "Guardando…" : recurrent && nSessions > 1 ? `Agendar ${nSessions} turnos` : "Agendar turno"}
        </button>
      </div>
    </div>
  );
}
