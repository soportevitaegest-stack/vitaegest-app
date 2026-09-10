import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

// Layout del área privada: verifica sesión (además del middleware) y monta el
// shell Sidebar + contenido. La multitenancy la aplica RLS con auth.uid();
// acá solo leemos el perfil para mostrar nombre/matrícula.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("professionals")
    .select("full_name, license_number")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen w-full flex text-ink">
      <Sidebar
        professionalName={profile?.full_name ?? "Profesional"}
        license={profile?.license_number ?? ""}
      />
      <div className="flex-1 min-w-0 flex flex-col h-screen">{children}</div>
    </div>
  );
}
