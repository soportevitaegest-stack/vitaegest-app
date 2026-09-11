"use client";

import { useState, useTransition } from "react";
import { addDiaryEntry, type DiaryInput } from "@/server/actions/portal";

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";
const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold mb-1.5";

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const LEAK = [
  ["N", "Sin escape"],
  ["E", "Por esfuerzo"],
  ["U", "Por urgencia"],
] as const;

export function PortalDiary({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [time, setTime] = useState(nowHM());
  const [urine, setUrine] = useState("");
  const [urgency, setUrgency] = useState("1");
  const [leak, setLeak] = useState<string>("N");
  const [liquidType, setLiquidType] = useState("");
  const [liquidMl, setLiquidMl] = useState("");

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = () =>
    start(async () => {
      setError(null);
      setOk(false);
      const payload: DiaryInput = {
        time,
        urine_ml: num(urine),
        urgency: Number(urgency),
        leak,
        liquid_type: liquidType.trim() || null,
        liquid_ml: num(liquidMl),
        bristol: null,
      };
      const res = await addDiaryEntry(token, payload);
      if (res.error) { setError(res.error); return; }
      setOk(true);
      // Reset para el próximo registro.
      setUrine(""); setLiquidType(""); setLiquidMl(""); setUrgency("1"); setLeak("N"); setTime(nowHM());
    });

  return (
    <div className={card}>
      <h2 className="font-display font-bold text-[15px] mb-1">Diario miccional</h2>
      <p className="text-[12.5px] text-muted mb-4">Registrá cada micción o ingesta de líquido. Tu kinesiólogo/a lo ve en su panel.</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={lbl}>Hora</span>
          <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Orina (ml)</span>
          <input type="number" inputMode="numeric" className={input} value={urine} onChange={(e) => setUrine(e.target.value)} placeholder="Ej: 250" />
        </label>

        <label className="block col-span-2">
          <span className={lbl}>Urgencia</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" onClick={() => setUrgency(String(n))}
                className="flex-1 rounded-xl2 border py-2 text-[13px] font-semibold trans"
                style={urgency === String(n) ? { background: "var(--primary-soft)", color: "var(--primary-ink)", borderColor: "var(--primary)" } : { background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {n}
              </button>
            ))}
          </div>
        </label>

        <div className="block col-span-2">
          <span className={lbl}>Escape</span>
          <div className="grid grid-cols-3 gap-1.5">
            {LEAK.map(([v, label]) => (
              <button key={v} type="button" onClick={() => setLeak(v)}
                className="rounded-xl2 border py-2 text-[12.5px] font-semibold trans"
                style={leak === v ? { background: "var(--primary-soft)", color: "var(--primary-ink)", borderColor: "var(--primary)" } : { background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={lbl}>Líquido</span>
          <input className={input} value={liquidType} onChange={(e) => setLiquidType(e.target.value)} placeholder="Agua, mate…" />
        </label>
        <label className="block">
          <span className={lbl}>Cantidad (ml)</span>
          <input type="number" inputMode="numeric" className={input} value={liquidMl} onChange={(e) => setLiquidMl(e.target.value)} placeholder="Ej: 200" />
        </label>
      </div>

      {ok && (
        <div className="rounded-xl2 px-3 py-2.5 text-[13px] font-medium mt-3" style={{ background: "var(--emerald-soft)", color: "var(--emerald-ink)" }}>
          ✓ Registro guardado. Podés cargar el siguiente.
        </div>
      )}
      {error && (
        <div className="rounded-xl2 px-3 py-2.5 text-[13px] font-medium mt-3" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
          {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={pending}
        className="w-full mt-4 rounded-xl2 py-3 text-sm font-semibold text-white trans disabled:opacity-50"
        style={{ background: "var(--teal)" }}
      >
        {pending ? "Guardando…" : "Guardar registro"}
      </button>
    </div>
  );
}
