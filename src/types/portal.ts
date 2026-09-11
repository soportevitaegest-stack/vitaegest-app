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

export type PortalContext = {
  patient: { first_name: string } | null;
  plan: PortalPlan;
  items: PortalItem[];
  logs_today: PortalLog[];
  checkins: PortalCheckin[];
};

// Slot de disponibilidad (portal_available_slots).
export type Slot = { time: string; free: boolean };
