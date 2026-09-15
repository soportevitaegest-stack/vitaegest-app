/**
 * VitaeGest · Seña de reserva — tipos y helpers compartidos.
 * Sin dependencias de React ni de Supabase: se usa en servidor y en cliente.
 */

export type DepositStatus = "none" | "pending" | "paid" | "waived" | "expired";

export type PaymentMethod = "cash" | "transfer" | "mercadopago" | "card" | "other";

/** Datos de cobro que SÍ puede ver la paciente (los devuelve public_booking_info). */
export type PublicPaymentInfo = {
  transfer_enabled?: boolean;
  bank_alias?: string | null;
  bank_cbu?: string | null;
  bank_holder?: string | null;
  bank_name?: string | null;
  bank_doc?: string | null;
  mp_link_enabled?: boolean;
  mp_link?: string | null;
  mp_checkout_enabled?: boolean;
  instructions?: string | null;
};

export type DepositConfig = {
  enabled: boolean;
  amount: number;
  hold_hours: number;
  note: string | null;
};

export type BookingInfo = {
  professional: { full_name: string; clinic_name: string | null; timezone: string };
  booking_enabled: boolean;
  booking_horizon_days: number;
  slot_minutes: number;
  deposit: DepositConfig;
  payment: PublicPaymentInfo;
};

/** Lo que devuelve public_request_appointment después de reservar. */
export type BookingResult = {
  ok: boolean;
  portal_token: string;
  appointment_id: string;
  deposit: { required: boolean; amount: number; due_at: string | null; note: string | null };
  payment: PublicPaymentInfo;
};

export const DEPOSIT_LABEL: Record<DepositStatus, string> = {
  none: "Sin seña",
  pending: "Seña pendiente",
  paid: "Seña cobrada",
  waived: "Seña eximida",
  expired: "Seña vencida",
};

/** Colores de la paleta de marca, por estado. Mismos tokens que el resto del panel. */
export const DEPOSIT_TONE: Record<DepositStatus, string> = {
  none: "bg-slate-100 text-ink-soft",
  pending: "bg-coral-soft text-coral-dark",
  paid: "bg-teal-soft text-primary-700",
  waived: "bg-primary-50 text-primary",
  expired: "bg-slate-100 text-ink-faint line-through",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  card: "Tarjeta",
  other: "Otro",
};

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatARS = (n: number | string | null | undefined) =>
  ARS.format(Number(n ?? 0));

/** "vence en 6 h" / "vence mañana 14:30" / "vencida". */
export function depositDeadlineText(dueAt: string | null): string {
  if (!dueAt) return "";
  const due = new Date(dueAt);
  const diffMs = due.getTime() - Date.now();
  if (diffMs <= 0) return "vencida";
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return `vence en ${Math.max(1, Math.round(diffMs / 60_000))} minutos`;
  if (hours < 24) return `vence en ${hours} ${hours === 1 ? "hora" : "horas"}`;
  return `vence el ${due.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  })} a las ${due.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** ¿Hay al menos una forma de pagar configurada? Si no, no tiene sentido pedir seña. */
export function hasPaymentChannel(p: PublicPaymentInfo | null | undefined): boolean {
  if (!p) return false;
  const transfer = Boolean(p.transfer_enabled && (p.bank_alias || p.bank_cbu));
  const link = Boolean(p.mp_link_enabled && p.mp_link);
  return transfer || link || Boolean(p.mp_checkout_enabled);
}

/** Texto para mandar por WhatsApp a la paciente con los datos de pago. */
export function depositWhatsAppText(opts: {
  patientFirstName: string;
  amount: number;
  dueAt: string | null;
  payment: PublicPaymentInfo;
  clinicName?: string | null;
}): string {
  const { patientFirstName, amount, dueAt, payment, clinicName } = opts;
  const lines = [
    `Hola ${patientFirstName}! Te reservo el turno${clinicName ? ` en ${clinicName}` : ""}.`,
    ``,
    `Para confirmarlo necesito la seña de ${formatARS(amount)}${
      dueAt ? ` (${depositDeadlineText(dueAt)})` : ""
    }.`,
  ];
  if (payment.transfer_enabled && (payment.bank_alias || payment.bank_cbu)) {
    lines.push(``, `Transferencia:`);
    if (payment.bank_alias) lines.push(`Alias: ${payment.bank_alias}`);
    if (payment.bank_cbu) lines.push(`CBU: ${payment.bank_cbu}`);
    if (payment.bank_holder) lines.push(`Titular: ${payment.bank_holder}`);
    if (payment.bank_name) lines.push(`Banco: ${payment.bank_name}`);
  }
  if (payment.mp_link_enabled && payment.mp_link) {
    lines.push(``, `O por Mercado Pago: ${payment.mp_link}`);
  }
  lines.push(``, `Cuando la hagas, mandame el comprobante y te confirmo.`);
  return lines.join("\n");
}
