import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createDepositPreference } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/mercadopago/preference   { appointmentId }
 *
 * Lo llama la página pública de la reserva cuando la profesional tiene
 * Checkout Pro conectado. Devuelve el init_point al que se manda a la paciente.
 *
 * Usa el cliente de service_role porque la paciente NO está autenticada; por
 * eso mismo acá adentro filtramos a mano y solo con el id del turno, que es un
 * UUID no adivinable y llega recién de crear la reserva.
 *
 * ETAPA 2: no se ejecuta mientras ninguna profesional tenga
 * `mp_checkout_enabled = true`.
 */
export async function POST(req: Request) {
  try {
    const { appointmentId } = (await req.json()) as { appointmentId?: string };
    if (!appointmentId || !/^[0-9a-f-]{36}$/i.test(appointmentId)) {
      return NextResponse.json({ error: "Turno inválido" }, { status: 400 });
    }

    const db = createServiceClient();

    // Consultas simples y tipadas a mano: así el archivo compila tengas o no
    // regenerado database.types.ts después de la migración.
    type Appt = {
      id: string;
      professional_id: string;
      patient_id: string;
      deposit_status: string;
      deposit_amount: number;
      deposit_due_at: string | null;
    };

    const { data: apptRaw, error: apptErr } = await db
      .from("appointments")
      .select("id, professional_id, patient_id, deposit_status, deposit_amount, deposit_due_at")
      .eq("id", appointmentId)
      .single();

    const appt = apptRaw as Appt | null;
    if (apptErr || !appt) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }
    if (appt.deposit_status !== "pending") {
      return NextResponse.json(
        { error: "Esta reserva no tiene una seña pendiente." },
        { status: 409 },
      );
    }
    if (appt.deposit_due_at && new Date(appt.deposit_due_at) < new Date()) {
      return NextResponse.json({ error: "El plazo de la seña venció." }, { status: 409 });
    }

    const { data: settingsRaw } = await db
      .from("payment_settings")
      .select("mp_access_token_enc, mp_checkout_enabled")
      .eq("professional_id", appt.professional_id)
      .single();

    const settings = settingsRaw as
      | { mp_access_token_enc: string | null; mp_checkout_enabled: boolean }
      | null;

    if (!settings?.mp_checkout_enabled) {
      return NextResponse.json(
        { error: "Esta profesional cobra la seña por transferencia." },
        { status: 409 },
      );
    }

    const [{ data: patientRaw }, { data: profRaw }] = await Promise.all([
      db.from("patients").select("first_name, last_name, email").eq("id", appt.patient_id).single(),
      db.from("professionals").select("full_name").eq("id", appt.professional_id).single(),
    ]);

    const patient = patientRaw as
      | { first_name: string; last_name: string; email: string | null }
      | null;
    const professional = profRaw as { full_name: string } | null;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const pref = await createDepositPreference({
      encryptedToken: settings.mp_access_token_enc,
      appointmentId: appt.id,
      amount: Number(appt.deposit_amount),
      patientName: `${patient?.first_name ?? ""} ${patient?.last_name ?? ""}`.trim(),
      patientEmail: patient?.email ?? null,
      professionalName: professional?.full_name ?? "Consultorio",
      baseUrl,
      expiresAt: appt.deposit_due_at,
    });

    await db
      .from("payments")
      .update({ mp_preference_id: pref.id })
      .eq("appointment_id", appt.id)
      .eq("kind", "deposit");

    return NextResponse.json({ init_point: pref.init_point, preference_id: pref.id });
  } catch (e) {
    console.error("[mp/preference]", e);
    return NextResponse.json(
      { error: "No pudimos generar el link de pago. Probá por transferencia." },
      { status: 500 },
    );
  }
}
