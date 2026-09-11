import { IS_DEMO } from "@/lib/demo";

// Cinta superior que avisa "Modo demostración". Se renderiza sólo si
// NEXT_PUBLIC_APP_ENV='demo'. Colocar dentro del layout del dashboard,
// arriba del contenido (ver instrucción de instalación).
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div
      className="w-full text-center text-[12.5px] font-semibold py-1.5 px-4"
      style={{ background: "var(--primary-ink)", color: "#fff" }}
    >
      Modo demostración · los datos de ejemplo se reinician automáticamente cada noche
    </div>
  );
}
