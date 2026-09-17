"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Editar un paciente.
 *
 * Si ya tenés `src/server/actions/patients.ts`, podés mover `actualizarPaciente`
 * ahí adentro y borrar este archivo: no depende de nada propio.
 *
 * Seguridad: el RLS (`professional_id = auth.uid()`) es el que aísla. Por eso el
 * UPDATE no filtra por professional_id a mano — Postgres ya lo hace. Lo que SÍ
 * hacemos es pedir `.select()` de vuelta: si el id es de otra profesional, el
 * update afecta 0 filas y Supabase **no** devuelve error. Sin ese chequeo, la
 * pantalla diría "guardado" sin haber guardado nada.
 */

export type EstadoForm = {
  ok: boolean;
  error?: string;
  campos?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "" → null, y recorta espacios. Evita guardar cadenas vacías en columnas opcionales. */
const limpiar = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export async function actualizarPaciente(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, error: "Paciente inválido." };

  // ── Validación ──────────────────────────────────────────────────────────
  const campos: Record<string, string> = {};
  const nombre = limpiar(formData.get("first_name"));
  const apellido = limpiar(formData.get("last_name"));
  const email = limpiar(formData.get("email"));
  const nacimiento = limpiar(formData.get("birth_date"));

  if (!nombre) campos.first_name = "Poné el nombre.";
  if (!apellido) campos.last_name = "Poné el apellido.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) campos.email = "Ese email no parece válido.";

  if (nacimiento) {
    // <input type="date"> siempre manda YYYY-MM-DD. No lo pasamos por new Date():
    // la columna es DATE y convertirla a zona horaria la corre un día.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento)) {
      campos.birth_date = "Fecha inválida.";
    } else if (nacimiento > new Date().toISOString().slice(0, 10)) {
      campos.birth_date = "La fecha de nacimiento no puede ser futura.";
    }
  }

  if (Object.keys(campos).length > 0) {
    return { ok: false, error: "Revisá los campos marcados.", campos };
  }

  // ── Update ──────────────────────────────────────────────────────────────
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("patients")
      .update({
        first_name: nombre,
        last_name: apellido,
        document_id: limpiar(formData.get("document_id")),
        birth_date: nacimiento,
        sex: limpiar(formData.get("sex")),
        phone: limpiar(formData.get("phone")),
        email,
        address: limpiar(formData.get("address")),
        medical_history: limpiar(formData.get("medical_history")),
        allergies: limpiar(formData.get("allergies")),
        notes: limpiar(formData.get("notes")),
        is_active: formData.get("is_active") === "on",
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { ok: false, error: "Ese paciente no existe o no es tuyo." };

    revalidatePath(`/pacientes/${id}`);
    revalidatePath("/pacientes");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return {
      ok: false,
      error: msg.includes("duplicate")
        ? "Ya tenés otro paciente con esos datos."
        : "No pudimos guardar los cambios. Probá de nuevo.",
    };
  }

  // Fuera del try: redirect() funciona lanzando una excepción especial.
  // Si quedara adentro, el catch se la comería y el guardado parecería fallar.
  redirect(`/pacientes/${id}?guardado=1`);
}
