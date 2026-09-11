import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import type { AppointmentStatus, SpecialtyArea } from "@/types/agenda";
import { TZ, dateKeyInTZ } from "./tz";

export const AREA_LABELS: Record<SpecialtyArea, string> = {
  general: "General",
  pelvic_perineal: "Uroginecología",
  dermatofunctional: "Dermatofuncional",
  sports: "Deportiva",
  respiratory: "Respiratoria",
  neuro: "Neuro",
  other: "Otra",
};

export const STATUS_META: Record<AppointmentStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "Pendiente", bg: "var(--amber-soft)", fg: "var(--amber)" },
  confirmed: { label: "Confirmado", bg: "var(--primary-soft)", fg: "var(--primary-ink)" },
  attended: { label: "Atendido", bg: "var(--emerald-soft)", fg: "var(--emerald-ink)" },
  no_show: { label: "Ausente", bg: "var(--coral-soft)", fg: "var(--coral-ink)" },
  cancelled: { label: "Cancelado", bg: "var(--rose-soft)", fg: "var(--rose)" },
};

export const STATUS_ORDER: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "attended",
  "no_show",
  "cancelled",
];

export const AREA_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pelvic_perineal", label: "Uroginecología" },
  { key: "dermatofunctional", label: "Dermatofuncional" },
  { key: "sports", label: "Deportiva" },
  { key: "respiratory", label: "Respiratoria" },
];

export const AREA_OPTIONS: { key: SpecialtyArea; label: string }[] = [
  { key: "pelvic_perineal", label: "Uroginecología" },
  { key: "dermatofunctional", label: "Dermatofuncional" },
  { key: "sports", label: "Deportiva" },
  { key: "respiratory", label: "Respiratoria" },
  { key: "general", label: "General" },
];

// --- Helpers de fecha (clave yyyy-mm-dd en horario Argentina) ---
// Clave del día en ART, sin importar el TZ del runtime/navegador.
export const toDateKey = (d: Date) => dateKeyInTZ(d);

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Lunes a sábado de la semana que contiene `ref`.
export function weekDays(ref: Date): Date[] {
  const dow = ref.getDay(); // 0 dom .. 6 sáb
  const offsetToMonday = (dow + 6) % 7;
  const monday = addDays(ref, -offsetToMonday);
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtDayChip = (d: Date) => cap(formatInTimeZone(d, TZ, "EEE d", { locale: es }));

export const fmtLongDate = (d: Date) =>
  cap(formatInTimeZone(d, TZ, "EEEE d 'de' MMMM", { locale: es }));

export const fmtTime = (iso: string) => formatInTimeZone(new Date(iso), TZ, "HH:mm");

// --- Recordatorios por WhatsApp (envío manual) ---

// Plantilla por defecto si el profesional aún no guardó una en Configuración.
export const DEFAULT_REMINDER_TEMPLATE =
  "Hola {paciente}, te recordamos tu turno el {fecha} a las {hora} hs. ¡Te esperamos! 🙌";

// Reemplaza {variables} de la plantilla por sus valores.
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return (tpl || "").replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);
}

// Arma el link de WhatsApp (wa.me). Normaliza el teléfono a solo dígitos y
// antepone el código de Argentina (54) si no lo trae. Devuelve null si no hay
// teléfono cargado.
export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("54")) d = "54" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

// Fecha larga para el cuerpo del mensaje (ej: "lunes 8 de septiembre"), en ART.
export const fmtReminderDate = (iso: string) =>
  cap(formatInTimeZone(new Date(iso), TZ, "EEEE d 'de' MMMM", { locale: es }));
