import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getPayment } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mercadopago   ·  ETAPA 2
 *
 * Mercado Pago avisa que pasó algo con un pago. El aviso NO trae el estado:
 * trae un id. Siempre vamos a la API a preguntar cómo quedó realmente — un
 * webhook se puede falsificar, la respuesta de la API con el token de ella no.
 *
 * Reglas que hacen que esto no rompa nada:
 *   · Responder 200 SIEMPRE que el aviso se haya podido procesar o ignorar.
 *     Si devolvés error, MP reintenta durante días.
 *   · Idempotente: el mismo pago puede llegar cinco veces. Si la seña ya está
 *     cobrada, no hacemos nada y contestamos 200.
 *
 * Configuración en MP: Tus integraciones → Webhooks → URL de producción:
 *   https://TU-DOMINIO/api/webhooks/mercadopago      (evento: Pagos)
 * Copiá la "Clave secreta" que te da MP y ponela en MP_WEBHOOK_SECRET.
 */

/** Valida la firma x-signature de Mercado Pago (ts + v1). */
function validSignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado, no bloqueamos (etapa de prueba)

  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id") ?? "";
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as {
      type?: string;
      action?: string;
      data?: { id?: string };
    };

    const type = body.type ?? url.searchParams.get("type") ?? "";
    const paymentId = body.data?.id ?? url.searchParams.get("data.id") ?? "";

    // Solo nos interesan los avisos de pago.
    if (!type.startsWith("payment") || !paymentId) {
      return NextResponse.json({ ignored: true }, { status: 200 });
    }
    if (!validSignature(req, String(paymentId))) {
      console.warn("[mp/webhook] firma inválida", { paymentId });
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }

    const db = createServiceClient();

    // Quién es la dueña de este pago: la sabemos por el turno, que viaja en
    // external_reference. Pero para consultar la API necesitamos su token, y
    // para eso necesitamos el turno. Vamos por el preference_id que guardamos.
    const { data: paymentRowRaw } = await db
      .from("payments")
      .select("id, appointment_id, professional_id, status")
      .eq("mp_preference_id", url.searchParams.get("preference_id") ?? "")
      .maybeSingle();
    const paymentRow = paymentRowRaw as { professional_id: string } | null;

    // Camino normal: buscamos por el turno una vez que consultemos la API.
    // Primero necesitamos un token: probamos con el de la fila encontrada,
    // y si no hay, con el del turno referenciado en la propia notificación.
    let professionalId = paymentRow?.professional_id as string | undefined;

    if (!professionalId) {
      const ref = url.searchParams.get("external_reference");
      if (ref) {
        const { data: apptRef } = await db
          .from("appointments")
          .select("professional_id")
          .eq("id", ref)
          .maybeSingle();
        professionalId = (apptRef as { professional_id: string } | null)?.professional_id;
      }
    }
    if (!professionalId) {
      // No podemos identificar al tenant: lo dejamos pasar sin reintentos.
      console.warn("[mp/webhook] aviso sin tenant identificable", { paymentId });
      return NextResponse.json({ ignored: true }, { status: 200 });
    }

    const { data: settingsRaw } = await db
      .from("payment_settings")
      .select("mp_access_token_enc")
      .eq("professional_id", professionalId)
      .single();
    const settings = settingsRaw as { mp_access_token_enc: string | null } | null;

    const payment = await getPayment(settings?.mp_access_token_enc ?? null, paymentId);
    const appointmentId = payment.external_reference;
    if (!appointmentId) return NextResponse.json({ ignored: true }, { status: 200 });

    if (payment.status !== "approved") {
      // pending / rejected: no tocamos nada, la seña sigue esperando.
      return NextResponse.json({ status: payment.status }, { status: 200 });
    }

    const { data: apptRaw } = await db
      .from("appointments")
      .select("id, professional_id, patient_id, deposit_status, deposit_amount, status")
      .eq("id", appointmentId)
      .single();

    const appt = apptRaw as {
      id: string; professional_id: string; patient_id: string;
      deposit_status: string; deposit_amount: number; status: string;
    } | null;

    if (!appt) return NextResponse.json({ ignored: true }, { status: 200 });
    if (appt.deposit_status === "paid") {
      return NextResponse.json({ alreadyPaid: true }, { status: 200 }); // idempotencia
    }

    await db
      .from("appointments")
      .update({
        deposit_status: "paid",
        deposit_paid_at: payment.date_approved ?? new Date().toISOString(),
        deposit_method: "mercadopago",
        deposit_ref: String(payment.id),
        status: appt.status === "pending" ? "confirmed" : appt.status,
      })
      .eq("id", appt.id);

    await db.from("payments").insert({
      professional_id: appt.professional_id,
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      kind: "deposit",
      amount: payment.transaction_amount,
      status: "paid",
      method: "mercadopago",
      paid_at: payment.date_approved ?? new Date().toISOString(),
      mp_payment_id: String(payment.id),
      notes: `Seña cobrada por Mercado Pago · ${payment.payment_method_id}`,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[mp/webhook]", e);
    // 200 a propósito: si devolvemos 500, MP reintenta durante días.
    return NextResponse.json({ handled: false }, { status: 200 });
  }
}

/** MP a veces verifica la URL con un GET. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
