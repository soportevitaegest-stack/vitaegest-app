// Logotipo VitaeGest (texto de marca). El isologo definitivo se agrega como
// <img> cuando esté el asset en /public; por ahora un placeholder tipográfico.
export function Logo({ size = 34, showTagline = true }: { size?: number; showTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="rounded-xl2 shrink-0 flex items-center justify-center font-extrabold text-white"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.44,
          background: "linear-gradient(135deg, var(--primary), var(--teal))",
        }}
      >
        V
      </div>
      <div className="leading-none min-w-0">
        <div className="font-extrabold text-[17px] tracking-tight truncate">
          <span style={{ color: "var(--ink)" }}>Vitae</span>
          <span style={{ color: "var(--coral)" }}>Gest</span>
        </div>
        {showTagline && (
          <div className="text-[9.5px] font-medium tracking-wide mt-1 truncate" style={{ color: "var(--muted)" }}>
            Software Kinésico Integral
          </div>
        )}
      </div>
    </div>
  );
}
