import type { Patient, TreatmentOrder } from "@/types/domain";

export const fullName = (p: Pick<Patient, "first_name" | "last_name">) =>
  `${p.first_name} ${p.last_name}`.trim();

export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Edad a partir de la fecha de nacimiento (o '—' si no hay dato).
export function ageFrom(birthDate: string | null): string {
  if (!birthDate) return "—";
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return `${age}`;
}

export const fmtMoney = (n: number) => "$" + Number(n).toLocaleString("es-AR");

// Bono activo con sesiones restantes (o el activo aunque esté agotado).
export function activeOrder(orders?: TreatmentOrder[]): TreatmentOrder | undefined {
  if (!orders?.length) return undefined;
  return (
    orders.find((o) => o.status === "active" && o.total_sessions - o.used_sessions > 0) ||
    orders.find((o) => o.status === "active")
  );
}
