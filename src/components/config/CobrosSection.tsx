"use client";

import { useState, useTransition } from "react";
import {
  saveDepositConfig,
  savePaymentSettings,
  saveMercadoPagoCredentials,
  disconnectMercadoPago,
} from "@/server/actions/deposits";
import { formatARS } from "@/lib/deposits";

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

const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5 sm:p-6 mb-6";
const input = "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold mb-1.5";
const hint = "mb-2 mt-0.5 text-[12px] text-muted";

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
    <section>
      {/* ── Seña ─────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-display font-bold text-[15px]">Seña de reserva</h3>
            <p className="mt-1 text-[13px] text-muted leading-snug">
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 pt-4 border-t border-line">
            <Field label="Monto de la seña" hintText="Se congela en cada reserva ya tomada.">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={dep.amount}
                  onChange={(e) => setDep({ ...dep, amount: Number(e.target.value) })}
                  className={`${input} pl-8`}
                />
              </div>
            </Field>

            <Field
              label="Plazo para pagar"
              hintText="Pasado ese tiempo el turno se cancela."
            >
              <select
                value={dep.holdHours}
                onChange={(e) => setDep({ ...dep, holdHours: Number(e.target.value) })}
                className={input}
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
                hintText="Una línea corta. Ej: “La seña se descuenta del valor de la sesión.”"
              >
                <input
                  value={dep.note}
                  onChange={(e) => setDep({ ...dep, note: e.target.value })}
                  maxLength={160}
                  placeholder="La seña se descuenta del valor de la sesión."
                  className={input}
                />
              </Field>
            </div>

            {dep.amount > 0 && (
              <div className="sm:col-span-2 rounded-xl2 px-4 py-3 text-[13px] font-medium" style={{ background: "var(--teal)", color: "white" }}>
                Al reservar va a leer: <strong>seña de {formatARS(dep.amount)}</strong>, a pagar
                dentro de {dep.holdHours} horas.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Por dónde cobra ──────────────────────────────────────────────── */}
      <div className={card}>
        <h3 className="font-display font-bold text-[15px]">Tus datos de cobro</h3>
        <p className="mt-1 text-[13px] text-muted leading-snug">
          La plata va directo a tu cuenta. VitaeGest no la toca ni cobra comisión.
        </p>

        {sinCanal && (
          <div className="mt-4 rounded-xl2 px-3 py-2.5 text-[13px] font-medium" style={{ background: "var(--rose-soft)", color: "var(--rose)" }}>
            Activaste la seña pero no cargaste datos de pago. Poné
            al menos el alias.
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div className="rounded-xl2 border border-line p-4 bg-surface-2">
            <Switch
              checked={pay.transferEnabled}
              onChange={(v) => setPay({ ...pay, transferEnabled: v })}
              label="Transferencia bancaria"
            />
            {pay.transferEnabled && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 pt-4 border-t border-line">
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
                <Field label="CUIT / CUIL" hintText="Opcional.">
                  <Input
                    value={pay.bankDoc}
                    onChange={(v) => setPay({ ...pay, bankDoc: v })}
                    placeholder="27-12345678-4"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="rounded-xl2 border border-line p-4 bg-surface-2">
            <Switch
              checked={pay.mpLinkEnabled}
              onChange={(v) => setPay({ ...pay, mpLinkEnabled: v })}
              label="Link de cobro de Mercado Pago"
            />
            <p className="mt-2 text-[13px] text-muted">
              En la app de Mercado Pago: <strong>Cobrar → Link de pago</strong>.
            </p>
            {pay.mpLinkEnabled && (
              <div className="mt-3">
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
            hintText="Se muestran debajo de los datos de pago."
          >
            <textarea
              value={pay.instructions}
              onChange={(e) => setPay({ ...pay, instructions: e.target.value })}
              rows={2}
              maxLength={300}
              className={`${input} resize-y`}
            />
          </Field>
        </div>

        <MercadoPagoAvanzado enabled={pay.mpCheckoutEnabled} />
      </div>

      <div className="flex items-center gap-4">
        <button onClick={guardar} disabled={pending} className="rounded-xl2 px-4 py-2.5 text-sm font-semibold text-white trans disabled:opacity-50" style={{ background: "var(--primary)" }}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {msg && (
          <span
            className={`text-sm ${msg.tone === "ok" ? "text-[#10b981]" : "text-[#f43f5e]"}`}
            role="status"
          >
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
}

function MercadoPagoAvanzado({ enabled }: { enabled: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [token, setToken] = useState("");
  const [pk, setPk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <details
      className="mt-4 rounded-xl2 border border-line p-4 bg-surface-2"
      open={abierto}
      onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-sm font-semibold outline-none">
        Cobro automático con Mercado Pago{" "}
        {enabled ? (
          <span className="ml-2 rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--teal)", color: "white" }}>
            conectado
          </span>
        ) : (
          <span className="ml-2 text-[11px] text-muted font-normal">(avanzado)</span>
        )}
      </summary>

      <p className="mt-3 text-[13px] text-muted">
        Con esto la paciente paga sin salir de la página y el turno se confirma
        solo. Necesitás tu Access Token de producción.
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
          className="mt-4 rounded-xl2 px-3 py-2 text-sm border border-line text-muted hover:text-[var(--primary)] trans"
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
            className="rounded-xl2 px-4 py-2.5 text-sm font-semibold text-white trans disabled:opacity-50" style={{ background: "var(--primary)" }}
          >
            {pending ? "Verificando…" : "Conectar"}
          </button>
        </div>
      )}
      {msg && <p className="mt-3 text-[13px] text-muted">{msg}</p>}
    </details>
  );
}

function Field({
  label,
  hintText,
  children,
}: {
  label: string;
  hintText?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {hintText && <p className={hint}>{hintText}</p>}
      <div>{children}</div>
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
      className={input}
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
      <span className={lbl} style={{ marginBottom: 0 }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-neutral-600"
        }`}
        style={checked ? { background: "var(--teal)" } : { background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <span
          className={`absolute top-[1px] h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[20px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}
