"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DIAS,
  aMinutos,
  hhmm,
  turnosDelTramo,
  validarSemana,
  type Bloque,
  type Sede,
} from "@/lib/agenda";
import { guardarSemana } from "@/server/actions/sedes";

/**
 * Editor de la semana: cada día con sus tramos y su sede.
 *
 * Dos tramos el mismo día = jornada partida (mañana y tarde). El formulario
 * valida la superposición antes de enviar, y Postgres la vuelve a validar.
 */
export function HorariosSemana({
  sedes,
  bloquesIniciales,
  duracionPorDefecto,
}: {
  sedes: Sede[];
  bloquesIniciales: Bloque[];
  duracionPorDefecto: number;
}) {
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, arrancar] = useTransition();

  const sedesActivas = useMemo(() => sedes.filter((s) => s.is_active), [sedes]);
  const sedePorDefecto = sedesActivas.find((s) => s.is_default) ?? sedesActivas[0];
  const variasSedes = sedesActivas.length > 1;

  const cambiar = (next: Bloque[]) => {
    setBloques(next);
    setGuardado(false);
    setError(validarSemana(next));
  };

  const agregarTramo = (weekday: number) => {
    const delDia = bloques.filter((b) => b.weekday === weekday);
    // El tramo nuevo arranca después del último, para no chocar de entrada.
    const ultimo = delDia.sort((a, b) => aMinutos(a.end_time) - aMinutos(b.end_time)).at(-1);
    const desde = ultimo ? ultimo.end_time : "09:00";
    const hasta = ultimo
      ? `${String(Math.min(23, Number(desde.slice(0, 2)) + 4)).padStart(2, "0")}:00`
      : "13:00";

    cambiar([
      ...bloques,
      {
        weekday,
        start_time: desde,
        end_time: hasta,
        location_id: sedePorDefecto?.id ?? null,
        slot_minutes: null,
        max_per_slot: null,
      },
    ]);
  };

  const quitarTramo = (i: number) => cambiar(bloques.filter((_, k) => k !== i));

  const editarTramo = (i: number, patch: Partial<Bloque>) =>
    cambiar(bloques.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  const guardar = () => {
    const problema = validarSemana(bloques);
    if (problema) return setError(problema);

    arrancar(async () => {
      const r = await guardarSemana(bloques);
      if (r.ok) {
        setGuardado(true);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  };

  const totalSemanal = bloques.reduce(
    (t, b) => t + turnosDelTramo(b, duracionPorDefecto),
    0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <header className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Tus horarios</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configurá cada día por separado. Podés tener dos tramos el mismo día
          —por ejemplo mañana y tarde— y atender en lugares distintos.
        </p>
      </header>

      <div className="space-y-3">
        {DIAS.map((dia) => {
          const indices = bloques
            .map((b, i) => ({ b, i }))
            .filter((x) => x.b.weekday === dia.n)
            .sort((a, z) => aMinutos(a.b.start_time) - aMinutos(z.b.start_time));

          const atiende = indices.length > 0;

          return (
            <div
              key={dia.n}
              className={`rounded-xl border p-4 transition-colors ${
                atiende ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${
                      atiende
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {dia.corto}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{dia.largo}</p>
                    <p className="text-xs text-slate-500">
                      {atiende
                        ? `${indices.length} ${indices.length === 1 ? "tramo" : "tramos"}`
                        : "No atendés"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => agregarTramo(dia.n)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400"
                >
                  + Agregar horario
                </button>
              </div>

              {atiende && (
                <ul className="mt-4 space-y-2.5">
                  {indices.map(({ b, i }) => (
                    <li
                      key={b.id ?? `${dia.n}-${i}`}
                      className="flex flex-wrap items-center gap-2.5 rounded-lg bg-slate-50 p-2.5"
                    >
                      <label className="sr-only" htmlFor={`d${i}`}>
                        Desde
                      </label>
                      <input
                        id={`d${i}`}
                        type="time"
                        value={hhmm(b.start_time)}
                        onChange={(e) => editarTramo(i, { start_time: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                      />
                      <span className="text-sm text-slate-400">a</span>
                      <label className="sr-only" htmlFor={`h${i}`}>
                        Hasta
                      </label>
                      <input
                        id={`h${i}`}
                        type="time"
                        value={hhmm(b.end_time)}
                        onChange={(e) => editarTramo(i, { end_time: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                      />

                      {variasSedes && (
                        <>
                          <label className="sr-only" htmlFor={`s${i}`}>
                            Lugar
                          </label>
                          <select
                            id={`s${i}`}
                            value={b.location_id ?? ""}
                            onChange={(e) =>
                              editarTramo(i, { location_id: e.target.value || null })
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                          >
                            {sedesActivas.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}

                      <span className="text-xs text-slate-400">
                        {turnosDelTramo(b, duracionPorDefecto)} turnos
                      </span>

                      <button
                        type="button"
                        onClick={() => quitarTramo(i)}
                        aria-label={`Quitar el horario de ${dia.largo}`}
                        className="ml-auto rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente || !!error}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Guardar horarios"}
        </button>

        <p className="text-sm text-slate-500">
          {totalSemanal} turnos por semana, si se llenara todo.
        </p>

        {guardado && !error && (
          <p className="text-sm font-medium text-emerald-700">Guardado.</p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Cambiar los horarios no toca los turnos ya agendados. Si dejás de
        atender un día que ya tenía turnos, esos turnos siguen ahí: revisalos
        desde la agenda.
      </p>
    </section>
  );
}
