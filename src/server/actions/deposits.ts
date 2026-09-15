"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import type { PaymentMethod } from "@/lib/deposits";

/**
 * Server Actions de la seña de reserva.
 *
 * Todas usan el cliente autenticado de Supabase: el RLS ya impide tocar datos
 * de otra profesional, así que acá no hace falta filtrar por professional_id.
 *
 * NOTA: si tu helper de Supabase no se llama `createClient`, cambiá el import
 * de arriba por el que uses en el resto de src/server/actions/.
 */

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "No se pudo completar la operación";
  return { ok: false, error: msg };
}

/* ── Configuración de cobros ──────────────────────────────────────────────── */

export async function saveDepositConfig(input: {
  enabled: boolean;
  amount: number;
  holdHours: number;
  note: string;
}): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };

    if (input.enabled && input.amount <= 0)
      return { ok: false, error: "Poné un monto de seña mayor a cero." };
    if (input.holdHours < 1 || input.holdHours > 168)
      return { ok: false, error: "El plazo tiene que estar entre 1 y 168 horas." };

    const { error } = await supabase
      .from("schedule_settings")
      .update({
        deposit_enabled: input.enabled,
        deposit_amount: input.amount,
        deposit_hold_hours: input.holdHours,
        deposit_note: input.note.trim() || null,
      })
      .eq("professional_id", auth.user.id);

    if (error) throw error;
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function savePaymentSettings(input: {
  transferEnabled: boolean;
  bankAlias: string;
  bankCbu: string;
  bankHolder: string;
  bankName: string;
  bankDoc: string;
  mpLinkEnabled: boolean;
  mpLink: string;
  instructions: string;
}): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };

    if (input.mpLinkEnabled && input.mpLink && !/^https:\/\//i.test(input.mpLink.trim()))
      return { ok: false, error: "El link de Mercado Pago tiene que empezar con https://" };

    const clean = (s: string) => s.trim() || null;

    const { error } = await supabase.from("payment_settings").upsert(
      {
        professional_id: auth.user.id,
        transfer_enabled: input.transferEnabled,
        bank_alias: clean(input.bankAlias),
        bank_cbu: clean(input.bankCbu.replace(/\s/g, "")),
        bank_holder: clean(input.bankHolder),
        bank_name: clean(input.bankName),
        bank_doc: clean(input.bankDoc),
        mp_link_enabled: input.mpLinkEnabled,
        mp_link: clean(input.mpLink),
        instructions: clean(input.instructions),
      },
      { onConflict: "professional_id" },
    );

    if (error) throw error;
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Etapa 2 · guarda el Access Token de Mercado Pago CIFRADO.
 * El token nunca vuelve al navegador: solo lo lee el Route Handler del servidor.
 */
export async function saveMercadoPagoCredentials(input: {
  accessToken: string;
  publicKey: string;
}): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };

    const token = input.accessToken.trim();
    if (!token.startsWith("APP_USR-"))
      return {
        ok: false,
        error: "Ese no parece un Access Token de producción (empieza con APP_USR-).",
      };

    const { error } = await supabase
      .from("payment_settings")
      .update({
        mp_access_token_enc: encryptSecret(token),
        mp_public_key: input.publicKey.trim() || null,
        mp_checkout_enabled: true,
      })
      .eq("professional_id", auth.user.id);

    if (error) throw error;
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectMercadoPago(): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, error: "Sesión vencida" };
    const { error } = await supabase
      .from("payment_settings")
      .update({ mp_access_token_enc: null, mp_public_key: null, mp_checkout_enabled: false })
      .eq("professional_id", auth.user.id);
    if (error) throw error;
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ── Operaciones sobre la seña de un turno ────────────────────────────────── */

/** Marca la seña cobrada, crea el registro en `payments` y confirma el turno. */
export async function markDepositPaid(input: {
  appointmentId: string;
  method?: PaymentMethod;
  amount?: number | null;
  reference?: string;
}): Promise<Result<{ payment_id: string; amount: number }>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("mark_deposit_paid", {
      p_appointment: input.appointmentId,
      p_method: input.method ?? "transfer",
      p_amount: input.amount ?? null,
      p_ref: input.reference?.trim() || null,
    });
    if (error) throw error;
    revalidatePath("/agenda");
    revalidatePath("/facturacion");
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

/** Exime la seña (paciente conocida, obra social…) y confirma el turno. */
export async function waiveDeposit(input: {
  appointmentId: string;
  reason?: string;
}): Promise<Result> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("waive_deposit", {
      p_appointment: input.appointmentId,
      p_reason: input.reason?.trim() || null,
    });
    if (error) throw error;
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Libera los cupos de las señas vencidas.
 * Llamalo desde el botón "Liberar vencidas" de la agenda, o dejalo a pg_cron.
 */
export async function releaseExpiredDeposits(): Promise<Result<number>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("release_expired_deposits");
    if (error) throw error;
    revalidatePath("/agenda");
    return { ok: true, data: (data as number) ?? 0 };
  } catch (e) {
    return fail(e);
  }
}
