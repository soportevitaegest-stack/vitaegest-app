"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveService, deleteService } from "@/server/actions/config";
import { AREA_OPTIONS, AREA_LABELS } from "@/lib/utils/agenda";
import type { SpecialtyArea } from "@/types/agenda";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

export type Service = { id: string; name: string; area: SpecialtyArea; price: number; duration_min: number };

type Editing = { id?: string; name: string; area: string; price: number; duration_min: number };
const EMPTY: Editing = { name: "", area: "pelvic_perineal", price: 0, duration_min: 45 };

export function ServicesPanel({ services }: { services: Service[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Editing | null>(null);

  const onSave = () =>
    editing &&
    start(async () => {
      const res = await saveService(editing);
      if (res?.error) { alert("No se pudo guardar: " + res.error); return; }
      setEditing(null);
      router.refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      const res = await deleteService(id);
      if (res?.error) { alert("No se pudo eliminar: " + res.error); return; }
      router.refresh();
    });

  const set = (k: keyof Editing, v: string | number) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line flex-wrap">
        <div>
          <h3 className="font-display font-bold text-[15px]">Prestaciones particulares</h3>
          <p className="text-[12.5px] text-muted">Nombre del tratamiento y valor de la sesión</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans" style={{ background: "var(--teal)" }}>
          + Agregar
        </button>
      </div>

      {editing && (
        <div className="px-5 py-4 border-b border-line" style={{ background: "var(--surface-2)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block col-span-2"><span className={lbl}>Tratamiento</span><input className={input} value={editing.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Drenaje linfático" /></label>
            <label className="block"><span className={lbl}>Área</span>
              <select className={input} value={editing.area} onChange={(e) => set("area", e.target.value)}>
                {AREA_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </label>
            <label className="block"><span className={lbl}>Valor ($)</span><input type="number" className={input} value={editing.price} onChange={(e) => set("price", Number(e.target.value))} /></label>
            <label className="block"><span className={lbl}>Duración (min)</span><input type="number" className={input} value={editing.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} /></label>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setEditing(null)} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line" style={{ background: "var(--surface)", color: "var(--ink)" }}>Cancelar</button>
            <button onClick={onSave} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>{pending ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 520 }}>
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted" style={{ background: "var(--surface-2)" }}>
              <th className="font-semibold px-5 py-2.5">Tratamiento</th>
              <th className="font-semibold px-3 py-2.5">Área</th>
              <th className="font-semibold px-3 py-2.5 text-right">Valor</th>
              <th className="font-semibold px-5 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-[13px] text-muted">Sin prestaciones cargadas.</td></tr>
            )}
            {services.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-3 py-3 text-muted">{AREA_LABELS[s.area] ?? s.area}</td>
                <td className="px-3 py-3 text-right font-display font-bold tnum">{money(s.price)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setEditing({ id: s.id, name: s.name, area: s.area, price: s.price, duration_min: s.duration_min })} className="text-[12px] font-semibold" style={{ color: "var(--primary-ink)" }}>Editar</button>
                    <button onClick={() => onDelete(s.id)} className="text-[12px] font-semibold" style={{ color: "var(--rose)" }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
