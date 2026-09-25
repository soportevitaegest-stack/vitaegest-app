"use client";

import { useMemo, useState } from "react";
import {
  archivarPlantilla,
  duplicarPlantilla,
  guardarPlantilla,
  type Area,
  type ItemPlantilla,
  type Plantilla,
} from "@/server/actions/exerciseTemplates";

const AREAS: { v: Area; t: string }[] = [
  { v: "general", t: "General" },
  { v: "pelvic_perineal", t: "Uroginecología" },
  { v: "dermatofunctional", t: "Dermatofuncional" },
];

const nombreArea = (a: Area) => AREAS.find((x) => x.v === a)?.t ?? "General";

export function PlantillasManager({
  plantillas,
  especialidades,
}: {
  plantillas: Plantilla[];
  /** `professionals.specialties`. Vacío = ve todas. */
  especialidades: Area[];
}) {
  const [editando, setEditando] = useState<Plantilla | "nueva" | null>(null);
  const [filtro, setFiltro] = useState<Area | "todas">("todas");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  /** Si tiene especialidad declarada, no le mostramos las de la otra área. */
  const visibles = useMemo(() => {
    const porEspecialidad =
      especialidades.length === 0
        ? plantillas
        : plantillas.filter(
            (p) => p.area === "general" || especialidades.includes(p.area),
          );
    return filtro === "todas"
      ? porEspecialidad
      : porEspecialidad.filter((p) => p.area === filtro);
  }, [plantillas, especialidades, filtro]);

  const mias = visibles.filter((p) => !p.is_system);
  const delSistema = visibles.filter((p) => p.is_system);

  /* useState y no useTransition: en React 18 el `isPending` de una transición
     se apaga en el primer await, y los botones se rehabilitarían antes de que
     la operación termine — con riesgo de doble clic. */
  const accion = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setPendiente(true);
    try {
      const r = await fn();
      setError(r.ok ? null : r.error ?? "No se pudo completar la operación");
    } finally {
      setPendiente(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filtrar por área" className="flex gap-1.5 rounded-xl bg-surface-2 p-1">
          {([{ v: "todas", t: "Todas" }, ...AREAS] as { v: Area | "todas"; t: string }[])
            .filter((o) =>
              o.v === "todas" ||
              o.v === "general" ||
              especialidades.length === 0 ||
              especialidades.includes(o.v as Area),
            )
            .map((o) => (
              <button
                key={o.v}
                role="tab"
                aria-selected={filtro === o.v}
                onClick={() => setFiltro(o.v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtro === o.v
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {o.t}
              </button>
            ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditando("nueva");
            setError(null);
          }}
          className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
        >
          + Nueva plantilla
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-ink">{error}</p>
      )}

      {editando && (
        <FormularioPlantilla
          plantilla={editando === "nueva" ? null : editando}
          areasPermitidas={
            especialidades.length === 0
              ? AREAS.map((a) => a.v)
              : (["general", ...especialidades] as Area[])
          }
          onCerrar={() => setEditando(null)}
        />
      )}

      {/* ── Mis plantillas ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-ink">Mis plantillas</h2>
        <p className="mt-1 text-sm text-muted">
          Las que armaste vos. Se pueden editar y archivar cuando quieras.
        </p>

        {mias.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-8 text-center text-sm text-muted">
            Todavía no armaste ninguna. Podés empezar de cero con “Nueva
            plantilla”, o tomar una de las de abajo y tocar “Copiar y editar”.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {mias.map((p) => (
              <TarjetaPlantilla
                key={p.id}
                p={p}
                pendiente={pendiente}
                onEditar={() => {
                  setEditando(p);
                  setError(null);
                }}
                onDuplicar={() => void accion(() => duplicarPlantilla(p.id))}
                onArchivar={() => {
                  if (confirm(`¿Archivar "${p.name}"? Las rutinas ya asignadas no se tocan.`))
                    void accion(() => archivarPlantilla(p.id));
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Plantillas del sistema ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-ink">Vienen con el sistema</h2>
        <p className="mt-1 text-sm text-muted">
          Estas no se editan: son iguales para todas. Tocá{" "}
          <strong className="font-semibold text-ink">Copiar y editar</strong> para
          hacerte tu propia versión y cambiarle lo que quieras.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {delSistema.map((p) => (
            <TarjetaPlantilla
              key={p.id}
              p={p}
              pendiente={pendiente}
              onDuplicar={() => void accion(() => duplicarPlantilla(p.id))}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function TarjetaPlantilla({
  p,
  pendiente,
  onEditar,
  onDuplicar,
  onArchivar,
}: {
  p: Plantilla;
  pendiente: boolean;
  onEditar?: () => void;
  onDuplicar: () => void;
  onArchivar?: () => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{p.name}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">
            {nombreArea(p.area)} · {p.items.length}{" "}
            {p.items.length === 1 ? "indicación" : "indicaciones"}
          </p>
        </div>
        {p.is_system && (
          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            Sistema
          </span>
        )}
      </div>

      {p.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
      )}

      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="mt-3 self-start text-sm font-medium text-primary-ink hover:underline"
      >
        {abierta ? "Ocultar" : "Ver las indicaciones"}
      </button>

      {abierta && (
        <ol className="mt-2 space-y-2 rounded-lg bg-surface-2 p-3">
          {p.items.map((i, k) => (
            <li key={k} className="text-sm">
              <span className="font-medium text-ink">{i.name}</span>
              {i.detail && (
                <span className="mt-0.5 block text-muted">{i.detail}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-teal"
          >
            Editar
          </button>
        )}
        <button
          type="button"
          disabled={pendiente}
          onClick={onDuplicar}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-teal disabled:opacity-50"
        >
          Copiar y editar
        </button>
        {onArchivar && (
          <button
            type="button"
            disabled={pendiente}
            onClick={onArchivar}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm text-muted hover:text-coral-ink disabled:opacity-50"
          >
            Archivar
          </button>
        )}
      </div>
    </li>
  );
}

function FormularioPlantilla({
  plantilla,
  areasPermitidas,
  onCerrar,
}: {
  plantilla: Plantilla | null;
  areasPermitidas: Area[];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.name ?? "");
  const [descripcion, setDescripcion] = useState(plantilla?.description ?? "");
  const [area, setArea] = useState<Area>(plantilla?.area ?? areasPermitidas[0] ?? "general");
  const [items, setItems] = useState<ItemPlantilla[]>(
    plantilla?.items?.length ? plantilla.items : [{ name: "", detail: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const editarItem = (i: number, patch: Partial<ItemPlantilla>) =>
    setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setPendiente(true);
    try {
      const r = await guardarPlantilla({
        id: plantilla?.id,
        name: nombre,
        description: descripcion,
        area,
        items,
      });
      if (r.ok) onCerrar();
      else setError(r.error);
    } finally {
      setPendiente(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void enviar(e)}
      className="rounded-2xl border-2 border-line bg-primary-soft/40 p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-ink">
        {plantilla ? `Editar ${plantilla.name}` : "Nueva plantilla"}
      </h2>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="pl-nombre" className="text-sm font-medium text-ink">
              Nombre
            </label>
            <input
              id="pl-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Post-operatorio de abdominoplastia · primera semana"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="pl-area" className="text-sm font-medium text-ink">
              Área
            </label>
            <select
              id="pl-area"
              value={area}
              onChange={(e) => setArea(e.target.value as Area)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2"
            >
              {AREAS.filter((a) => areasPermitidas.includes(a.v)).map((a) => (
                <option key={a.v} value={a.v}>
                  {a.t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="pl-desc" className="text-sm font-medium text-ink">
            Para qué la usás
          </label>
          <input
            id="pl-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Pautas domiciliarias para las dos primeras semanas."
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2"
          />
        </div>

        <div>
          <span className="text-sm font-medium text-ink">Indicaciones</span>
          <p className="mt-0.5 text-xs text-muted">
            Un renglón por ejercicio o pauta. El detalle es lo que lee tu paciente
            en su portal: escribilo como se lo dirías.
          </p>

          <ul className="mt-3 space-y-3">
            {items.map((it, i) => (
              <li key={i} className="rounded-lg bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <input
                    aria-label={`Nombre de la indicación ${i + 1}`}
                    value={it.name}
                    onChange={(e) => editarItem(i, { name: e.target.value })}
                    placeholder="Bombeo de tobillos"
                    className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, k) => k !== i))}
                    aria-label={`Quitar la indicación ${i + 1}`}
                    className="rounded-lg px-2 py-1 text-sm text-muted hover:text-coral-ink"
                  >
                    Quitar
                  </button>
                </div>
                <textarea
                  aria-label={`Detalle de la indicación ${i + 1}`}
                  value={it.detail}
                  onChange={(e) => editarItem(i, { detail: e.target.value })}
                  rows={2}
                  placeholder="Sentada o acostada, flexioná y extendé los pies 2 min, 3 veces al día."
                  className="mt-2 w-full resize-y rounded-lg border border-line px-3 py-2 text-sm"
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setItems([...items, { name: "", detail: "" }])}
            className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-teal"
          >
            + Agregar indicación
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral-ink">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendiente ? "Guardando…" : "Guardar plantilla"}
          </button>
        </div>
      </div>
    </form>
  );
}
