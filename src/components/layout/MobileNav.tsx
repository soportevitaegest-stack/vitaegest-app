"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { esActivo, navPara, type NavItem } from "@/config/nav";
import { NAV_ICONOS } from "./NavIconos";

/**
 * Menú hamburguesa para celulares.
 *
 * DECISIÓN IMPORTANTE: este componente contiene **el botón Y el panel**.
 *
 * La alternativa obvia —botón en el Topbar, panel en el Sidebar— obliga a
 * compartir el estado "abierto" entre dos componentes, y eso pide un Context o
 * subir el estado al layout, que entonces tiene que volverse Client Component y
 * pierde el renderizado en servidor de todo el dashboard. Teniendo los dos acá,
 * el estado es un useState local y no hay nada que sincronizar.
 *
 * El Sidebar de escritorio no se toca: sigue con `hidden lg:flex`.
 *
 * Uso, en el Topbar (que ya es Client Component):
 *   <MobileNav specialties={specialties} />
 */
export function MobileNav({
  specialties,
  nombre,
  consultorio,
}: {
  specialties?: string[] | null;
  nombre?: string;
  consultorio?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const items: NavItem[] = navPara(specialties);

  // Cerrar al navegar. Sin esto, tocás "Pacientes", la página cambia detrás y
  // el panel queda abierto tapándola.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Escape para cerrar + bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Llevar el foco al panel, para quien navega con teclado o lector de pantalla.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
      botonRef.current?.focus();
    };
  }, [abierto]);

  return (
    <>
      {/* Botón: solo hasta lg. En escritorio manda el Sidebar. */}
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-canvas lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Fondo oscuro */}
      <div
        onClick={() => setAbierto(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel deslizante */}
      <div
        id="menu-movil"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        tabIndex={-1}
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col bg-white shadow-lift outline-none transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        // El notch y la barra de gestos de iOS.
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-line px-5 py-4">
          <div className="min-w-0">
            <span className="block text-[15px] font-extrabold tracking-tight">
              <span className="text-ink">Vitae</span>
              <span className="text-coral">Gest</span>
            </span>
            {nombre && (
              <span className="mt-1 block truncate text-xs text-ink-faint">
                {consultorio ?? nombre}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icono = NAV_ICONOS[item.icono];
              const activo = esActivo(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={activo ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                      activo
                        ? "bg-primary-50 text-primary"
                        : "text-ink-soft hover:bg-canvas hover:text-ink"
                    }`}
                  >
                    <Icono className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
