import { Topbar } from "@/components/layout/Topbar";

export const dynamic = "force-dynamic";

// Inicio · Dashboard ejecutivo (placeholder estructural).
export default function InicioPage() {
  return (
    <>
      <Topbar title="Inicio" subtitle="Resumen de tu día" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <div className="rounded-xl3 border border-line bg-surface shadow-soft p-8 text-center">
          <h2 className="font-display font-bold text-lg mb-1">Dashboard ejecutivo</h2>
          <p className="text-[13.5px] text-muted max-w-md mx-auto">
            Estructura base lista. En el próximo paso conectamos los 3 KPIs
            (turnos de hoy, cobros pendientes, adherencia a portales) y la agenda
            del día a Supabase.
          </p>
        </div>
      </main>
    </>
  );
}
