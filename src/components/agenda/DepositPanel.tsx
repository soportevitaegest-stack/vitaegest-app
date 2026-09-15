"use client";

import { useState, useTransition } from "react";
import { markDepositPaid, waiveDeposit } from "@/server/actions/deposits";
import {
  DEPOSIT_LABEL,
  DEPOSIT_TONE,
  depositDeadlineText,
  depositWhatsAppText,
  formatARS,
  type DepositStatus,
  type PaymentMethod,
  type PublicPaymentInfo,
} from "@/lib/deposits";

/**
 * Bloque de la seña dentro del detalle de un turno.
 * Se monta en src/app/(dashboard)/agenda/[id]/page.tsx.
 */

export type DepositPanelProps = {
  appointmentId: string;
  status: DepositStatus;
  amount: number;
  dueAt: string | null;
  paidAt: string | null;
  method: PaymentMethod | null;
  reference: string | null;
  patient: { firstName: string; phone: string | null };
  clinicName?: string | null;
  payment: PublicPaymentInfo;
};

/** Chip compacto para la fila del turno en la agenda. */
export function DepositBadge({ status, amount }: { status: DepositStatus; amount: number }) {
  if (status === "none") return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${DEPOSIT_TONE[status]}`}
    >
      {DEPOSIT_LABEL[status]}
      {status !== "waived" && amount > 0 && <span>· {formatARS(amount)}</span>}
    </span>
  );
}

export function DepositPanel(props: DepositPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(props.amount);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (props.status === "none") return null;

  const waLink = props.patient.phone
    ? `https://wa.me/${props.patient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        depositWhatsAppText({
          patientFirstName: props.patient.firstName,
          amount: props.amount,
          dueAt: props.dueAt,
          payment: props.payment,
          clinicName: props.clinicName,
        }),
      )}`
    : null;

  return (
    <div className="rounded-2xl border border-ink-line bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Seña de reserva</h3>
        <DepositBadge status={props.status} amount={props.amount} />
      </div>

      {props.status === "pending" && (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Esperando {formatARS(props.amount)} · {depositDeadlineText(props.dueAt)}. El horario le
            queda retenido hasta entonces.
          </p>

          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost mt-4 w-full sm:w-auto"
            >
              Mandarle los datos por WhatsApp
            </a>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="font-semibold text-ink">Entró por</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
              >
                <option value="transfer">Transferencia</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="font-semibold text-ink">Monto</span>
              <input
                type="number"
                value={amount}
                min={0}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
              />
            </label>

            <label className="text-sm">
              <span className="font-semibold text-ink">Comprobante</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nº de operación"
                className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-teal focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await markDepositPaid({
                    appointmentId: props.appointmentId,
                    method,
                    amount,
                    reference,
                  });
                  if (!r.ok) setError(r.error);
                })
              }
              className="btn-primary"
            >
              {pending ? "Registrando…" : "Cobré la seña · confirmar turno"}
            </button>

            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await waiveDeposit({
                    appointmentId: props.appointmentId,
                    reason: "Eximida desde la agenda",
                  });
                  if (!r.ok) setError(r.error);
                })
              }
              className="btn-ghost"
            >
              No le cobro · confirmar igual
            </button>
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Al confirmar queda un cobro cargado en Facturación, separado del valor
            de la sesión.
          </p>
        </>
      )}

      {props.status === "paid" && (
        <p className="mt-2 text-sm text-ink-soft">
          Cobrada el{" "}
          {props.paidAt
            ? new Date(props.paidAt).toLocaleString("es-AR", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
          {props.method ? ` por ${props.method === "transfer" ? "transferencia" : props.method}` : ""}
          {props.reference ? ` · ${props.reference}` : ""}.
        </p>
      )}

      {props.status === "waived" && (
        <p className="mt-2 text-sm text-ink-soft">
          Eximida{props.reference ? `: ${props.reference}` : ""}. El turno quedó confirmado
          sin seña.
        </p>
      )}

      {props.status === "expired" && (
        <p className="mt-2 text-sm text-ink-soft">
          Venció el plazo sin pago y el turno se canceló solo. Si la paciente
          aparece, creale un turno nuevo.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-dark" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
