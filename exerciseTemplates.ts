"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions de las plantillas de ejercicios y pautas.
 *
 * Reglas que vienen de la migración 0011 y del RLS:
 *  · Las plantillas de SISTEMA tienen `professional_id = null`. Todas las
 *    profesionales las leen, ninguna las puede editar ni borrar.
 *  · Las propias tienen `professional_id = auth.uid()`. Solo las ve y las
 *    toca su dueña.
 *  · Por eso "editar" una de sistema en realidad es DUPLICARLA: se crea una
 *    copia propia y se edita esa. El original queda intacto para todas.
 *
 * NOTA: si tu helper de Supabase no se llama `createClient`, cambiá el import.
 */

export type Area = "general" | "pelvic_perineal" | "dermatofunctional";

export type ItemPlantilla = { name: string; detail: string };

export type Plantilla = {
  id: string;
  professional_id: string | null;
  area: Area;
  name: string;
  description: string | null;
  items: ItemPlantilla[];
  is_system: boolean;
  is_active: boolean;
};

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "No se pudo completar la operación";
  return { ok: false, error: msg };
}

/** Deja los ítems limpios: sin vacíos, sin espacios de más, con tope de largo. */
function normalizarItems(items: ItemPlantilla[]): ItemPlantilla[] {
  return items
    .map((i) => ({ name: (i.name ?? "").trim(), detail: (i.detail ?? "").trim() }))
    .filter((i) => i.name.length > 0)
    .slice(0, 40);
}

/* ── Lectura ──────────────────────────────────────────────────────────────── */

export async function listarPlantillas(): Promise<Result<Plantilla[]>> {
  try {
    const supabase = await createClient();
    // Select en una sola línea literal: concatenado, el cliente sin tipar
    // devuelve GenericStringError y TypeScript rompe el build.
    const { data, error } = await supabase
      .from("exercise_templates")
      .select("id, professional_id, area, name, description, items, is_system, is_active")
      .eq("is_active", true)
      .order("is_system", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data ?? []) as unknown as Plantilla[] };
  } catch (e) {
    return fail(e);
  }
}

/* ── Escritura ────────────────────────────────────────────────────────────── */

export async function guardarPlantilla(input: {
  id?: string;
  name: string;
  description?: string;
  area: Area;
  items: ItemPlantilla[];
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };

    const name = input.name.trim();
    if (name.length < 2) return { ok: false, error: "Poné un nombre para la plantilla." };

    const items = normalizarItems(input.items);
    if (items.length === 0)
      return { ok: false, error: "Agregá al menos un ejercicio o indicación." };

    const fila = {
      professional_id: auth.user.id,
      area: input.area,
      name,
      description: input.description?.trim() || null,
      items,
      is_system: false,
    };

    if (input.id) {
      // El RLS impide tocar una de sistema, pero lo chequeamos antes para
      // poder dar un mensaje que se entienda en vez de un error crudo.
      const { data: previa, error: eLectura } = await supabase
        .from("exercise_templates")
        .select("id, is_system")
        .eq("id", input.id)
        .single();
      if (eLectura) throw eLectura;

      if ((previa as unknown as { is_system: boolean })?.is_system)
        return {
          ok: false,
          error:
            "Las plantillas que vienen con el sistema no se editan. Usá \"Copiar y editar\" para hacerte una propia.",
        };

      const { error } = await supabase
        .from("exercise_templates")
        .update(fila)
        .eq("id", input.id);
      if (error) throw error;

      revalidatePath("/plantillas");
      return { ok: true, data: { id: input.id } };
    }

    const { data, error } = await supabase
      .from("exercise_templates")
      .insert(fila)
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/plantillas");
    return { ok: true, data: data as unknown as { id: string } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Duplica una plantilla (de sistema o propia) como plantilla propia.
 * Es el camino para "editar" una de sistema sin romperla para las demás.
 */
export async function duplicarPlantilla(id: string): Promise<Result<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };

    const { data: origen, error: e1 } = await supabase
      .from("exercise_templates")
      .select("id, professional_id, area, name, description, items, is_system, is_active")
      .eq("id", id)
      .single();
    if (e1) throw e1;

    const p = origen as unknown as Plantilla;

    const { data, error } = await supabase
      .from("exercise_templates")
      .insert({
        professional_id: auth.user.id,
        area: p.area,
        name: `${p.name} (mi versión)`.slice(0, 120),
        description: p.description,
        items: p.items,
        is_system: false,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/plantillas");
    return { ok: true, data: data as unknown as { id: string } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Baja lógica, no borrado: si alguna rutina de paciente se armó a partir de
 * esta plantilla, no queremos perder el rastro de dónde salió.
 */
export async function archivarPlantilla(id: string): Promise<Result> {
  try {
    const supabase = await createClient();

    const { data: previa, error: e1 } = await supabase
      .from("exercise_templates")
      .select("id, is_system")
      .eq("id", id)
      .single();
    if (e1) throw e1;

    if ((previa as unknown as { is_system: boolean })?.is_system)
      return { ok: false, error: "Las plantillas del sistema no se pueden archivar." };

    const { error } = await supabase
      .from("exercise_templates")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/plantillas");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Guarda la rutina que ya tiene cargada un paciente como plantilla propia.
 * Es el botón que va en la ficha: se arma la rutina una vez y queda para
 * todas las pacientes que vengan.
 */
export async function guardarRutinaComoPlantilla(input: {
  name: string;
  area: Area;
  description?: string;
  items: ItemPlantilla[];
}): Promise<Result<{ id: string }>> {
  return guardarPlantilla({ ...input });
}
