"use client";

export function PrintEvolutionButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 trans border border-line hover:border-primary"
      style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      title="Imprimir o guardar como PDF"
    >
      🖨️ Exportar PDF
    </button>
  );
}
