/**
 * Un solo lugar donde vive el menú.
 *
 * Lo comparten el Sidebar de escritorio y el menú hamburguesa del celular. Si
 * agregás una sección nueva, la agregás acá y aparece en los dos — que es
 * justamente el bug que evita: que el celular quede con un menú viejo.
 */

export type NavItem = {
  href: string;
  label: string;
  icono: IconoNav;
  /**
   * Si está, el ítem solo se muestra a quien tenga alguna de esas especialidades.
   * Sin esta clave, lo ve todo el mundo.
   */
  areas?: Array<"pelvic_perineal" | "dermatofunctional">;
};

export type IconoNav =
  | "inicio"
  | "agenda"
  | "pacientes"
  | "plantillas"
  | "facturacion"
  | "exportar"
  | "configuracion";

export const NAV: NavItem[] = [
  { href: "/", label: "Inicio", icono: "inicio" },
  { href: "/agenda", label: "Agenda", icono: "agenda" },
  { href: "/pacientes", label: "Pacientes", icono: "pacientes" },
  { href: "/plantillas", label: "Plantillas", icono: "plantillas" },
  { href: "/facturacion", label: "Facturación", icono: "facturacion" },
  { href: "/exportar", label: "Exportar", icono: "exportar" },
  { href: "/configuracion", label: "Configuración", icono: "configuracion" },
  // NUEVO INJERTO: El acceso a la nueva pantalla de múltiples consultorios
  { href: "/configuracion/agenda", label: "Horarios y Sedes", icono: "agenda" }, 
];

/** Filtra el menú según las especialidades del profesional. */
export function navPara(specialties: string[] | null | undefined): NavItem[] {
  const propias = specialties ?? [];
  return NAV.filter(
    (i) => !i.areas || propias.length === 0 || i.areas.some((a) => propias.includes(a)),
  );
}

/**
 * ¿Este ítem es la sección actual?
 * "/" solo coincide exacto; el resto coincide con sus subrutas, así que
 * /pacientes/abc/editar deja "Pacientes" marcado.
 */
export function esActivo(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
