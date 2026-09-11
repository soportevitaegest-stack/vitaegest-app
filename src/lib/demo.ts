// Modo demo. Se activa con NEXT_PUBLIC_APP_ENV='demo'.
//
// Filosofía (ver gestion/estrategia-demo.md): en la demo el CRUD escribe de
// verdad contra un proyecto Supabase de demo separado (que se resetea de noche).
// Solo se interceptan acciones IRREVERSIBLES o que salen al mundo real.

export const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === "demo";

// Acciones que en demo NO deben ejecutarse de verdad.
export type GuardedAction =
  | "send_whatsapp_api" // envío real por API (Nivel 2). El wa.me manual NO hace falta bloquearlo.
  | "send_email"
  | "change_password"
  | "delete_account"
  | "checkout_payment";

// true => hay que simular en lugar de ejecutar.
export function isBlockedInDemo(_action: GuardedAction): boolean {
  return IS_DEMO;
}

// Respuesta estándar "simulada" para devolver desde una Server Action.
export function demoResult(message = "Acción simulada en la versión demo.") {
  return { ok: true as const, demo: true as const, message };
}
