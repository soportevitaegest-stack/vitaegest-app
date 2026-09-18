/**
 * Tipos y helpers de sedes y horarios.
 * Sin dependencias: lo puede importar tanto el servidor como el cliente.
 */

export type Sede = {
  id: string;
  professional_id: string;
  name: string;
  address: string | null;
  notes: string | null;
  phone: string | null;
  color: string;
  is_active: boolean;
  is_default: boolean;
  sort: number;
};

export type Bloque = {
  id?: string;
  location_id: string | null;
  weekday: number; // ISO: 1 = lunes … 7 = domingo
  start_time: string; // "09:00"
  end_time: string; // "13:00"
  slot_minutes: number | null;
  max_per_slot: number | null;
  is_active?: boolean;
};

/** ISO 8601: la semana arranca el lunes, como la agenda. */
export const DIAS = [
  { n: 1, corto: "Lun", largo: "Lunes" },
  { n: 2, corto: "Mar", largo: "Martes" },
  { n: 3, corto: "Mié", largo: "Miércoles" },
  { n: 4, corto: "Jue", largo: "Jueves" },
  { n: 5, corto: "Vie", largo: "Viernes" },
  { n: 6, corto: "Sáb", largo: "Sábado" },
  { n: 7, corto: "Dom", largo: "Domingo" },
] as const;

export const COLORES_SEDE = [
  "#1ABC9C", // teal de marca
  "#E8705F", // coral de marca
  "#117864", // verde profundo
  "#5B8DEF",
  "#B07CD6",
  "#E0A03A",
] as const;

/** "09:00:00" y "09:00" entran igual; sale siempre "09:00". */
export const hhmm = (t: string) => t.slice(0, 5);

/** Minutos desde medianoche. Sirve para ordenar y comparar. */
export const aMinutos = (t: string) => {
  const [h, m] = hhmm(t).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Valida una semana entera antes de mandarla al servidor.
 * Devuelve el primer problema en castellano, o null si está bien.
 *
 * Las mismas reglas las revalida Postgres: esto es para avisar antes,
 * no para reemplazar la validación de verdad.
 */
export function validarSemana(bloques: Bloque[]): string | null {
  for (const b of bloques) {
    if (aMinutos(b.end_time) <= aMinutos(b.start_time)) {
      const dia = DIAS.find((d) => d.n === b.weekday)?.largo ?? "ese día";
      return `El horario de ${dia} termina antes de empezar.`;
    }
  }

  // Por día: ningún tramo puede pisar a otro, ni siquiera de otra sede.
  for (const dia of DIAS) {
    const delDia = bloques
      .filter((b) => b.weekday === dia.n)
      .sort((a, b) => aMinutos(a.start_time) - aMinutos(b.start_time));

    for (let i = 1; i < delDia.length; i++) {
      if (aMinutos(delDia[i].start_time) < aMinutos(delDia[i - 1].end_time)) {
        return `El ${dia.largo} tenés dos horarios que se pisan. No podés atender en dos lugares a la vez.`;
      }
    }
  }

  return null;
}

/** Cuántos turnos entran en un tramo, para mostrarlo mientras configura. */
export function turnosDelTramo(b: Bloque, duracionPorDefecto: number): number {
  const dur = b.slot_minutes ?? duracionPorDefecto;
  if (dur <= 0) return 0;
  return Math.floor((aMinutos(b.end_time) - aMinutos(b.start_time)) / dur);
}

/** Resumen legible de la semana, para el encabezado de Configuración. */
export function resumenSemana(bloques: Bloque[], sedes: Sede[]): string {
  const activos = bloques.filter((b) => b.is_active !== false);
  if (activos.length === 0) return "Sin horarios cargados";

  const porDia = DIAS.filter((d) => activos.some((b) => b.weekday === d.n));
  const sedesUsadas = new Set(activos.map((b) => b.location_id).filter(Boolean));

  const dias =
    porDia.length === 7
      ? "todos los días"
      : porDia.map((d) => d.corto).join(", ");

  if (sedesUsadas.size > 1) {
    return `${dias} · ${sedesUsadas.size} lugares de atención`;
  }
  const unica = sedes.find((s) => s.id === [...sedesUsadas][0]);
  return unica ? `${dias} · ${unica.name}` : dias;
}
