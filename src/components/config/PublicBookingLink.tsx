"use client";

import { useState } from "react";

// Muestra el enlace público de agendamiento del profesional (/agendar/<slug>)
// para compartir con pacientes nuevos. Copiar + abrir.
export function PublicBookingLink({ slug }: { slug: string | null }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = slug ? `${origin}/agendar/${slug}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5">
      <h3 className="font-display font-bold text-[15px] mb-1">Enlace público de agendamiento</h3>
      <p className="text-[12.5px] text-muted mb-3">
        Compartí este enlace (web, Instagram, WhatsApp). Un <b>paciente nuevo</b> puede reservar su primer turno;
        se da de alta solo y queda en tu bandeja de pendientes.
      </p>

      {slug ? (
        <>
          <div className="flex items-center gap-2 rounded-xl2 border border-line px-3 py-2.5 mb-3" style={{ background: "var(--surface-2)" }}>
            <span className="text-[12.5px] text-muted truncate flex-1">{link}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="text-[12.5px] font-semibold rounded-xl2 px-3.5 py-2 border border-line trans" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
              {copied ? "✓ Copiado" : "Copiar enlace"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold rounded-xl2 px-3.5 py-2 text-white trans" style={{ background: "var(--teal)" }}>
              Ver landing
            </a>
          </div>
          <p className="text-[11px] text-muted mt-2 leading-snug">Requiere tener las reservas online activadas abajo.</p>
        </>
      ) : (
        <p className="text-[13px] text-muted">Guardá tu perfil para generar el enlace.</p>
      )}
    </div>
  );
}
