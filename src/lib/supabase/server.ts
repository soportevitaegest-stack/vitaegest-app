import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components y Server Actions.
// NEXT 14: cookies() es SÍNCRONO (en Next 15 pasó a ser async). Por eso NO se
// usa await acá. La multitenancy la resuelve RLS con auth.uid().
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Invocado desde un Server Component (solo lectura): lo maneja el middleware.
          }
        },
      },
    }
  );
}
