"use client";

import { useState } from "react";
import { exportarHistoriaPdf } from "@/lib/export";

/**
 * Botón "Descargar historia clínica (PDF)".
 * Va en la ficha de la paciente, al lado del botón del portal.
 *
 *   <ExportarHistoriaButton patientId={paciente.id} />
 */
export function ExportarHistoriaButton({
  patientId,
  className = "btn-ghost",
}: {
  patientId: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setError(null);
    setEstado("Preparando…");
    try {
      await exportarHistoriaPdf(patientId, (paso) => setEstado(paso));
      setEstado(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF");
      setEstado(null);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button onClick={descargar} disabled={estado !== null} className={className}>
        {estado ?? "Descargar historia clínica"}
      </button>
      {error && <span className="text-xs text-coral-dark">{error}</span>}
    </div>
  );
}
