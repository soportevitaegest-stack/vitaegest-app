/**
 * utils/whatsapp.ts
 * -----------------------------------------------------------------------------
 * NIVEL 1 (Gratis · Manual asistido) del módulo de recordatorios.
 *
 * Genera enlaces `wa.me` con el mensaje pre-armado y codificado. El profesional
 * hace clic en el link desde el turno y envía el texto desde su propio WhatsApp
 * (Web o app). Sin costo de infraestructura ni API.
 *
 * El diseño deja lista la base para el Nivel 2 (API oficial Meta/Twilio):
 * `renderTemplate` y la normalización de teléfono se reutilizan tal cual; sólo
 * cambia el transporte (fetch al proveedor en vez de abrir un link).
 * -----------------------------------------------------------------------------
 */

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export interface ReminderVariables {
  /** Nombre del paciente. Ej: "María" */
  nombre: string;
  /** Fecha del turno ya formateada. Ej: "lunes 8 de septiembre" */
  fecha: string;
  /** Hora del turno ya formateada. Ej: "15:30" */
  hora: string;
  /** Nombre del profesional/consultorio (opcional). */
  profesional?: string;
  consultorio?: string;
  /** Cualquier variable extra que la plantilla quiera resolver. */
  [key: string]: string | undefined;
}

export interface BuildWhatsAppLinkParams {
  /** Teléfono destino en cualquier formato local. Se normaliza a E.164. */
  phone: string;
  /** Texto final del mensaje (ya renderizado desde la plantilla). */
  message: string;
  /**
   * País por defecto para normalizar números sin prefijo internacional.
   * 'AR' = Argentina. Solo se usa cuando el número no trae código de país.
   */
  defaultCountry?: SupportedCountry;
}

export type SupportedCountry = 'AR';

// -----------------------------------------------------------------------------
// Constantes de configuración por país
// -----------------------------------------------------------------------------

const COUNTRY_DIAL_CODE: Record<SupportedCountry, string> = {
  AR: '54',
};

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';
const DEFAULT_LOCALE = 'es-AR';

// -----------------------------------------------------------------------------
// Normalización de teléfono a E.164 (solo dígitos, con código de país)
// -----------------------------------------------------------------------------

/**
 * Convierte un teléfono en formato local a los dígitos que espera wa.me
 * (código de país + número, SIN el '+', sin espacios ni símbolos).
 *
 * Caso Argentina (móviles / WhatsApp):
 *   - Se antepone 54 y el "9" de móvil.
 *   - Se elimina el 0 de larga distancia y el 15 de celular local.
 *   Ej: "011 15-2345-6789"  → "5491123456789"
 *       "+54 9 11 2345-6789" → "5491123456789"
 *       "11 2345 6789"       → "5491123456789"
 *
 * Si el número ya viene con prefijo internacional (empieza con '+'), se respeta.
 *
 * @throws Error si no quedan suficientes dígitos para ser un número válido.
 */
export function normalizePhoneE164(
  phone: string,
  defaultCountry: SupportedCountry = 'AR'
): string {
  if (!phone || !phone.trim()) {
    throw new Error('El teléfono está vacío.');
  }

  const hadPlus = phone.trim().startsWith('+');
  // Nos quedamos solo con dígitos.
  let digits = phone.replace(/\D/g, '');

  if (!digits) {
    throw new Error(`Teléfono inválido: "${phone}"`);
  }

  // Si ya trae el código de país explícito (vino con '+'), lo dejamos como está.
  if (hadPlus) {
    return digits;
  }

  const dial = COUNTRY_DIAL_CODE[defaultCountry];

  if (defaultCountry === 'AR') {
    digits = normalizeArgentina(digits, dial);
  } else if (!digits.startsWith(dial)) {
    digits = dial + digits;
  }

  if (digits.length < 8) {
    throw new Error(`Teléfono demasiado corto tras normalizar: "${phone}"`);
  }

  return digits;
}

/**
 * Reglas específicas para móviles argentinos en WhatsApp.
 * Formato objetivo: 54 + 9 + (área sin 0) + (número sin 15).
 */
function normalizeArgentina(digits: string, dial: string): string {
  // Ya tiene 54 al frente.
  if (digits.startsWith(dial)) {
    let rest = digits.slice(dial.length);
    // Si falta el 9 de móvil, lo agregamos.
    if (!rest.startsWith('9')) rest = '9' + rest;
    return dial + rest;
  }

  // Quitar 0 inicial de larga distancia: 011... → 11...
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Quitar el "15" de celular local cuando aparece tras el código de área.
  // Heurística simple: área de 2-4 dígitos seguida de "15".
  const fifteen = digits.match(/^(\d{2,4})15(\d{6,8})$/);
  if (fifteen) {
    digits = fifteen[1] + fifteen[2];
  }

  return `${dial}9${digits}`;
}

// -----------------------------------------------------------------------------
// Render de plantillas: {{placeholder}} → valor
// -----------------------------------------------------------------------------

