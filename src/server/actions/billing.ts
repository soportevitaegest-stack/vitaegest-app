"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

async function withUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Crea un cobro (payment). total_amount = amount + coseguro + estampilla (columna generada).
export async function createPayment(d: {
  patient_id: string;
  amount: number;
  coverage_type: string;
  insurer_id?: string | null;
  copay_amount: number;
  stamp_amount: number;
  status: string;
  method?: string | null;
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  if (!d.patient_id) return { error: "Elegí un paciente." };
  const paid = d.status === "paid";
  const { error } = await supabase.from("payments").insert({
    professional_id: user.id,
    patient_id: d.patient_id,
    amount: d.amount || 0,
    coverage_type: d.coverage_type,
    insurer_id: d.coverage_type === "obra_social" ? d.insurer_id || null : null,
    copay_amount: d.copay_amount || 0,
    stamp_amount: d.stamp_amount || 0,
    status: d.status,
    method: paid ? d.method || null : null,
    paid_at: paid ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/facturacion");
  revalidatePath("/");
  return {};
}

// Marca un cobro como pagado (registra método + coseguro/estampilla).
export async function markPaid(
  id: string,
  d: { method: string; copay_amount: number; stamp_amount: number }
): Promise<Result> {
  const { supabase } = await withUser();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      method: d.method,
      copay_amount: d.copay_amount || 0,
      stamp_amount: d.stamp_amount || 0,
      paid_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/facturacion");
  revalidatePath("/");
  return {};
}

// Carga un bono / orden de sesiones (lo consume la agenda al marcar Atendido).
export async function createOrder(d: {
  patient_id: string;
  coverage_type: string;
  insurer_id?: string | null;
  total_sessions: number;
  order_number?: string;
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  if (!d.patient_id) return { error: "Elegí un paciente." };
  const { error } = await supabase.from("treatment_orders").insert({
    professional_id: user.id,
    patient_id: d.patient_id,
    insurer_id: d.coverage_type === "obra_social" ? d.insurer_id || null : null,
    total_sessions: Math.max(1, d.total_sessions || 1),
    used_sessions: 0,
    status: "active",
    order_number: d.order_number?.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/facturacion");
  return {};
}
