import type { Metadata } from "next";
import { Topbar } from "@/components/layout/Topbar";
import { ExportPanel } from "@/components/export/ExportPanel";

export const metadata: Metadata = { title: "Exportar datos · VitaeGest" };

/**
 * Estructura igual que el resto del sistema: <Topbar> + <main> con el scroll.
 * El Topbar es el que trae el botón ☰ del menú en celular.
 */
export default function ExportarPage() {
  return (
    <>
      <Topbar
        title="Exportar"
        subtitle="Tu facturación para el contador, una historia clínica para derivar, o todo junto como respaldo"
      />

      <main
        className="flex-1 overflow-y-auto px-5 py-6 md:px-7"
        style={{ background: "var(--canvas)" }}
      >
        <div className="mx-auto w-full max-w-5xl">
          <ExportPanel />
        </div>
      </main>
    </>
  );
}
