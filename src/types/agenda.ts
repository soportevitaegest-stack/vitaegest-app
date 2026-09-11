// Tipos del módulo Agenda / Turnos.

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "attended"
  | "cancelled"
  | "no_show";

export type CoverageType = "particular" | "obra_social";

export type SpecialtyArea =
  | "general"
  | "pelvic_perineal"
  | "dermatofunctional"
  | "sports"
  | "respiratory"
  | "neuro"
  | "other";

// Turno con el paciente embebido (join a patients).
export type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  area: SpecialtyArea;
  reason: string | null;
  coverage_type: CoverageType;
  insurer_id: string | null;
  treatment_order_id: string | null;
  source: string;
  patients: { first_name: string; last_name: string; phone: string | null } | null;
  // Opcionales (según el select de cada página): prestación y orden/bono ligado.
  service_id?: string | null;
  treatment_orders?: {
    order_number: string | null;
    total_sessions: number;
    used_sessions: number;
    status: string;
  } | null;
};

export type PatientLite = { id: string; first_name: string; last_name: string };
export type InsurerLite = { id: string; name: string };
export type ServiceLite = { id: string; name: string; area: SpecialtyArea; price: number };
export type OrderLite = {
  id: string;
  patient_id: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  insurer_id: string | null;
};
