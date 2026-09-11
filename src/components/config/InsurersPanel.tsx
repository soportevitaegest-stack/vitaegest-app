"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInsurer, deleteInsurer } from "@/server/actions/config";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

export type Insurer = {
  id: string;
  name: string;
  plan: string | null;
  region: string | null;
  default_copay: number;
  default_stamp: number;
};

type Editing = { id?: string; name: string; plan: string; region: string; default_copay: number; default_stamp: number };
const EMPTY: Editing = { name: "", plan: "", region: "", default_copay: 0, default_stamp: 0 };

export function InsurersPanel({ insurers }: { insurers: Insurer[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Editing | null>(null);

  const onSave = () =>
    editing &&
    start(async () => {
      const res = await saveInsurer(editing);
      if (res?.error) { alert("No se pudo guardar: " + res.error); return; }
      setEditing(null);
      router.refresh();
    });

  const onDelete = (id: string) =>
    start(async () => {
      const res = await deleteInsurer(id);
      if (res?.error) { alert("No se pudo eliminar: " + res.error); return; }
      router.refresh();
    });

  const set = (k: keyof Editing, v: string | number) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line flex-wrap">
        <div>
          <h3 className="font-display font-bold text-[15px]">Obras sociales</h3>
          <p className="text-[12.5px] text-muted">{insurers.length} cargadas · con su coseguro y estampilla</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans" style={{ background: "var(--teal)" }}>
          + Agregar
        </button>
      </div>

      {editing && (
        <div className="px-5 py-4 border-b border-line" style={{ background: "var(--surface-2)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="block col-span-2 sm:col-span-1"><span className={lbl}>Nombre</span><input className={input} value={editing.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: OSDE" /></label>
            <label className="block"><span className={lbl}>Plan</span><input className={input} value={editing.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Ej: 210" /></label>
            <label className="block"><span className={lbl}>Región</span><input className={input} value={editing.region} onChange={(e) => set("region", e.target.value)} placeholder="Ej: CABA" /></label>
            <label className="block"><span className={lbl}>Coseguro</span><input type="number" className={input} value={editing.default_copay} onChange={(e) => set("default_copay", Number(e.target.value))} /></label>
            <label className="block"><span className={lbl}>Estampilla</span><input type="number" className={input} value={editing.default_stamp} onChange={(e) => set("default_stamp", Number(e.target.value))} /></label>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setEditing(null)} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line" style={{ background: "var(--surface)", color: "var(--ink)" }}>Cancelar</button>
            <button onClick={onSave} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>{pending ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 560 }}>
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted" style={{ background: "var(--surface-2)" }}>
              <th className="font-semibold px-5 py-2.5">Obra social</th>
              <th className="font-semibold px-3 py-2.5">Plan</th>
              <th className="font-semibold px-3 py-2.5">Región</th>
              <th className="font-semibold px-3 py-2.5 text-right">Coseguro</th>
              <th className="font-semibold px-3 py-2.5 text-right">Estampilla</th>
              <th className="font-semibold px-5 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {insurers.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-[13px] text-muted">Sin obras sociales cargadas.</td></tr>
            )}
            {insurers.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-5 py-3 font-medium">{o.name}</td>
                <td className="px-3 py-3 text-muted">{o.plan || "—"}</td>
                <td className="px-3 py-3 text-muted">{o.region || "—"}</td>
                <td className="px-3 py-3 text-right tnum">{money(o.default_copay)}</td>
                <td className="px-3 py-3 text-right tnum">{money(o.default_stamp)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setEditing({ id: o.id, name: o.name, plan: o.plan ?? "", region: o.region ?? "", default_copay: o.default_copay, default_stamp: o.default_stamp })} className="text-[12px] font-semibold" style={{ color: "var(--primary-ink)" }}>Editar</button>
                    <button onClick={() => onDelete(o.id)} className="text-[12px] font-semibold" style={{ color: "var(--rose)" }}>Eliminar</button>
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
