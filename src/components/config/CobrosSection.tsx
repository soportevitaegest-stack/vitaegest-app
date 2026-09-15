"use client";

import { useState, useTransition } from "react";
import {
  saveDepositConfig,
  savePaymentSettings,
  saveMercadoPagoCredentials,
  disconnectMercadoPago,
} from "@/server/actions/deposits";
import { formatARS } from "@/lib/deposits";

/**
 * Configuración → Cobros
 * Dos bloques: si cobra seña y cuánto, y por dónde la cobra.
 *
 * Se monta en src/app/(dashboard)/configuracion/page.tsx pasándole lo que ya
 * hay guardado en schedule_settings y payment_settings.
 */

export type CobrosProps = {
  deposit: { enabled: boolean; amount: number; holdHours: number; note: string };
  payment: {
    transferEnabled: boolean;
    bankAlias: string;
    bankCbu: string;
    bankHolder: string;
    bankName: string;
    bankDoc: string;
    mpLinkEnabled: boolean;
    mpLink: string;
    instructions: string;
    mpCheckoutEnabled: boolean;
  };
};

export function CobrosSection({ deposit, payment }: CobrosProps) {
  const [dep, setDep] = useState(deposit);
  const [pay, setPay] = useState(payment);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const sinCanal =
    dep.enabled &&
    !(pay.transferEnabled && (pay.bankAlias || pay.bankCbu)) &&
    !(pay.mpLinkEnabled && pay.mpLink) &&
    !pay.mpCheckoutEnabled;

  function guardar() {
    setMsg(null);
    start(async () => {
      const a = await saveDepositConfig({
        enabled: dep.enabled,
        amount: Number(dep.amount) || 0,
        holdHours: Number(dep.holdHours) || 24,
        note: dep.note,
      });
      if (!a.ok) return setMsg({ tone: "error", text: a.error });
      const b = await savePaymentSettings(pay);
      if (!b.ok) return setMsg({ tone: "error", text: b.error });
      setMsg({ tone: "ok", text: "Listo, guardado." });
    });
  }

  return (
    <section className="space-y-6">
      {/* ── Seña ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-ink">Seña de reserva</h3>
            <p className="mt-1 max-w-lg text-sm text-ink-soft">
              Cuando alguien pide un turno desde tu link público, el sistema le
              muestra el monto y tus datos de pago. El horario le queda retenido
              hasta que venza el plazo.
            </p>
          </div>
          <Switch
            checked={dep.enabled}
            onChange={(v) => setDep({ ...dep, enabled: v })}
            label="Cobrar seña"
          />
        </div>

        {dep.enabled && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Monto de la seña" hint="Se congela en cada reserva ya tomada.">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={dep.amount}
                  onChange={(e) => setDep({ ...dep, amount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-ink-line bg-canvas py-3 pl-8 pr-4 text-ink outline-none focus:border-teal focus:bg-white"
                />
              </div>
            </Field>

            <Field
              label="Plazo para pagar"
              hint="Pasado ese tiempo el turno se cancela solo y el horario se libera."
            >
              <select
                value={dep.holdHours}
                onChange={(e) => setDep({ ...dep, holdHours: Number(e.target.value) })}
                className="w-full rounded-xl border border-ink-line bg-canvas px-4 py-3 text-ink outline-none focus:border-teal focus:bg-white"
              >
                {[2, 6, 12, 24, 48, 72].map((h) => (
                  <option key={h} value={h}>
                    {h} horas
                  </option>
                ))}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Qué ve la paciente"
                hint="Una línea corta. Ej: “La seña se descuenta del valor de la sesión.”"
              >
                <input
                  value={dep.note}
                  onChange={(e) => setDep({ ...dep, note: e.target.value })}
                  maxLength={160}
                  placeholder="La seña se descuenta del valor de la sesión."
                  className="w-full rounded-xl border border-ink-line bg-canvas px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-teal focus:bg-white"
                />
              </Field>
            </div>

            {dep.amount > 0 && (
              <p className="rounded-xl bg-teal-soft px-4 py-3 text-sm text-primary-700 sm:col-span-2">
                Al reservar va a leer: <strong>seña de {formatARS(dep.amount)}</strong>, a pagar
                dentro de {dep.holdHours} horas.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Por dónde cobra ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <h3 className="text-lg font-bold text-ink">Tus datos de cobro</h3>
        <p className="mt-1 text-sm text-ink-soft">
          La plata va directo a tu cuenta. VitaeGest no la toca ni cobra comisión.
        </p>

        {sinCanal && (
          <p className="mt-4 rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-dark">
            Activaste la seña pero todavía no cargaste ningún dato de pago. Poné
            al menos el alias, o la paciente no va a saber dónde transferir.
          </p>
        )}

        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-ink-line/70 p-4">
            <Switch
              checked={pay.transferEnabled}
              onChange={(v) => setPay({ ...pay, transferEnabled: v })}
              label="Transferencia bancaria"
            />
            {pay.transferEnabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Alias">
                  <Input
                    value={pay.bankAlias}
                    onChange={(v) => setPay({ ...pay, bankAlias: v })}
                    placeholder="ana.lopez.kine"
                  />
                </Field>
                <Field label="CBU / CVU">
                  <Input
                    value={pay.bankCbu}
                    onChange={(v) => setPay({ ...pay, bankCbu: v })}
                    placeholder="0000003100010000000001"
                  />
                </Field>
                <Field label="Titular">
                  <Input
                    value={pay.bankHolder}
                    onChange={(v) => setPay({ ...pay, bankHolder: v })}
                    placeholder="Ana López"
                  />
                </Field>
                <Field label="Banco o billetera">
                  <Input
                    value={pay.bankName}
                    onChange={(v) => setPay({ ...pay, bankName: v })}
                    placeholder="Banco Nación / Mercado Pago"
                  />
                </Field>
                <Field label="CUIT / CUIL" hint="Opcional. Algunos bancos lo piden.">
                  <Input
                    value={pay.bankDoc}
                    onChange={(v) => setPay({ ...pay, bankDoc: v })}
                    placeholder="27-12345678-4"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-ink-line/70 p-4">
            <Switch
              checked={pay.mpLinkEnabled}
              onChange={(v) => setPay({ ...pay, mpLinkEnabled: v })}
              label="Link de cobro de Mercado Pago"
            />
            <p className="mt-2 text-sm text-ink-soft">
              En la app de Mercado Pago: <strong>Cobrar → Link de pago</strong>.
              Creá uno por el monto de la seña y pegá el link acá.
            </p>
            {pay.mpLinkEnabled && (
              <div className="mt-4">
                <Input
                  value={pay.mpLink}
                  onChange={(v) => setPay({ ...pay, mpLink: v })}
                  placeholder="https://mpago.la/..."
                />
              </div>
            )}
          </div>

          <Field
            label="Instrucciones extra"
            hint="Se muestran debajo de los datos de pago. Ej: “Mandame el comprobante por WhatsApp.”"
          >
            <textarea
              value={pay.instructions}
              onChange={(e) => setPay({ ...pay, instructions: e.target.value })}
              rows={2}
              maxLength={300}
              className="w-full resize-y rounded-xl border border-ink-line bg-canvas px-4 py-3 text-ink outline-none focus:border-teal focus:bg-white"
            />
          </Field>
        </div>

        <MercadoPagoAvanzado enabled={pay.mpCheckoutEnabled} />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={guardar} disabled={pending} className="btn-primary">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {msg && (
          <span
            className={`text-sm ${msg.tone === "ok" ? "text-teal-dark" : "text-coral-dark"}`}
            role="status"
          >
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
}

/** Etapa 2 · queda plegado hasta que alguien lo pida. */
function MercadoPagoAvanzado({ enabled }: { enabled: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [token, setToken] = useState("");
  const [pk, setPk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <details
      className="mt-5 rounded-xl border border-ink-line/70 p-4"
      open={abierto}
      onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Cobro automático con Mercado Pago{" "}
        {enabled ? (
          <span className="ml-2 rounded-full bg-teal-soft px-2 py-0.5 text-xs text-primary-700">
            conectado
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-ink-faint">(avanzado)</span>
        )}
      </summary>

      <p className="mt-3 text-sm text-ink-soft">
        Con esto la paciente paga sin salir de la página y el turno se confirma
        solo. Necesitás tu Access Token de producción:{" "}
        <em>mercadopago.com.ar/developers → Tus integraciones → Crear aplicación
        → Credenciales de producción</em>. Empieza con <code>APP_USR-</code>.
      </p>

      {enabled ? (
        <button
          onClick={() =>
            start(async () => {
              const r = await disconnectMercadoPago();
              setMsg(r.ok ? "Desconectado." : r.error);
            })
          }
          disabled={pending}
          className="btn-ghost mt-4"
        >
          Desconectar Mercado Pago
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <Input value={token} onChange={setToken} placeholder="APP_USR-…" type="password" />
          <Input value={pk} onChange={setPk} placeholder="Public key (opcional)" />
          <button
            onClick={() =>
              start(async () => {
                const r = await saveMercadoPagoCredentials({ accessToken: token, publicKey: pk });
                setMsg(r.ok ? "Conectado." : r.error);
                if (r.ok) setToken("");
              })
            }
            disabled={pending || !token}
            className="btn-primary"
          >
            {pending ? "Verificando…" : "Conectar"}
          </button>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-ink-soft">{msg}</p>}
    </details>
  );
}

/* ── primitivos ───────────────────────────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-ink">{label}</label>
      {hint && <p className="mb-2 mt-0.5 text-xs text-ink-faint">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-ink-line bg-canvas px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-teal focus:bg-white"
    />
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-teal" : "bg-ink-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
