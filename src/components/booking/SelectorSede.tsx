"use client";

/**
 * Selector de sede en la reserva pública (/agendar/<slug>).
 *
 * Aparece solo si la profesional atiende en más de un lugar. Con una sola
 * sede, mostrar un selector de una opción sería ruido: se informa dónde es
 * y listo.
 *
 * El orden importa: primero se elige el lugar, después la fecha. Un martes
 * puede existir en una sede y no en la otra, así que elegir el día antes
 * llevaría a mostrar horarios que después desaparecen.
 */

export type SedePublica = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  color: string;
  is_default: boolean;
};

export function SelectorSede({
  sedes,
  elegida,
  onElegir,
}: {
  sedes: SedePublica[];
  elegida: string | null;
  onElegir: (id: string) => void;
}) {
  if (sedes.length === 0) return null;

  // Una sola sede: se informa, no se pregunta.
  if (sedes.length === 1) {
    const s = sedes[0];
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{s.name}</p>
        {s.address && <p className="mt-0.5 text-sm text-slate-600">{s.address}</p>}
        {s.notes && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{s.notes}</p>}
      </div>
    );
  }

  return (
    <fieldset>
      <legend className="text-[15px] font-semibold text-slate-900">
        ¿Dónde querés atenderte?
      </legend>
      <p className="mt-1 text-sm text-slate-500">
        Los días y horarios disponibles cambian según el lugar.
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {sedes.map((s) => {
          const activa = elegida === s.id;
          return (
            <label
              key={s.id}
              className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-all ${
                activa
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="sede"
                value={s.id}
                checked={activa}
                onChange={() => onElegir(s.id)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
                {s.address && (
                  <span className="mt-0.5 block text-sm text-slate-600">{s.address}</span>
                )}
                {s.notes && (
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-slate-500">
                    {s.notes}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Confirmación posterior a la reserva: dónde y cómo llegar.
 * Es el dato que más se pregunta después por WhatsApp.
 */
export function SedeConfirmada({ sede }: { sede: SedePublica | null }) {
  if (!sede) return null;

  return (
    <div className="rounded-xl border-l-4 border-l-emerald-500 bg-emerald-50/50 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-emerald-800">
        Dónde es
      </p>
      <p className="mt-1.5 font-semibold text-slate-900">{sede.name}</p>
      {sede.address && <p className="text-sm text-slate-700">{sede.address}</p>}
      {sede.notes && (
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{sede.notes}</p>
      )}
      {sede.address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 underline"
        >
          Ver en el mapa
        </a>
      )}
    </div>
  );
}
