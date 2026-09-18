"use client";

import { useState, useTransition } from "react";
import { COLORES_SEDE, type Sede } from "@/lib/agenda";
import {
  desactivarSede,
  guardarSede,
  marcarSedePrincipal,
} from "@/server/actions/sedes";

/**
 * ABM de lugares de atención.
 *
 * No se borran: se dan de baja. Los turnos viejos siguen apuntando a la sede
 * donde fueron, y la agenda necesita poder mostrarla.
 */
export function SedesSection({ sedes }: { sedes: Sede[] }) {
  const [editando, setEditando] = useState<Sede | "nueva" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, arrancar] = useTransition();

  const activas = sedes.filter((s) => s.is_active);

  const accion = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    arrancar(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo completar la operación");
      else setError(null);
    });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dónde atendés</h2>
          <p className="mt-1 text-sm text-slate-500">
            Si atendés en más de un lugar, cargalos acá. Después asignás cada
            día a un lugar, y tus pacientes eligen dónde quieren el turno.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditando("nueva");
            setError(null);
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          + Agregar lugar
        </button>
      </header>

      {activas.length === 0 && (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Todavía no cargaste ningún lugar de atención.
        </p>
      )}

      <ul className="space-y-2.5">
        {activas.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3.5"
          >
            <span
              aria-hidden
              className="h-9 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                {s.name}
                {s.is_default && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    Principal
                  </span>
                )}
              </p>
              {s.address && <p className="truncate text-sm text-slate-500">{s.address}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {!s.is_default && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => accion(() => marcarSedePrincipal(s.id))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-50"
                >
                  Hacer principal
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditando(s);
                  setError(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-400"
              >
                Editar
              </button>
              {!s.is_default && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Dar de baja "${s.name}"? Los turnos que ya tenía se conservan; solo deja de ofrecerse para turnos nuevos.`,
                      )
                    )
                      accion(() => desactivarSede(s.id));
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                >
                  Dar de baja
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {editando && (
        <FormularioSede
          sede={editando === "nueva" ? null : editando}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

function FormularioSede({
  sede,
  onCerrar,
}: {
  sede: Sede | null;
  onCerrar: () => void;
}) {
  const [color, setColor] = useState(sede?.color ?? COLORES_SEDE[0]);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, arrancar] = useTransition();

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    arrancar(async () => {
      const r = await guardarSede({
        id: sede?.id,
        name: String(f.get("name") ?? ""),
        address: String(f.get("address") ?? ""),
        notes: String(f.get("notes") ?? ""),
        phone: String(f.get("phone") ?? ""),
        color,
      });
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  };

  return (
    <div className="mt-5 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
      <h3 className="font-semibold text-slate-900">
        {sede ? `Editar ${sede.name}` : "Nuevo lugar de atención"}
      </h3>

      <form onSubmit={enviar} className="mt-4 grid gap-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={sede?.name ?? ""}
            placeholder="Consultorio Centro"
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium text-slate-700">
            Dirección
          </label>
          <input
            id="address"
            name="address"
            defaultValue={sede?.address ?? ""}
            placeholder="San Martín 1234, Rosario"
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            La ve tu paciente al reservar y en el recordatorio.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Teléfono del lugar
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={sede?.phone ?? ""}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">Color en la agenda</span>
            <div className="mt-2 flex gap-2">
              {COLORES_SEDE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Cómo llegar
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={sede?.notes ?? ""}
            placeholder="Timbre 3B. La puerta del edificio es la verde, al lado de la farmacia."
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Se lo mandamos a tu paciente cuando confirma el turno. Escribí lo
            que siempre tenés que explicar por WhatsApp.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
