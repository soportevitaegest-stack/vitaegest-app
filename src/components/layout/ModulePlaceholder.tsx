// Placeholder estructural: marca una ruta ya cableada cuyo módulo se baja luego.
export function ModulePlaceholder({ name }: { name: string }) {
  return (
    <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
      <div className="rounded-xl3 border border-dashed border-line bg-surface p-10 text-center">
        <h2 className="font-display font-bold text-lg mb-1">{name}</h2>
        <p className="text-[13.5px] text-muted">Ruta lista. El módulo se conecta en el siguiente paso.</p>
      </div>
    </main>
  );
}
