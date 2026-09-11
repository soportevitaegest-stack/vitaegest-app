// Manejo centralizado de zona horaria. TODA fecha se interpreta y se muestra
// en horario de Argentina (UTC-3), sin importar el TZ del runtime (Vercel = UTC)
// ni el del navegador. Guardamos en Supabase siempre en UTC (timestamptz).

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const TZ = "America/Argentina/Buenos_Aires";

// (fecha 'yyyy-MM-dd' + hora 'HH:mm', en horario ART) -> instante UTC (ISO).
// Ej: 2026-09-08 11:00 ART -> 2026-09-08T14:00:00.000Z
export function localToUtcISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  const utc = fromZonedTime(`${date}T${time}:00`, TZ);
  if (Number.isNaN(utc.getTime())) return null;
  return utc.toISOString();
}

// Suma minutos a un instante ISO (UTC) y devuelve ISO.
export function addMinutesISO(iso: string, mins: number): string {
  return new Date(new Date(iso).getTime() + mins * 60000).toISOString();
}

// Genera N fechas semanales ('yyyy-MM-dd') a partir de una base, conservando el
// mismo día de la semana. Aritmética de calendario pura (sin DST; Argentina es
// UTC-3 fijo, pero igual evitamos saltos de hora).
export function weeklyDates(baseDate: string, count: number): string[] {
  const [y, m, d] = baseDate.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + i * 7);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}

// Límites [inicio, fin) del día ART indicado, en UTC (para filtrar en Supabase).
export function dayRangeUtc(dateKey: string): { start: string; end: string } {
  const start = fromZonedTime(`${dateKey}T00:00:00`, TZ);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Clave de fecha ART ('yyyy-MM-dd') de un instante.
export function dateKeyInTZ(d: Date | string): string {
  return formatInTimeZone(typeof d === "string" ? new Date(d) : d, TZ, "yyyy-MM-dd");
}

// "Hoy" en ART, como 'yyyy-MM-dd'.
export function todayKey(): string {
  return dateKeyInTZ(new Date());
}

// Hora de reloj (ART) de un instante, en horas y minutos.
export function clockInTZ(iso: string): { h: number; m: number } {
  const h = Number(formatInTimeZone(new Date(iso), TZ, "H"));
  const m = Number(formatInTimeZone(new Date(iso), TZ, "m"));
  return { h, m };
}

// 'HH:mm' ART de un instante (para prellenar inputs type=time).
export function timeInputInTZ(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "HH:mm");
}
