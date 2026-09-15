import type { Metadata } from "next";
import { ExportPanel } from "@/components/export/ExportPanel";

export const metadata: Metadata = { title: "Exportar datos · VitaeGest" };

export default function ExportarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Exportar datos</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-ink-soft">
          Descargá tu facturación para el contador, la historia clínica de una
          paciente para derivar, o todo junto cuando quieras tener un respaldo.
        </p>
      </header>

      <ExportPanel />
    </div>
  );
}
