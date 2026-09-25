"use client";

import { useState } from "react";
import {
  guardarRutinaComoPlantilla,
  type Area,
  type ItemPlantilla,
} from "@/server/actions/exerciseTemplates";

/**
 * Botón "Guardar como plantilla", para poner en la ficha del paciente,
 * al lado del gestor de ejercicios.
 *
 * Es el atajo que más tiempo ahorra: armás la rutina una vez, con la paciente
 * adelante, y queda guardada para todas las que vengan con lo mismo.
 *
 * Es independiente de tu `ExerciseManager`: solo necesita los ítems que ya
 * tenés en pantalla. Pasale lo que tengas en el estado del gestor.
 */
export function GuardarComoPlantilla({
  items,
  areaSugerida = "general",
  nombreSugerido = "",
}: {
  items: ItemPlantilla[];
  areaSugerida?: Area;
  nombreSugerido?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(nombreSugerido);
  const [area, setArea] = useState<Area>(areaSugerida);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const utiles = items.filter((i) => (i.name ?? "").trim().length > 0);

  if (utiles.length === 0) return null;

  /* useState y no useTransition: en React 18 el `isPending` de una transición
     se apaga en el primer await, así que el botón dejaría de decir "Guardando"
     mientras todavía está guardando. */
  const guardar = async () => {
    setPendiente(true);
    try {
      const r = await guardarRutinaComoPlantilla({
        name: nombre,
        area,
        items: utiles,
      });
      if (r.ok) {
        setMensaje("Guardada. Ya te aparece en Plantillas.");
        setError(null);
        setAbierto(false);
      } else {
        setError(r.error);
      }
    } finally {
      setPendiente(false);
    }
  };

  if (mensaje) {
    return (
      <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary-ink">
        {mensaje}
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-teal"
      >
        Guardar como plantilla
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-sm font-medium text-ink">
        Guardar estas {utiles.length} indicaciones como plantilla
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <input
          aria-label="Nombre de la plantilla"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Post-operatorio · primera semana"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <select
          aria-label="Área de la plantilla"
          value={area}
          onChange={(e) => setArea(e.target.value as Area)}
          className="rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="general">General</option>
          <option value="pelvic_perineal">Uroginecología</option>
          <option value="dermatofunctional">Dermatofuncional</option>
        </select>
      </div>

      {error && <p className="mt-2 text-sm text-coral-ink">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={pendiente || nombre.trim().length < 2}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
