import Link from "next/link";
import type { Patient } from "@/types/domain";
import { fullName, initials, ageFrom, activeOrder } from "@/lib/utils/format";

// Tarjeta de paciente para la grilla. Presentacional (sin estado).
export function PatientCard({ patient }: { patient: Patient }) {
  const name = fullName(patient);
  const bono = activeOrder(patient.treatment_orders);
  const rem = bono ? bono.total_sessions - bono.used_sessions : 0;

  return (
    <Link
      href={`/pacientes/${patient.id}`}
      className="bg-surface border border-line rounded-xl3 shadow-soft p-4 flex flex-col gap-3 trans hover:shadow-lg2"
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-full shrink-0 flex items-center justify-center font-bold w-11 h-11 text-[15px]"
          style={{ background: "var(--surface-2)", color: "var(--primary-ink)", border: "1px solid var(--border)" }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[14.5px] truncate">{name}</div>
          <div className="text-[12px] text-muted">{ageFrom(patient.birth_date)} años · {patient.phone ?? "sin teléfono"}</div>
        </div>
        {!patient.is_active && (
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
            Inactivo
          </span>
        )}
      </div>

      {patient.notes && <p className="text-[12.5px] text-muted leading-snug line-clamp-2">{patient.notes}</p>}

      {bono && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full self-start"
          style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}
        >
          Bono · {rem} de {bono.total_sessions} sesiones
        </span>
      )}
    </Link>
  );
}
