"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/server/actions/config";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

type Mode = "uro" | "dermo" | "both";

function modeFrom(specialties: string[]): Mode {
  const uro = specialties.includes("pelvic_perineal");
  const dermo = specialties.includes("dermatofunctional");
  if (uro && dermo) return "both";
  if (dermo) return "dermo";
  return "uro";
}
const specialtiesFrom = (m: Mode): string[] =>
  m === "both" ? ["pelvic_perineal", "dermatofunctional"] : m === "dermo" ? ["dermatofunctional"] : ["pelvic_perineal"];

export function PerfilForm({
  fullName,
  license,
  clinic,
  specialties,
}: {
  fullName: string;
  license: string;
  clinic: string;
  specialties: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({ full_name: fullName, license_number: license, clinic_name: clinic });
  const [mode, setMode] = useState<Mode>(modeFrom(specialties));
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const onSave = () =>
    start(async () => {
      const res = await saveProfile({ ...f, specialties: specialtiesFrom(mode) });
      if (res?.error) { alert("No se pudo guardar: " + res.error); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
        <h3 className="font-display font-bold text-[15px] mb-3">Perfil profesional</h3>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <label className="block"><span className={lbl}>Nombre</span><input className={input} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></label>
          <label className="block"><span className={lbl}>Matrícula</span><input className={input} value={f.license_number} onChange={(e) => set("license_number", e.target.value)} placeholder="M.N. …" /></label>
          <label className="block sm:col-span-2"><span className={lbl}>Consultorio</span><input className={input} value={f.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} /></label>
        </div>

        <div className="mt-4">
          <span className={lbl}>Perfil / especialidad</span>
          <div className="flex flex-wrap gap-1.5">
            {([["uro", "Uroginecología"], ["dermo", "Dermatofuncional"], ["both", "Ambas"]] as const).map(([k, l]) => {
              const on = mode === k;
              return (
                <button key={k} type="button" onClick={() => setMode(k)} className="text-[12.5px] font-semibold px-3.5 py-2 rounded-xl2 trans"
                  style={on ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                  {l}
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-muted mt-1.5">Define qué módulos clínicos se muestran (suelo pélvico / dermatofuncional). "Ambas" habilita las dos solapas.</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5">
        {saved && <span className="text-[12px] font-semibold" style={{ color: "var(--teal-ink)" }}>Guardado ✓</span>}
        <button onClick={onSave} disabled={pending} className="inline-flex items-center gap-1.5 font-semibold rounded-xl2 px-5 py-2.5 text-sm text-white trans disabled:opacity-50" style={{ background: "var(--teal)" }}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
