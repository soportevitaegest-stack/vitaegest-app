"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para Componentes de Cliente ("use client").
// La multitenancy la resuelve RLS con auth.uid(); nunca filtramos por
// professional_id a mano.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
