import "server-only";
import { decryptSecret } from "@/lib/crypto";

/**
 * VitaeGest · Adaptador de Mercado Pago (Checkout Pro) — ETAPA 2.
 *
 * Modelo: cada profesional cobra en SU cuenta de Mercado Pago. VitaeGest no
 * toca la plata ni cobra comisión; solo crea la preferencia con el token de
 * ella y escucha el webhook para marcar la seña como pagada.
 *
 * Está listo pero APAGADO: mientras `payment_settings.mp_checkout_enabled` sea
 * false para todas, este archivo no se ejecuta nunca. Para encenderlo, la
 * profesional pega su Access Token en Configuración → Cobros.
 *
 * Dónde sacar el token (ella, en su propia cuenta):
 *   mercadopago.com.ar/developers → Tus integraciones → Crear aplicación
 *   → Credenciales de producción → Access Token (empieza con APP_USR-)
 */

const API = "https://api.mercadopago.com";

export type MpPreference = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

export type MpPayment = {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded";
  status_detail: string;
  transaction_amount: number;
  external_reference: string | null;
  payment_method_id: string;
  date_approved: string | null;
};

function tokenFrom(encrypted: string | null | undefined): string {
  if (!encrypted) throw new Error("Esta profesional no tiene Mercado Pago conectado.");
  return decryptSecret(encrypted);
}

async function mpFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (body as { message?: string })?.message ?? res.statusText;
    throw new Error(`Mercado Pago respondió ${res.status}: ${detail}`);
  }
  return body as T;
}

/**
 * Crea la preferencia de pago de una seña.
 * `external_reference` lleva el id del turno: es lo que después nos deja
 * conciliar el webhook con la reserva correcta.
 */
export async function createDepositPreference(opts: {
  encryptedToken: string | null;
  appointmentId: string;
  amount: number;
  patientName: string;
  patientEmail?: string | null;
  professionalName: string;
  baseUrl: string;
  expiresAt?: string | null;
}): Promise<MpPreference> {
  const token = tokenFrom(opts.encryptedToken);

  return mpFetch<MpPreference>("/checkout/preferences", token, {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: opts.appointmentId,
          title: `Seña de turno · ${opts.professionalName}`,
          description: `Reserva de ${opts.patientName}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(opts.amount),
        },
      ],
      payer: opts.patientEmail ? { email: opts.patientEmail } : undefined,
      external_reference: opts.appointmentId,
      back_urls: {
        success: `${opts.baseUrl}/reserva/${opts.appointmentId}?pago=ok`,
        pending: `${opts.baseUrl}/reserva/${opts.appointmentId}?pago=pendiente`,
        failure: `${opts.baseUrl}/reserva/${opts.appointmentId}?pago=error`,
      },
      auto_return: "approved",
      notification_url: `${opts.baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: "VITAEGEST",
      // La preferencia no puede sobrevivir a la seña.
      expires: Boolean(opts.expiresAt),
      expiration_date_to: opts.expiresAt ?? undefined,
      // Una seña no se paga en cuotas.
      payment_methods: { installments: 1 },
    }),
  });
}

/** Trae un pago por id para verificarlo contra la API (nunca confiar en el webhook solo). */
export async function getPayment(
  encryptedToken: string | null,
  paymentId: string | number,
): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`, tokenFrom(encryptedToken));
}

/** Chequeo rápido de que el token sirve, para el botón "Probar conexión". */
export async function testCredentials(encryptedToken: string | null): Promise<{ ok: boolean; detail: string }> {
  try {
    const me = await mpFetch<{ id: number; nickname?: string }>(
      "/users/me",
      tokenFrom(encryptedToken),
    );
    return { ok: true, detail: `Conectado como ${me.nickname ?? me.id}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "No se pudo verificar" };
  }
}
