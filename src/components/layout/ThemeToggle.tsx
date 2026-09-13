"use client";

import { useEffect, useState } from "react";

// Alterna el tema claro/oscuro. Persiste la preferencia en localStorage
// ('vg-theme') y togglea la clase .dark en <html>. El script de pre-hidratación
// del root layout aplica esta misma preferencia al cargar (sin flash).
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("vg-theme", next ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible: el cambio aplica igual en esta sesión */
    }
    setDark(next);
  };

  const showSun = mounted && dark;

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema claro u oscuro"
      title={showSun ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="w-9 h-9 rounded-xl2 border border-line flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 trans shrink-0"
    >
      {showSun ? (
        // Sol → pasar a claro
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
        </svg>
      ) : (
        // Luna → pasar a oscuro
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
