"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cerrarSesion } from "@/server/actions/cuenta";

/**
 * Menú de la cuenta, para el Topbar.
 */
export function UserMenu({
  nombre,
  email,
  consultorio,
}: {
  nombre: string;
  email: string;
  consultorio?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  const iniciales = nombre
    .replace(/^(Klga\.|Klgo\.|Lic\.|Dra\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-canvas dark:hover:bg-zinc-800"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-white">
          {iniciales || "?"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-semibold leading-tight text-ink dark:text-zinc-100">{nombre}</span>
          {consultorio && (
            <span className="block text-[11px] leading-tight text-ink-faint dark:text-zinc-400">{consultorio}</span>
          )}
        </span>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-faint dark:text-zinc-400" aria-hidden="true">
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-line dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lift"
        >
          <div className="border-b border-ink-line/70 dark:border-zinc-700 px-4 py-3">
            <p className="text-[13px] font-semibold text-ink dark:text-zinc-100">{nombre}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-faint dark:text-zinc-400">{email}</p>
          </div>

          <div className="p-1.5">
            <Link
              href="/configuracion/seguridad"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-ink dark:text-zinc-200 transition-colors hover:bg-canvas dark:hover:bg-zinc-800"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-soft dark:text-zinc-400" aria-hidden="true">
                <rect x="4" y="8.5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Cambiar contraseña
            </Link>

            <Link
              href="/configuracion"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-ink dark:text-zinc-200 transition-colors hover:bg-canvas dark:hover:bg-zinc-800"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-ink-soft dark:text-zinc-400" aria-hidden="true">
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 3v1.5M10 15.5V17M17 10h-1.5M4.5 10H3M14.9 5.1l-1 1M6.1 13.9l-1 1M14.9 14.9l-1-1M6.1 6.1l-1-1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Configuración
            </Link>
          </div>

          <div className="border-t border-ink-line/70 dark:border-zinc-700 p-1.5">
            <form action={cerrarSesion}>
              <BotonSalir />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BotonSalir() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-coral-dark dark:text-red-400 transition-colors hover:bg-coral-soft dark:hover:bg-red-950/30 disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12.5 13.5 16 10l-3.5-3.5M16 10H7M9 16H5.5A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4H9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
