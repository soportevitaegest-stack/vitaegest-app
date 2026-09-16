"use client";

import { useState } from "react";
import { formatARS, depositDeadlineText, type PublicPaymentInfo } from "@/lib/deposits";

export type DepositInstructionsProps = {
  deposit: { required: boolean; amount: number; due_at: string | null; note: string | null };
  payment: PublicPaymentInfo;
  appointmentId: string;
  professionalName: string;
  whatsapp?: string | null;
  turno: string;
};

export function DepositInstructions(props: DepositInstructionsProps) {
  const { deposit, payment } = props;
  const [cargandoMp, setCargandoMp] = useState(false);
  const [errorMp, setErrorMp] = useState<string | null>(null);

  if (!deposit.required) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-bold text-teal-800">Turno solicitado</h2>
        <p className="mt-2 text-[15px] text-teal-900/90">
          Te reservamos el <strong>{props.turno}</strong>. {props.professionalName} lo confirma en
          las próximas horas.
        </p>
      </div>
    );
  }

  async function pagarConMercadoPago() {
    setCargandoMp(true);
    setErrorMp(null);
    try {
      const res = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: props.appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar el pago");
      window.location.href = data.init_point;
    } catch (e) {
      setErrorMp(e instanceof Error ? e.message : "No se pudo generar el pago");
      setCargandoMp(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-bold text-teal-800">Te reservamos el horario</h2>
        <p className="mt-2 text-[15px] text-teal-900/90">
          <strong>{props.turno}</strong> con {props.professionalName}.
        </p>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Falta la seña
        </p>
        <p className="mt-2 text-3xl font-extrabold text-gray-900">{formatARS(deposit.amount)}</p>
        {deposit.due_at && (
          <p className="mt-1 text-sm text-gray-500">
            {depositDeadlineText(deposit.due_at)}. Si no llega a tiempo, el horario se libera
            y queda disponible para otra persona.
          </p>
        )}
        {deposit.note && (
          <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {deposit.note}
          </p>
        )}
      </div>

      {payment.mp_checkout_enabled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-bold text-gray-900">Pagar ahora</h3>
          <p className="mt-1 text-sm text-gray-500">
            Con tarjeta o dinero en cuenta. El turno se confirma solo.
          </p>
          <button onClick={pagarConMercadoPago} disabled={cargandoMp} className="btn-primary mt-4 w-full">
            {cargandoMp ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
          </button>
          {errorMp && <p className="mt-3 text-sm text-red-600">{errorMp}</p>}
        </div>
      )}

      {payment.mp_link_enabled && payment.mp_link && !payment.mp_checkout_enabled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-bold text-gray-900">Pagar por Mercado Pago</h3>
          <a
            href={payment.mp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-4 w-full text-center block"
          >
            Abrir el link de pago
          </a>
        </div>
      )}

      {payment.transfer_enabled && (payment.bank_alias || payment.bank_cbu) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-bold text-gray-900">Transferencia</h3>
          <dl className="mt-4 space-y-3">
            {payment.bank_alias && <Copiable label="Alias" value={payment.bank_alias} destacado />}
            {payment.bank_cbu && <Copiable label="CBU / CVU" value={payment.bank_cbu} />}
            {payment.bank_holder && <Dato label="Titular" value={payment.bank_holder} />}
            {payment.bank_name && <Dato label="Banco" value={payment.bank_name} />}
            {payment.bank_doc && <Copiable label="CUIT / CUIL" value={payment.bank_doc} />}
          </dl>
        </div>
      )}

      {payment.instructions && (
        <p className="rounded-2xl bg-gray-50 px-5 py-4 text-sm text-gray-600">
          {payment.instructions}
        </p>
      )}

      {props.whatsapp && (
        <a
          href={`https://wa.me/${props.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
            `Hola! Ya hice la seña del turno del ${props.turno}. Te paso el comprobante.`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost w-full text-center block"
        >
          Ya pagué · mandar el comprobante
        </a>
      )}
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-[15px] font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function Copiable({
  label,
  value,
  destacado = false,
}: {
  label: string;
  value: string;
  destacado?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Safari sin permiso: el texto igual se puede seleccionar a mano. */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="flex items-center gap-2">
        <span
          className={`select-all font-mono text-gray-900 ${destacado ? "text-[17px] font-bold" : "text-[15px]"}`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-teal-500 hover:text-teal-700"
        >
          {copiado ? "copiado" : "copiar"}
        </button>
      </dd>
    </div>
  );
}
