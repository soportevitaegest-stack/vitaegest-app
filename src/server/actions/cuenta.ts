"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Acciones de la cuenta del profesional: cerrar sesión.
 *
 * El signOut va en el SERVIDOR a propósito. Con @supabase/ssr la sesión vive en
 * cookies httpOnly que el navegador no puede borrar solo: si lo hacés desde el
 * cliente, la cookie sobrevive y el middleware te vuelve a dejar entrar.
 *
 * NOTA: si tu helper de Supabase no se llama `createClient`, ajustá el import.
 */

/** Cierra la sesión en ESTE dispositivo y manda al login. */
export async function cerrarSesion() {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Cierra la sesión en TODOS los dispositivos (revoca todos los refresh tokens).
 * Útil si alguien perdió el celular o sospecha que le entraron a la cuenta.
 */
export async function cerrarTodasLasSesiones() {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/login?motivo=sesiones-cerradas");
}
