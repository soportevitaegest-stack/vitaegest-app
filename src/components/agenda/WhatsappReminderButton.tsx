"use client";

import type { AppointmentRow } from "@/types/agenda";
import { waLink, fillTemplate, fmtReminderDate, fmtTime, DEFAULT_REMINDER_TEMPLATE } from "@/lib/utils/agenda";

// Ícono oficial de WhatsApp (glifo), color heredado por currentColor.
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M16.01 3.2C9.03 3.2 3.36 8.86 3.36 15.84c0 2.23.59 4.41 1.71 6.33L3.2 28.8l6.79-1.78a12.6 12.6 0 0 0 6.02 1.53h.01c6.98 0 12.65-5.67 12.65-12.65 0-3.38-1.32-6.56-3.71-8.95a12.56 12.56 0 0 0-8.94-3.75Zm0 23.1h-.01a10.5 10.5 0 0 1-5.35-1.47l-.38-.23-3.97 1.04 1.06-3.87-.25-.4a10.45 10.45 0 0 1-1.6-5.56c0-5.8 4.72-10.51 10.52-10.51 2.81 0 5.45 1.1 7.43 3.08a10.44 10.44 0 0 1 3.08 7.44c0 5.8-4.72 10.51-10.53 10.51Zm5.77-7.87c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function WhatsappReminderButton({
  appt,
  template,
  variant = "solid",
}: {
  appt: AppointmentRow;
  template: string;
  variant?: "solid" | "ghost";
}) {
  const WA = "#25D366";
  const patientFirst = appt.patients?.first_name ?? "paciente";
  const patientFull = appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "paciente";

  const send = () => {
    const message = fillTemplate(template || DEFAULT_REMINDER_TEMPLATE, {
      paciente: patientFirst,
      nombre: patientFull,
      fecha: fmtReminderDate(appt.start_at),
      hora: fmtTime(appt.start_at),
    });
    const link = waLink(appt.patients?.phone, message);
    if (!link) {
      alert("Este paciente no tiene teléfono cargado. Agregalo en su ficha para enviar el recordatorio.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  if (variant === "ghost") {
    return (
      <button
        onClick={send}
        title="Enviar recordatorio por WhatsApp"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg trans hover:bg-surface-2 border border-line"
        style={{ color: WA }}
      >
        <WhatsappIcon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={send}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 text-white trans"
      style={{ background: WA }}
    >
      <WhatsappIcon className="w-4 h-4" />
      Enviar recordatorio
    </button>
  );
}
