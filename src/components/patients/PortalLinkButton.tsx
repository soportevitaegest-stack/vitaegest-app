"use client";

import { useState, useTransition } from "react";
import { ensurePortalToken } from "@/server/actions/portalLinks";
import { waLink } from "@/lib/utils/agenda";

// Ícono WhatsApp (glifo) heredando color.
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.01 3.2C9.03 3.2 3.36 8.86 3.36 15.84c0 2.23.59 4.41 1.71 6.33L3.2 28.8l6.79-1.78a12.6 12.6 0 0 0 6.02 1.53h.01c6.98 0 12.65-5.67 12.65-12.65 0-3.38-1.32-6.56-3.71-8.95a12.56 12.56 0 0 0-8.94-3.75Zm5.77 15.23c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function PortalLinkButton({
  patientId,
  patientName,
  phone,
  token: initialToken,
}: {
  patientId: string;
  patientName: string;
  phone: string | null;
  token: string | null;
}) {
  const [pending, start] = useTransition();
  const [token, setToken] = useState<string | null>(initialToken);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = token ? `${origin}/p/${token}` : "";
  const first = patientName.split(" ")[0] || "";
  const message = `¡Hola ${first}! 👋 Este es tu portal de seguimiento de VitaeGest. Desde acá podés pedir turnos, ver tus ejercicios y cargar tu diario: ${link}`;

  const generate = () =>
    start(async () => {
      setError(null);
      const res = await ensurePortalToken(patientId);
      if (res.error) { setError(res.error); return; }
      setToken(res.token ?? null);
      setOpen(true);
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Copialo manualmente.");
    }
  };

  const sendWa = () => {
    const l = waLink(phone, message);
    if (!l) { setError("El paciente no tiene teléfono cargado."); return; }
    window.open(l, "_blank", "noopener,noreferrer");
  };

  // Sin token todavía: un solo botón para generarlo.
  if (!token) {
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={generate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border trans disabled:opacity-50"
          style={{ background: "var(--primary-soft)", color: "var(--primary-ink)", borderColor: "var(--primary)" }}
        >
          🔗 {pending ? "Generando…" : "Generar enlace del portal"}
        </button>
        {error && <span className="text-[11px] mt-1" style={{ color: "var(--rose)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border border-line trans"
        style={{ background: "var(--surface-2)", color: "var(--primary-ink)" }}
      >
        🔗 Portal del paciente
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-20 w-[min(92vw,340px)] bg-surface border border-line rounded-xl3 shadow-soft p-4">
          <p className="text-[12.5px] font-semibold mb-1.5">Enlace del portal</p>
          <div className="flex items-center gap-2 rounded-xl2 border border-line px-2.5 py-2 mb-3" style={{ background: "var(--surface-2)" }}>
            <span className="text-[11.5px] text-muted truncate flex-1">{link}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copy}
              className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line trans"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              {copied ? "✓ Copiado" : "Copiar link"}
            </button>
            <button
              onClick={sendWa}
              className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans"
              style={{ background: "#25D366" }}
            >
              <WaIcon className="w-4 h-4" /> WhatsApp
            </button>
          </div>
          {error && <p className="text-[11px] mt-2" style={{ color: "var(--rose)" }}>{error}</p>}
          <p className="text-[11px] text-muted mt-2 leading-snug">Cualquiera con este enlace puede ver y cargar datos del paciente. Compartilo solo con él/ella.</p>
        </div>
      )}
    </div>
  );
}
