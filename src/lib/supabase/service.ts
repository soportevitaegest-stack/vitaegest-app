import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: SALTEA EL RLS.
 *
 * Solo para Route Handlers donde no hay sesión de usuario y hace falta escribir
 * igual — hoy: el webhook de Mercado Pago y la creación de la preferencia de
 * pago, que los dispara la paciente sin estar logueada.
 *
 * Reglas:
 *   · Nunca importar este archivo desde un componente cliente.
 *   · Nunca desde un Server Component que renderiza datos del usuario: para eso
 *     está el cliente autenticado, que respeta el RLS.
 *   · Siempre filtrar a mano por el id que corresponda: acá no hay red de
 *     seguridad automática.
 *
 * SUPABASE_SERVICE_ROLE_KEY va en Vercel como variable de entorno del servidor
 * (sin el prefijo NEXT_PUBLIC_, o se filtraría al navegador).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
