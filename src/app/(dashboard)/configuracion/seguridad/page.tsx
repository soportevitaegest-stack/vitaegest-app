import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CambiarPassword } from "@/components/config/CambiarPassword";

export const metadata: Metadata = { title: "Seguridad · VitaeGest" };

export default async function SeguridadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Seguridad</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          Tu contraseña y tus sesiones abiertas.
        </p>
      </header>

      <CambiarPassword email={user.email} />
    </div>
  );
}
