"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePatientActive } from "@/server/actions/patients";

export function PatientActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleToggle = () => {
    start(async () => {
      await togglePatientActive(id, !isActive);
      setMenuOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Botón de exportación a PDF directo */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") window.print();
        }}
        className="inline-flex items-center gap-1 text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line hover:border-primary trans bg-surface text-ink"
        title="Imprimir o guardar como PDF"
      >
        🖨️ Exportar PDF
      </button>

      {/* Menú de acciones del paciente */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line bg-surface text-ink hover:bg-surface-2 trans"
        >
          Acciones ▾
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-xl2 border border-line bg-surface shadow-lg z-20 py-1">
            <button
              onClick={handleToggle}
              disabled={pending}
              className="w-full text-left px-4 py-2 text-[12.5px] text-ink hover:bg-surface-2 trans disabled:opacity-50"
            >
              {pending ? "Actualizando…" : isActive ? "Archivar paciente" : "Reactivar paciente"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
