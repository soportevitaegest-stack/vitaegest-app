// Items de navegación del área privada (dashboard).
// Fuente única para el Sidebar; cada módulo se irá conectando a su ruta.
export type NavItem = { href: string; label: string; icon: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/agenda", label: "Agenda / Turnos", icon: "calendar" },
  { href: "/pacientes", label: "Mis Pacientes", icon: "users" },
  { href: "/facturacion", label: "Facturación", icon: "bill" },
  { href: "/configuracion", label: "Configuración", icon: "gear" },
  // NUEVO INJERTO: El botón para manejar múltiples consultorios
  { href: "/configuracion/agenda", label: "Horarios y Sedes", icon: "calendar" },
];
