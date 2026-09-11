"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server Actions del módulo Configuración. RLS aísla por professional_id = auth.uid().

type Result = { error?: string };

async function withUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// --- Perfil + especialidades (gating HC-07) ---
export async function saveProfile(d: {
  full_name: string;
  license_number: string;
  clinic_name: string;
  specialties: string[];
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  const { error } = await supabase
    .from("professionals")
    .update({
      full_name: d.full_name.trim() || "Profesional",
      license_number: d.license_number.trim() || null,
      clinic_name: d.clinic_name.trim() || null,
      specialties: d.specialties,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
  return {};
}

// --- Obras sociales ---
export async function saveInsurer(d: {
  id?: string;
  name: string;
  plan: string;
  region: string;
  default_copay: number;
  default_stamp: number;
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  if (!d.name.trim()) return { error: "El nombre es obligatorio." };
  const payload = {
    name: d.name.trim(),
    plan: d.plan.trim() || null,
    region: d.region.trim() || null,
    default_copay: d.default_copay || 0,
    default_stamp: d.default_stamp || 0,
  };
  const { error } = d.id
    ? await supabase.from("insurers").update(payload).eq("id", d.id)
    : await supabase.from("insurers").insert({ professional_id: user.id, source: "manual", ...payload });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return {};
}

export async function deleteInsurer(id: string): Promise<Result> {
  const { supabase } = await withUser();
  const { error } = await supabase.from("insurers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return {};
}

// --- Prestaciones particulares ---
export async function saveService(d: {
  id?: string;
  name: string;
  area: string;
  price: number;
  duration_min: number;
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  if (!d.name.trim()) return { error: "El nombre es obligatorio." };
  const payload = {
    name: d.name.trim(),
    area: d.area,
    price: d.price || 0,
    duration_min: d.duration_min || 45,
  };
  const { error } = d.id
    ? await supabase.from("services").update(payload).eq("id", d.id)
    : await supabase.from("services").insert({ professional_id: user.id, ...payload });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return {};
}

export async function deleteService(id: string): Promise<Result> {
  const { supabase } = await withUser();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return {};
}

// --- Configuración de agenda ---
export async function saveSchedule(d: {
  work_start: string;
  work_end: string;
  slot_minutes: number;
  max_per_slot: number;
  working_days: number[];
  booking_enabled: boolean;
  booking_horizon_days: number;
}): Promise<Result> {
  const { supabase, user } = await withUser();
  if (!user) return { error: "Sesión no válida." };
  const { error } = await supabase.from("schedule_settings").upsert(
    {
      professional_id: user.id,
      work_start: d.work_start,
      work_end: d.work_end,
      slot_minutes: d.slot_minutes || 60,
      max_per_slot: Math.max(1, d.max_per_slot || 1),
      working_days: d.working_days,
      booking_enabled: d.booking_enabled,
      booking_horizon_days: Math.max(1, d.booking_horizon_days || 14),
    },
    { onConflict: "professional_id" }
  );
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return {};
}
