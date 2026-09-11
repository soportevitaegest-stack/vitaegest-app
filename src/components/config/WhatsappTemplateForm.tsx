"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReminderTemplate } from "@/server/actions/config";
import { DEFAULT_REMINDER_TEMPLATE, fillTemplate, fmtReminderDate, fmtTime } from "@/lib/utils/agenda";

const VARS = ["paciente", "nombre", "fecha", "hora"] as const;

export function WhatsappTemplateForm({ initial }: { initial: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState(initial || DEFAULT_REMINDER_TEMPLATE);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vista previa con datos de ejemplo.
  const preview = fillTemplate(body, {
    paciente: "María",
    nombre: "María González",
    fecha: fmtReminderDate(new Date().toISOString()),
    hora: fmtTime(new Date().toISOString()),
  });

  const insertVar = (v: string) => setBody((b) => `${b}{${v}}`);

  const onSave = () =>
    start(async () => {
      setError(null);
      setOk(false);
      const res = await saveReminderTemplate(body);
      if (res?.error) { setError(res.error); return; }
      setOk(true);
      router.refresh();
      setTimeout(() => setOk(false), 2500);
    });

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0" style={{ background: "#25D366" }}>
          <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor" aria-hidden>
            <path d="M16.01 3.2C9.03 3.2 3.36 8.86 3.36 15.84c0 2.23.59 4.41 1.71 6.33L3.2 28.8l6.79-1.78a12.6 12.6 0 0 0 6.02 1.53h.01c6.98 0 12.65-5.67 12.65-12.65 0-3.38-1.32-6.56-3.71-8.95a12.56 12.56 0 0 0-8.94-3.75Zm5.77 15.23c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
          </svg>
        </span>
        <div>
          <h3 className="font-display font-bold text-[15px]">Plantilla de mensaje general (WhatsApp)</h3>
          <p className="text-[12.5px] text-muted">Se usa al enviar recordatorios manuales desde la agenda.</p>
        </div>
      </div>

      <div className="px-5 py-4 grid gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-muted font-semibold">Variables:</span>
          {VARS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="text-[11.5px] font-semibold rounded-full px-2.5 py-1 border border-line trans hover:bg-surface-2"
              style={{ background: "var(--surface-2)", color: "var(--primary-ink)" }}
            >
              {`{${v}}`}
            </button>
          ))}
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans resize-y leading-relaxed"
          placeholder="Hola {paciente}, te recordamos tu turno el {fecha} a las {hora} hs."
        />

        <div className="rounded-xl2 border border-line p-3" style={{ background: "var(--surface-2)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">Vista previa</div>
          <p className="text-[13px] text-ink leading-snug whitespace-pre-wrap">{preview}</p>
        </div>

        {error && (
          <div className="rounded-xl2 px-3 py-2 text-[12.5px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {ok && <span className="text-[12.5px] font-semibold" style={{ color: "var(--emerald-ink)" }}>✓ Guardado</span>}
          <button
            onClick={onSave}
            disabled={pending}
            className="text-[12.5px] font-semibold rounded-xl2 px-4 py-2 text-white trans disabled:opacity-50"
            style={{ background: "var(--teal)" }}
          >
            {pending ? "Guardando…" : "Guardar plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}
