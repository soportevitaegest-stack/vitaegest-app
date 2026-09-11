"use client";

import type { Field } from "@/lib/clinical/schemas";

const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";

type Values = Record<string, string | string[] | undefined>;

// Renderiza un formulario a partir de un schema (Field[]). Controlado desde el
// padre: los valores viven en `values`, cada cambio dispara onField(k, v).
export function SchemaForm({
  schema,
  values,
  onField,
}: {
  schema: Field[];
  values: Values;
  onField: (k: string, v: string | string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {schema.map((f, i) => {
        if (f.t === "head") {
          return (
            <div key={i} className="col-span-2 mt-2 first:mt-0">
              <h4 className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: "var(--primary-ink)" }}>{f.l}</h4>
              <div className="h-px mt-1.5" style={{ background: "var(--border)" }} />
            </div>
          );
        }
        const key = f.k as string;
        const v = values[key];
        const full = f.w === "full" || f.t === "textarea" || f.t === "chips" || f.t === "scale";

        let ctrl: React.ReactNode = null;
        if (f.t === "text" || f.t === "number") {
          ctrl = (
            <input
              type={f.t}
              className={input}
              value={(v as string) ?? ""}
              placeholder={f.ph ?? ""}
              onChange={(e) => onField(key, e.target.value)}
            />
          );
        } else if (f.t === "textarea") {
          ctrl = (
            <textarea
              className={input + " min-h-[58px] resize-none"}
              value={(v as string) ?? ""}
              placeholder={f.ph ?? ""}
              onChange={(e) => onField(key, e.target.value)}
            />
          );
        } else if (f.t === "select") {
          ctrl = (
            <select className={input} value={(v as string) ?? ""} onChange={(e) => onField(key, e.target.value)}>
              <option value="">—</option>
              {(f.o ?? []).map((o) => (
                <option key={String(o)} value={String(o)}>{o}</option>
              ))}
            </select>
          );
        } else if (f.t === "chips") {
          const arr = Array.isArray(v) ? v : [];
          ctrl = (
            <div className="flex flex-wrap gap-1.5">
              {(f.o ?? []).map((o) => {
                const label = String(o);
                const on = arr.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onField(key, on ? arr.filter((x) => x !== label) : [...arr, label])}
                    className="text-[12px] font-medium px-2.5 py-1 rounded-full trans"
                    style={on ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          );
        } else if (f.t === "scale") {
          const min = f.min ?? 0;
          const max = f.max ?? 10;
          ctrl = (
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: max - min + 1 }, (_, x) => min + x).map((num) => {
                const on = String(num) === String(v ?? "");
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onField(key, String(num))}
                    className="w-9 h-9 rounded-lg text-[13px] font-bold trans"
                    style={on ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          );
        }

        return (
          <label key={i} className={"block " + (full ? "col-span-2" : "")}>
            <span className="block text-[12px] font-semibold mb-1.5">{f.l}</span>
            {ctrl}
          </label>
        );
      })}
    </div>
  );
}
