import { createClient } from "@supabase/supabase-js";

// Cliente para el PORTAL DEL PACIENTE (ruta pública /p/<token>).
// Usa el rol `anon` y llama SOLO a las funciones SECURITY DEFINER del portal,
// que resuelven el token internamente y aíslan por profesional. Nunca toca
// tablas directamente (RLS las protege). Sin sesión ni cookies.
export function createPortalClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
