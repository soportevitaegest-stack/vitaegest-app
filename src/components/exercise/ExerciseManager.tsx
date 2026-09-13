"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AREA_OPTIONS } from "@/lib/utils/agenda";
import { savePatientPlan, saveAsTemplate, type PlanItemInput } from "@/server/actions/exercisePlans";

export type ItemRow = { name: string; detail: string };
export type Template = {
  id: string;
  name: string;
  area: string;
  description: string | null;
  items: { name: string; detail?: string }[];
};

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

export function ExerciseManager({
  patientId,
  initialTitle,
  initialArea,
  initialItems,
  templates,
}: {
  patientId: string;
  initialTitle: string;
  initialArea: string;
  initialItems: ItemRow[];
  templates: Template[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [area, setArea] = useState(initialArea);
  const [items, setItems] = useState<ItemRow[]>(initialItems.length ? initialItems : [{ name: "", detail: "" }]);
  const [templateId, setTemplateId] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tplSaved, setTplSaved] = useState(false);

  const loadTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const hasContent = items.some((i) => i.name.trim());
    if (hasContent && !confirm("Esto reemplaza las pautas actuales por las de la plantilla. ¿Continuar?")) {
      setTemplateId("");
      return;
    }
    if (!title.trim()) setTitle(t.name);
    setArea(t.area);
    setItems(t.items.map((i) => ({ name: i.name, detail: i.detail ?? "" })));
  };

  const setItem = (idx: number, k: keyof ItemRow, v: string) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((arr) => [...arr, { name: "", detail: "" }]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) =>
    setItems((arr) => {
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });

  const save = () =>
    start(async () => {
      setError(null);
      setOk(false);
      const payload: PlanItemInput[] = items.map((i) => ({ name: i.name, detail: i.detail }));
      const res = await savePatientPlan(patientId, { title, area, items: payload });
      if (res.error) { setError(res.error); return; }
      setOk(true);
      router.refresh();
      setTimeout(() => setOk(false), 2500);
    });

  const saveTpl = () =>
    start(async () => {
      setError(null);
      setTplSaved(false);
      const name = prompt("Nombre para la plantilla:", title || "Mi plantilla");
      if (!name) return;
      const res = await saveAsTemplate({ name, area, description: "", items: items.map((i) => ({ name: i.name, detail: i.detail })) });
      if (res.error) { setError(res.error); return; }
      setTplSaved(true);
      router.refresh();
      setTimeout(() => setTplSaved(false), 2500);
    });

  const validCount = items.filter((i) => i.name.trim()).length;

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-display font-bold text-[15px]">Gestor de ejercicios / pautas</h3>
          <p className="text-[12.5px] text-muted">Lo que guardes acá se actualiza al instante en el portal del paciente.</p>
        </div>
      </div>

      {/* Plantilla + datos del plan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <label className="block">
          <span className={lbl}>Cargar plantilla</span>
          <select className={input} value={templateId} onChange={(e) => loadTemplate(e.target.value)}>
            <option value="">— Elegir plantilla —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Título del plan</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Pautas domiciliarias" />
        </label>
        <label className="block">
          <span className={lbl}>Área</span>
          <select className={input} value={area} onChange={(e) => setArea(e.target.value)}>
            {AREA_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
      </div>

      {/* Editor de pautas */}
      <div className="flex flex-col gap-2.5">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-xl2 border border-line p-3" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-start gap-2">
              <span className="mt-2 text-[12px] font-bold text-muted tnum w-5 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0 grid gap-2">
                <input
                  className={input}
                  value={it.name}
                  onChange={(e) => setItem(idx, "name", e.target.value)}
                  placeholder="Nombre de la pauta (ej: Bombeo de tobillos)"
                />
                <textarea
                  className={input + " resize-y leading-snug"}
                  rows={2}
                  value={it.detail}
                  onChange={(e) => setItem(idx, "detail", e.target.value)}
                  placeholder="Indicación / detalle (series, tiempo, frecuencia…)"
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-7 h-7 rounded-lg border border-line text-muted disabled:opacity-30 trans hover:bg-surface" title="Subir">↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="w-7 h-7 rounded-lg border border-line text-muted disabled:opacity-30 trans hover:bg-surface" title="Bajar">↓</button>
                <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg border trans" style={{ borderColor: "var(--rose)", color: "var(--rose)" }} title="Quitar">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="mt-3 text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line trans hover:bg-surface-2" style={{ color: "var(--primary-ink)" }}>
        + Agregar pauta
      </button>

      {error && (
        <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium mt-3" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>{error}</div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-4 border-t border-line">
        <div className="flex items-center gap-3">
          {ok && <span className="text-[12.5px] font-semibold" style={{ color: "var(--emerald-ink)" }}>✓ Guardado en el portal</span>}
          {tplSaved && <span className="text-[12.5px] font-semibold" style={{ color: "var(--primary-ink)" }}>✓ Plantilla guardada</span>}
          <span className="text-[12px] text-muted">{validCount} pauta{validCount === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveTpl} disabled={pending || validCount === 0} className="text-[12.5px] font-semibold rounded-xl2 px-3.5 py-2 border border-line trans disabled:opacity-50" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            Guardar como plantilla
          </button>
          <button onClick={save} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-4 py-2 text-white trans disabled:opacity-50" style={{ background: "var(--teal)" }}>
            {pending ? "Guardando…" : "Asignar al paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}
