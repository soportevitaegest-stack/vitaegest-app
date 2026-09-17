"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { createClient } from "@/lib/supabase/client";

// Encabezado superior del área privada. El título lo define cada página vía props.
export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [datosUsuario, setDatosUsuario] = useState({ nombre: "", email: "", consultorio: "" });

  useEffect(() => {
    const cargarUsuario = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: prof } = await supabase
          .from("professionals")
          .select("full_name, clinic_name")
          .eq("id", user.id)
          .single();

        setDatosUsuario({
          nombre: prof?.full_name ?? user.email ?? "",
          email: user.email ?? "",
          consultorio: prof?.clinic_name ?? ""
        });
      }
    };
    
    cargarUsuario();
  }, []);

  return (
    <header className="shrink-0 border-b border-line bg-surface px-5 md:px-7 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-extrabold text-lg md:text-xl leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu
          nombre={datosUsuario.nombre}
          email={datosUsuario.email}
          consultorio={datosUsuario.consultorio}
        />
      </div>
    </header>
  );
}
