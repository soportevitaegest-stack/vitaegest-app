import { getPublicSlots } from "@/server/actions/portalPublic";
import { PublicBooking } from "@/components/portal/PublicBooking";
import { createClient } from "@/lib/supabase/server";
import { formatARS } from "@/lib/deposits";

export const dynamic = "force-dynamic";

// Landing pública de agendamiento (paciente nuevo, sin login).
export default async function AgendarPage({ params }: { params: { slug: string } }) {
  // Validación liviana del slug: si es inválido, la RPC lanza excepción.
  const probeDate = new Date();
  probeDate.setDate(probeDate.getDate() + 1);
  const probe = `${probeDate.getFullYear()}-${String(probeDate.getMonth() + 1).padStart(2, "0")}-${String(probeDate.getDate()).padStart(2, "0")}`;
  const check = await getPublicSlots(params.slug, probe);

  if (check.error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--canvas)" }}>
        <div className="bg-surface border border-line rounded-xl3 shadow-soft p-8 max-w-sm text-center">
          <div className="text-3xl mb-2">🔗</div>
          <h1 className="font-display font-bold text-lg mb-1">Enlace no disponible</h1>
          <p className="text-[13px] text-muted leading-snug">{check.error}</p>
        </div>
      </main>
    );
  }

  // Instanciamos la base de datos y buscamos si este profesional cobra seña
  const supabase = await createClient();
  const { data: info } = await supabase.rpc("public_booking_info", { p_slug: params.slug });

  return (
    <main className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <header className="px-5 pt-6 pb-5" style={{ background: "linear-gradient(135deg,var(--primary),var(--teal))" }}>
        <div className="max-w-lg mx-auto text-white">
          <p className="text-[12.5px] font-semibold opacity-90">{info?.professional?.clinic_name || "VitaeGest"}</p>
          <h1 className="font-display font-extrabold text-2xl mt-0.5">Agendá tu turno</h1>
          <p className="text-[13px] opacity-90 mt-1">Completá tus datos y elegí un horario. Tu turno queda pendiente de confirmación.</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-16 -mt-3">
        
        {/* NUEVO: Cartel de aviso de seña antes de que empiece a llenar los datos */}
        {info?.deposit?.enabled && (
          <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-4 shadow-sm relative z-10">
            <p className="text-sm text-teal-900 font-medium">
              💳 Este consultorio requiere una seña de <strong>{formatARS(info.deposit.amount)}</strong> para confirmar el turno.
            </p>
            <p className="text-xs text-teal-700 mt-1">
              Al finalizar la reserva te mostraremos los datos para transferir.
            </p>
          </div>
        )}

        {/* ACÁ ESTÁ EL CAMBIO: Le pasamos la info al formulario */}
        <PublicBooking slug={params.slug} info={info} />
      </div>
    </main>
  );
}
