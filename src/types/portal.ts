// Tipos del Portal del Paciente. El payload viene de la RPC portal_context.

export type PortalItem = {
  id: string;
  name: string;
  detail: string | null;
  sort: number;
};

export type PortalLog = {
  item_id: string;
  completed: boolean;
};

export type PortalCheckin = {
  checkin_date: string;
  mood: string | null;
  notes: string | null;
};

export type PortalPlan = {
  id: string;
  title: string;
  area: string;
} | null;

export type PortalAppointment = {
  id: string;
  start_at: string;
  status: string;
  area: string;
  reason: string | null;
};

// scope del token: define qué módulos ve el paciente.
//   "both"      → turnos + ejercicios + diario miccional (piso pélvico)
//   "exercises" → turnos + ejercicios/pautas (dermatofuncional, sin diario)
export type PortalScope = "both" | "exercises" | string;

export type PortalContext = {
  patient: { first_name: string } | null;
  scope: PortalScope;
  plan: PortalPlan;
  items: PortalItem[];
  logs_today: PortalLog[];
  checkins: PortalCheckin[];
  appointments: PortalAppointment[];
};

// Slot de disponibilidad (portal_available_slots / public_booking_slots).
export type Slot = { time: string; free: boolean };

// ¿El scope incluye el diario miccional?
export const scopeHasDiary = (scope: PortalScope) => scope !== "exercises";
