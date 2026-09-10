// Tipos de dominio de la app (subconjunto usado por el módulo de Pacientes).
// El tipado completo se puede autogenerar con:
//   supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type OrderStatus = "active" | "completed" | "expired" | "cancelled";

export type TreatmentOrder = {
  total_sessions: number;
  used_sessions: number;
  status: OrderStatus;
};

// Antecedentes de la ficha base (patients.medical_background jsonb).
export type MedicalBackground = {
  antecedentes?: string;
  cirugias?: string;
  medicacion?: string;
  alergias?: string;
};

export type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  document_id: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null; // motivo de consulta
  is_active: boolean;
  medical_background: MedicalBackground | null;
  // Relación anidada que devuelve Supabase con select("*, treatment_orders(...)")
  treatment_orders?: TreatmentOrder[];
};
