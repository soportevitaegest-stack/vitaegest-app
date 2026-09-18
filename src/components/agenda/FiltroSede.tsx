"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Sede } from "@/lib/agenda";

/**
 * Filtro de sede para la agenda.
 *
 * Vive en la URL (?sede=<uuid>) y no en estado local: así el filtro sobrevive
 * a recargar la página, se puede compartir el link, y el Server Component de
 * la agenda puede leerlo y filtrar del lado del servidor.
 *
 * Si hay una sola sede no se muestra: no hay nada que filtrar.
 */
export function FiltroSede({ sedes }: { sedes: Sede[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actual = params.get("sede") ?? "";

  const activas = sedes.filter((s) => s.is_active);
  if (activas.length < 2) return null;

  const ir = (id: string) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("sede", id);
    else next.delete("sede");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div
      role="tablist"
      aria-label="Filtrar por lugar de atención"
      className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1"
    >
      <button
        role="tab"
        aria-selected={actual === ""}
        onClick={() => ir("")}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          actual === "" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Todos
      </button>

      {activas.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={actual === s.id}
          onClick={() => ir(s.id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            actual === s.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Cinta de color al costado del turno, para saber de un vistazo dónde es.
 * Se usa dentro de la tarjeta de cada turno en la agenda.
 */
export function CintaSede({
  sede,
  mostrarNombre = false,
}: {
  sede: Pick<Sede, "name" | "color"> | null;
  mostrarNombre?: boolean;
}) {
  if (!sede) return null;

  if (!mostrarNombre) {
    return (
      <span
        aria-label={`Lugar: ${sede.name}`}
        title={sede.name}
        className="h-full w-1 shrink-0 rounded-full"
        style={{ backgroundColor: sede.color }}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: sede.color }}
      />
      {sede.name}
    </span>
  );
}
