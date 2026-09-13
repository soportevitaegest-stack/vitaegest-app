"use client";

import { useState, useTransition } from "react";
import { ensurePortalToken, revokePortalToken, rotatePortalToken } from "@/server/actions/portalLinks";
import { waLink } from "@/lib/utils/agenda";

type Scope = "both" | "exercises";

function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.01 3.2C9.03 3.2 3.36 8.86 3.36 15.84c0 2.23.59 4.41 1.71 6.33L3.2 28.8l6.79-1.78a12.6 12.6 0 0 0 6.02 1.53h.01c6.98 0 12.65-5.67 12.65-12.65 0-3.38-1.32-6.56-3.71-8.95a12.56 12.56 0 0 0-8.94-3.75Zm5.77 15.23c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

const SCOPES: [Scope, string, string][] = [
  ["both", "Piso pélvico", "Turnos, ejercicios y diario miccional"],
  ["exercises", "Dermatofuncional", "Turnos y ejercicios/pautas (sin diario)"],
];

export function PortalLinkButton({
  patientId,
  patientName,
  phone,
  token: initialToken,
  scope: initialScope,
}: {
  patientId: string;
  patientName: string;
  phone: string | null;
  token: string | null;
  scope: string | null;
}) {
  const [pending, start] = useTransition();
  const [token, setToken] = useState<string | null>(initialToken);
  const [scope, setScope] = useState<Scope>((initialScope as Scope) === "exercises" ? "exercises" : "both");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = token ? `${origin}/p/${token}` : "";
  const first = patientName.split(" ")[0] || "";
  const message = `¡Hola ${first}! 👋 Este es tu portal de seguimiento de VitaeGest. Desde acá podés pedir turnos, ver tus ejercicios y seguir tu tratamiento: ${link}`;

  const generate = (s: Scope) =>
    start(async () => {
      setError(null);
      const res = await ensurePortalToken(patientId, s);
      if (res.error) { setError(res.error); return; }
      setToken(res.token ?? null);
      setScope(s);
      setOpen(true);
    });

  const changeScope = (s: Scope) =>
    start(async () => {
      setScope(s);
      const res = await ensurePortalToken(patientId, s);
      if (res.error) setError(res.error);
    });

  const revoke = () => {
    if (!confirm("¿Revocar el enlace? El paciente ya no podrá acceder con el link actual.")) return;
    start(async () => {
      setError(null);
      const res = await revokePortalToken(patientId);
      if (res.error) { setError(res.error); return; }
      setToken(null);
      setOpen(false);
    });
  };

  const rotate = () => {
    if (!confirm("¿Generar un enlace nuevo? El anterior dejará de funcionar.")) return;
    start(async () => {
      setError(null);
      const res = await rotatePortalToken(patientId, scope);
      if (res.error) { setError(res.error); return; }
      setToken(res.token ?? null);
      setCopied(false);
    });
  };

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

  const ScopePicker = () => (
    <div className="grid grid-cols-2 gap-2">
      {SCOPES.map(([k, label, desc]) => {
        const on = scope === k;
        return (
          <button
            key={k}
            onClick={() => (token ? changeScope(k) : setScope(k))}
            disabled={pending}
            className="text-left rounded-xl2 border p-2.5 trans disabled:opacity-50"
            style={on ? { background: "var(--primary-soft)", borderColor: "var(--primary)" } : { background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <span className="block text-[12.5px] font-semibold" style={on ? { color: "var(--primary-ink)" } : {}}>{label}</span>
            <span className="block text-[10.5px] text-muted leading-tight mt-0.5">{desc}</span>
          </button>
        );
      })}
    </div>
  );

  // Sin token todavía.
  if (!token) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 border trans"
          style={{ background: "var(--primary-soft)", color: "var(--primary-ink)", borderColor: "var(--primary)" }}
        >
          🔗 Generar enlace del portal
        </button>
        {open && (
          <div className="absolute right-0 mt-2 z-20 w-[min(92vw,340px)] bg-surface border border-line rounded-xl3 shadow-soft p-4">
            <p className="text-[12.5px] font-semibold mb-2">Tipo de seguimiento</p>
            <ScopePicker />
            <button
              onClick={() => generate(scope)}
              disabled={pending}
              className="w-full mt-3 text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans disabled:opacity-50"
              style={{ background: "var(--teal)" }}
            >
              {pending ? "Generando…" : "Generar enlace"}
            </button>
            {error && <p className="text-[11px] mt-2" style={{ color: "var(--rose)" }}>{error}</p>}
          </div>
        )}
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
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={copy} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line trans" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
              {copied ? "✓ Copiado" : "Copiar link"}
            </button>
            <button onClick={sendWa} className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans" style={{ background: "#25D366" }}>
              <WaIcon className="w-4 h-4" /> WhatsApp
            </button>
          </div>
          <p className="text-[12px] font-semibold mb-1.5">Tipo de seguimiento</p>
          <ScopePicker />

          {/* Seguridad: rotar o revocar el enlace */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-line">
            <button onClick={rotate} disabled={pending} className="text-[12px] font-semibold rounded-xl2 px-3 py-2 border border-line trans disabled:opacity-50" style={{ background: "var(--surface-2)", color: "var(--primary-ink)" }}>
              ↻ Generar nuevo
            </button>
            <button onClick={revoke} disabled={pending} className="text-[12px] font-semibold rounded-xl2 px-3 py-2 border trans disabled:opacity-50" style={{ borderColor: "var(--rose)", color: "var(--rose)", background: "var(--surface)" }}>
              Revocar enlace
            </button>
          </div>

          {error && <p className="text-[11px] mt-2" style={{ color: "var(--rose)" }}>{error}</p>}
          <p className="text-[11px] text-muted mt-2 leading-snug">Cualquiera con este enlace puede ver y cargar datos del paciente. Al <b>revocar</b> o <b>generar nuevo</b>, el enlace anterior deja de funcionar.</p>
        </div>
      )}
    </div>
  );
}
