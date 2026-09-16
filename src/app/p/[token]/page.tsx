import { createPortalClient } from "@/lib/supabase/portal";
import { PortalTabs } from "./PortalTabs";
import type { PortalContext } from "@/types/portal";

// Estas tres líneas son la bomba atómica anti-caché de Next.js
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Portal público del paciente. NEXT 14: params es un objeto síncrono.
export default async function PortalPage({ params }: { params: { token: string } }) {
  const supabase = createPortalClient();
  const { data, error } = await supabase.rpc("portal_context", { p_token: params.token });

  // Token inválido o expirado → pantalla amable, sin filtrar nada.
  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--canvas)" }}>
        <div className="bg-surface border border-line rounded-xl3 shadow-soft p-8 max-w-sm text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="font-display font-bold text-lg mb-1">Enlace no disponible</h1>
          <p className="text-[13px] text-muted leading-snug">
            Este enlace de seguimiento no es válido o expiró. Pedile a tu kinesiólogo/a un enlace nuevo.
          </p>
        </div>
      </main>
    );
  }

  const ctx = data as PortalContext;
  const name = ctx.patient?.first_name ?? "";

  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Encabezado de marca */}
      <header className="px-5 pt-6 pb-5" style={{ background: "linear-gradient(135deg,var(--primary),var(--teal))" }}>
        <div className="max-w-lg mx-auto text-white">
          <p className="text-[12.5px] font-semibold opacity-90">VitaeGest · Seguimiento</p>
          <h1 className="font-display font-extrabold text-2xl mt-0.5">
            ¡Hola{name ? `, ${name}` : ""}! 👋
          </h1>
          <p className="text-[13px] opacity-90 mt-1">Gestioná tus turnos, ejercicios y seguimiento desde acá.</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-16 -mt-3">
        <PortalTabs token={params.token} ctx={ctx} />
      </div>
    </main>
  );
}
