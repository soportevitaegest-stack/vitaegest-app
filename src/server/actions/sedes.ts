"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarSemana, type Bloque, type Sede } from "@/lib/agenda";

/**
 * Server Actions de sedes y horarios.
 *
 * Todas usan el cliente autenticado: el RLS de `locations` y `schedule_blocks`
 * ya impide tocar datos de otra profesional, así que acá no se filtra por
 * professional_id salvo donde hace falta para escribir.
 *
 * NOTA: si tu helper de Supabase no se llama `createClient`, cambiá el import.
 */

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "No se pudo completar la operación";
  return { ok: false, error: msg };
}

async function uid(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ══════════════════════════════════════════════════════════════════════════
   SEDES
   ══════════════════════════════════════════════════════════════════════════ */

export async function listarSedes(): Promise<Result<Sede[]>> {
  try {
    const supabase = createClient();
    // Select en una sola línea literal: si se arma concatenando, el cliente
    // sin tipar no infiere y TypeScript devuelve GenericStringError.
    const { data, error } = await supabase
      .from("locations")
      .select("id, professional_id, name, address, notes, phone, color, is_active, is_default, sort")
      .order("is_default", { ascending: false })
      .order("sort", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data ?? []) as unknown as Sede[] };
  } catch (e) {
    return fail(e);
  }
}

export async function guardarSede(input: {
  id?: string;
  name: string;
  address?: string;
  notes?: string;
  phone?: string;
  color?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const professional_id = await uid();
    if (!professional_id) return { ok: false, error: "Sesión vencida" };

    const name = input.name.trim();
    if (name.length < 1 || name.length > 80)
      return { ok: false, error: "Poné un nombre de entre 1 y 80 caracteres." };

    const color = (input.color ?? "#1ABC9C").trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(color))
      return { ok: false, error: "El color tiene que ser un hexadecimal tipo #1ABC9C." };

    const supabase = createClient();
    const fila = {
      professional_id,
      name,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      phone: input.phone?.trim() || null,
      color,
    };

    if (input.id) {
      const { error } = await supabase.from("locations").update(fila).eq("id", input.id);
      if (error) throw error;
      revalidatePath("/configuracion/agenda");
      return { ok: true, data: { id: input.id } };
    }

    const { data, error } = await supabase
      .from("locations")
      .insert(fila)
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation. El índice es sobre (professional_id, lower(name)).
      if ((error as { code?: string }).code === "23505")
        return { ok: false, error: "Ya tenés un lugar de atención con ese nombre." };
      throw error;
    }

    revalidatePath("/configuracion/agenda");
    return { ok: true, data: data as unknown as { id: string } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * No se borra: se desactiva. Los turnos históricos siguen apuntando a la sede
 * y la agenda necesita poder mostrar dónde fue cada uno.
 */
export async function desactivarSede(id: string): Promise<Result> {
  try {
    const supabase = createClient();

    const { data: sede, error: e1 } = await supabase
      .from("locations")
      .select("id, is_default")
      .eq("id", id)
      .single();
    if (e1) throw e1;

    if ((sede as unknown as { is_default: boolean })?.is_default)
      return {
        ok: false,
        error: "Es tu lugar principal. Marcá otro como principal antes de darlo de baja.",
      };

    const { error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;

    // Los tramos de esa sede dejan de ofrecerse.
    await supabase.from("schedule_blocks").update({ is_active: false }).eq("location_id", id);

    revalidatePath("/configuracion/agenda");
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function marcarSedePrincipal(id: string): Promise<Result> {
  try {
    const professional_id = await uid();
    if (!professional_id) return { ok: false, error: "Sesión vencida" };

    const supabase = createClient();
    // El índice único parcial permite una sola principal: primero se limpia.
    const { error: e1 } = await supabase
      .from("locations")
      .update({ is_default: false })
      .eq("professional_id", professional_id)
      .eq("is_default", true);
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from("locations")
      .update({ is_default: true })
      .eq("id", id);
    if (e2) throw e2;

    revalidatePath("/configuracion/agenda");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   HORARIOS POR DÍA
   ══════════════════════════════════════════════════════════════════════════ */

export async function listarBloques(): Promise<Result<Bloque[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("id, location_id, weekday, start_time, end_time, slot_minutes, max_per_slot, is_active")
      .eq("is_active", true)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data ?? []) as unknown as Bloque[] };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Guarda la semana completa de una vez. Reemplaza todo: lo que no venga en la
 * lista, se borra. Es deliberado — el formulario edita la semana entera, y así
 * no quedan tramos huérfanos de una edición anterior.
 */
export async function guardarSemana(bloques: Bloque[]): Promise<Result<{ blocks: number }>> {
  try {
    if (!(await uid())) return { ok: false, error: "Sesión vencida" };

    const problema = validarSemana(bloques);
    if (problema) return { ok: false, error: problema };

    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_schedule_blocks", {
      p_blocks: bloques.map((b) => ({
        weekday: b.weekday,
        start: b.start_time,
        end: b.end_time,
        location_id: b.location_id ?? null,
        slot_minutes: b.slot_minutes ?? null,
        max_per_slot: b.max_per_slot ?? null,
      })),
    });

    if (error) throw error;

    revalidatePath("/configuracion/agenda");
    revalidatePath("/agenda");
    return { ok: true, data: data as unknown as { blocks: number } };
  } catch (e) {
    return fail(e);
  }
}
