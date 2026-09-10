"use client";

import { useMemo, useState } from "react";
import type { Patient } from "@/types/domain";
import { fullName } from "@/lib/utils/format";
import { PatientCard } from "./PatientCard";

// Filtro en cliente sobre la lista ya traída por el Server Component.
// (Evita la diferencia de searchParams entre Next 14 y 15.)
export function PatientSearch({ patients }: { patients: Patient[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return patients;
    return patients.filter((p) => {
      const hay = `${fullName(p)} ${p.phone ?? ""} ${p.notes ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [q, patients]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 bg-surface border border-line rounded-xl2 px-3 py-2.5 max-w-sm">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, teléfono o motivo…"
          className="bg-transparent outline-none text-sm text-ink placeholder:text-muted w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl3 border border-dashed border-line bg-surface p-10 text-center text-[13.5px] text-muted">
          {patients.length === 0
            ? "Todavía no hay pacientes. Cargá el seed de demo o creá el primero."
            : "Sin resultados para tu búsqueda."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((p) => (
            <PatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}
    </div>
  );
}