/**
 * Reemplaza placeholders con formato {{clave}} por su valor.
 * Los placeholders sin valor se eliminan (quedan vacíos) en lugar de dejar
 * el literal "{{...}}" visible en el mensaje.
 *
 * Ej:
 *   renderTemplate("Hola {{nombre}}, te espero el {{fecha}} a las {{hora}}.",
 *                  { nombre: "María", fecha: "lunes 8/9", hora: "15:30" })
 *   → "Hola María, te espero el lunes 8/9 a las 15:30."
 */
export function renderTemplate(
  template: string,
  variables: ReminderVariables
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value != null ? String(value) : '';
  });
}

// -----------------------------------------------------------------------------
// Formateo de fecha/hora del turno (localizado a es-AR)
// -----------------------------------------------------------------------------

export interface FormattedAppointmentDate {
  /** Ej: "lunes 8 de septiembre de 2026" */
  fecha: string;
  /** Ej: "15:30" */
  hora: string;
}

/**
 * Formatea el inicio de un turno (Date o ISO string) a texto legible en es-AR,
 * respetando la zona horaria del profesional.
 */
export function formatAppointmentDate(
  startAt: Date | string,
  timeZone: string = DEFAULT_TZ,
  locale: string = DEFAULT_LOCALE
): FormattedAppointmentDate {
  const date = typeof startAt === 'string' ? new Date(startAt) : startAt;

  if (isNaN(date.getTime())) {
    throw new Error(`Fecha de turno inválida: "${String(startAt)}"`);
  }

  const fecha = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date);

  const hora = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);

  return { fecha, hora };
}

// -----------------------------------------------------------------------------
// Constructor del link wa.me  (corazón del Nivel 1)
// -----------------------------------------------------------------------------

/**
 * Devuelve un enlace clickeable https://wa.me/<telefono>?text=<mensaje codificado>.
 * El profesional lo abre y envía el mensaje desde su propio WhatsApp.
 *
 * @throws Error si el teléfono no puede normalizarse.
 */
export function buildWhatsAppLink({
  phone,
  message,
  defaultCountry = 'AR',
}: BuildWhatsAppLinkParams): string {
  const to = normalizePhoneE164(phone, defaultCountry);
  const text = encodeURIComponent(message);
  return `https://wa.me/${to}?text=${text}`;
}

// -----------------------------------------------------------------------------
// Helper de alto nivel: turno + plantilla → link listo para usar
// -----------------------------------------------------------------------------

export interface BuildAppointmentReminderParams {
  patientPhone: string;
  patientName: string;
  startAt: Date | string;
  /** Plantilla con placeholders {{nombre}} {{fecha}} {{hora}} {{profesional}} ... */
  template: string;
  professionalName?: string;
  clinicName?: string;
  timeZone?: string;
  defaultCountry?: SupportedCountry;
}

export interface AppointmentReminderResult {
  /** Link wa.me listo para clickear. */
  link: string;
  /** Mensaje final renderizado (para guardar en `reminders.rendered_body`). */
  message: string;
  /** Teléfono normalizado E.164 (para guardar en `reminders.to_phone`). */
  toPhone: string;
}

/**
 * Combina todo el flujo del Nivel 1 en una sola llamada, pensada para usarse
 * directamente en la tarjeta de un turno de la agenda.
 *
 * Uso típico:
 *   const { link } = buildAppointmentReminder({
 *     patientPhone: patient.phone,
 *     patientName:  patient.first_name,
 *     startAt:      appointment.start_at,
 *     template:     "Hola {{nombre}}! Te recordamos tu turno de kinesiología " +
 *                   "el {{fecha}} a las {{hora}}. Con {{profesional}}. " +
 *                   "Si no podés asistir, avisanos. ¡Gracias!",
 *     professionalName: professional.full_name,
 *   });
 *   // <a href={link} target="_blank" rel="noopener noreferrer">Enviar recordatorio</a>
 */
export function buildAppointmentReminder(
  params: BuildAppointmentReminderParams
): AppointmentReminderResult {
  const {
    patientPhone,
    patientName,
    startAt,
    template,
    professionalName,
    clinicName,
    timeZone = DEFAULT_TZ,
    defaultCountry = 'AR',
  } = params;

  const { fecha, hora } = formatAppointmentDate(startAt, timeZone);

  const message = renderTemplate(template, {
    nombre: patientName,
    fecha,
    hora,
    profesional: professionalName,
    consultorio: clinicName,
  });

  const toPhone = normalizePhoneE164(patientPhone, defaultCountry);
  const link = buildWhatsAppLink({ phone: patientPhone, message, defaultCountry });

  return { link, message, toPhone };
}

// -----------------------------------------------------------------------------
// Plantilla por defecto sugerida (fallback si el profesional no definió una)
// -----------------------------------------------------------------------------

export const DEFAULT_REMINDER_TEMPLATE =
  '¡Hola {{nombre}}! 👋 Te recordamos tu turno de kinesiología para el ' +
  '{{fecha}} a las {{hora}} hs{{profesionalSuffix}}. ' +
  'Si necesitás reprogramar o cancelar, respondé este mensaje. ¡Te esperamos!';
