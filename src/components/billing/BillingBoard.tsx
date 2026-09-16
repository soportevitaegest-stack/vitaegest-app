"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PaymentRow, PaymentStatus } from "@/types/billing";
import type { PatientLite, InsurerLite } from "@/types/agenda";
import { createPayment, markPaid, createOrder } from "@/server/actions/billing";

const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");
const input =
  "w-full bg-surface-2 border border-line rounded-xl2 px-3 py-2.5 text-sm text-ink outline-none focus:border-primary trans";
const lbl = "block text-[12.5px] font-semibold text-ink mb-1.5";

const METHODS: [string, string][] = [
  ["cash", "Efectivo"], ["transfer", "Transferencia"], ["mercadopago", "Mercado Pago"], ["card", "Débito/Crédito"], ["other", "Otro"],
];
const methodLabel = (m: string | null) => METHODS.find(([k]) => k === m)?.[1] ?? "—";

const STATUS_META: Record<PaymentStatus, { label: string; bg: string; fg: string }> = {
  unpaid: { label: "Pendiente", bg: "var(--amber-soft)", fg: "var(--amber)" },
  partial: { label: "Parcial", bg: "var(--amber-soft)", fg: "var(--amber)" },
  paid: { label: "Pagado", bg: "var(--emerald-soft)", fg: "var(--emerald-ink)" },
  refunded: { label: "Reembolsado", bg: "var(--surface-2)", fg: "var(--muted)" },
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl3 p-4 shadow-soft">
      <div className="text-[12px] font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className="font-display font-extrabold text-2xl tnum mt-1" style={{ color: tone ?? "var(--ink)" }}>{value}</div>
    </div>
  );
}

export function BillingBoard({
  payments,
  patients,
  insurers,
}: {
  payments: PaymentRow[];
  patients: PatientLite[];
  insurers: InsurerLite[];
}) {
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [open, setOpen] = useState<"nuevo" | "bono" | null>(null);
  const [cobrar, setCobrar] = useState<PaymentRow | null>(null);

  const kpis = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid");
    const unpaid = payments.filter((p) => p.status === "unpaid" || p.status === "partial");
    const cobrado = paid.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const porCobrar = unpaid.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const os = payments.filter((p) => p.coverage_type === "obra_social").length;
    return { cobrado, porCobrar, os, count: payments.length };
  }, [payments]);

  const rows = useMemo(
    () => payments.filter((p) => (filter === "all" ? true : filter === "paid" ? p.status === "paid" : p.status !== "paid")),
    [payments, filter]
  );

  const patientName = (p: PaymentRow) => (p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : "Paciente");

  // NUEVO: Motor de exportación a CSV (Excel)
  const exportCSV = () => {
    const headers = ["Fecha", "Paciente", "Cobertura", "Honorarios", "Coseguro", "Estampilla", "Total", "Método", "Estado"];
    
    const csvRows = rows.map((p) => {
      const date = new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const patient = patientName(p);
      const coverage = p.coverage_type === "obra_social" ? "Obra social" : "Particular";
      const hon = p.amount || 0;
      const copay = p.copay_amount || 0;
      const stamp = p.stamp_amount || 0;
      const total = p.total_amount || 0;
      const method = p.status === "paid" ? methodLabel(p.method) : "—";
      const status = STATUS_META[p.status].label;

      return [date, patient, coverage, hon, copay, stamp, total, method, status]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`) // Evita que las comas rompan las columnas
        .join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    // El \uFEFF le avisa a Excel que use UTF-8 (para que se vean bien los acentos)
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `VitaeGest_Facturacion_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
        <Stat label="Cobrado" value={money(kpis.cobrado)} tone="var(--emerald-ink)" />
        <Stat label="Por cobrar" value={money(kpis.porCobrar)} tone="var(--coral-ink)" />
        <Stat label="Por obra social" value={`${kpis.os} de ${kpis.count}`} />
      </div>

      {/* Acciones + filtro */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {(["all", "unpaid", "paid"] as const).map((k) => {
            const on = filter === k;
            const label = k === "all" ? "Todos" : k === "unpaid" ? "Pendientes" : "Pagados";
            return (
              <button key={k} onClick={() => setFilter(k)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg trans"
                style={on ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
                {label}
              </button>
            );
          })}
        </div>
        
        {/* BOTONERA: Se agregó el botón Exportar */}
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line trans hover:bg-[var(--surface-2)]" style={{ color: "var(--ink)" }}>
            ⬇ Exportar CSV
          </button>
          <button onClick={() => setOpen(open === "bono" ? null : "bono")} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line trans" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
            Cargar bono
          </button>
          <button onClick={() => setOpen(open === "nuevo" ? null : "nuevo")} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white trans" style={{ background: "var(--teal)" }}>
            + Nuevo cobro
          </button>
        </div>
      </div>

      {open === "nuevo" && (
        <NuevoCobroForm patients={patients} insurers={insurers} onDone={() => setOpen(null)} />
      )}
      {open === "bono" && (
        <CargarBonoForm patients={patients} insurers={insurers} onDone={() => setOpen(null)} />
      )}

      {/* Tabla */}
      <div className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 720 }}>
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted" style={{ background: "var(--surface-2)" }}>
                <th className="font-semibold px-5 py-2.5">Fecha</th>
                <th className="font-semibold px-3 py-2.5">Paciente</th>
                <th className="font-semibold px-3 py-2.5">Cobertura</th>
                <th className="font-semibold px-3 py-2.5 text-right">Monto</th>
                <th className="font-semibold px-3 py-2.5">Método</th>
                <th className="font-semibold px-3 py-2.5">Estado</th>
                <th className="font-semibold px-5 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-muted">Sin cobros para este filtro.</td></tr>
              )}
              {rows.map((p) => {
                const st = STATUS_META[p.status];
                const extra = Number(p.copay_amount || 0) + Number(p.stamp_amount || 0);
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-5 py-3 tnum text-muted">{new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</td>
                    <td className="px-3 py-3 font-medium">{patientName(p)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5" style={p.coverage_type === "obra_social" ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                        {p.coverage_type === "obra_social" ? "Obra social" : "Particular"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-display font-bold tnum">{money(p.total_amount)}</div>
                      {extra > 0 && <div className="text-[10.5px] text-muted tnum">Hon {money(p.amount)} · +{money(extra)}</div>}
                    </td>
                    <td className="px-3 py-3 text-muted">{p.status === "paid" ? methodLabel(p.method) : "—"}</td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                    <td className="px-5 py-3 text-right">
                      {p.status !== "paid" ? (
                        <button onClick={() => setCobrar(p)} className="text-[12px] font-semibold rounded-lg px-3 py-1.5 text-white" style={{ background: "var(--teal)" }}>Cobrar</button>
                      ) : (
                        <span className="text-[12px] text-muted">Cobrado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cobrar && (
        <CobrarModal payment={cobrar} onClose={() => setCobrar(null)} />
      )}
    </div>
  );
}

// ---------- Subcomponentes ----------
type Common = {
  patients: PatientLite[];
  insurers: InsurerLite[];
  onDone: () => void;
};

function NuevoCobroForm({ patients, insurers, onDone }: Common) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    patient_id: patients[0]?.id ?? "",
    amount: 0,
    coverage_type: "particular",
    insurer_id: insurers[0]?.id ?? "",
    copay_amount: 0,
    stamp_amount: 0,
    status: "unpaid",
    method: "cash",
  });
  const set = (k: string, v: string | number) => setF((s) => ({ ...s, [k]: v }));
  const total = Number(f.amount || 0) + Number(f.copay_amount || 0) + Number(f.stamp_amount || 0);
  const save = () =>
    start(async () => {
      const res = await createPayment(f);
      if (res?.error) { alert("No se pudo crear el cobro: " + res.error); return; }
      onDone();
      router.refresh();
    });
  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-3.5">
      <h3 className="font-display font-bold text-[15px]">Nuevo cobro</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block col-span-2 sm:col-span-1"><span className={lbl}>Paciente</span>
          <select className={input} value={f.patient_id} onChange={(e) => set("patient_id", e.target.value)}>
            {patients.length === 0 && <option value="">— No hay pacientes —</option>}
            {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </label>
        <label className="block"><span className={lbl}>Honorarios ($)</span><input type="number" className={input} value={f.amount} onChange={(e) => set("amount", Number(e.target.value))} /></label>
        <label className="block"><span className={lbl}>Cobertura</span>
          <select className={input} value={f.coverage_type} onChange={(e) => set("coverage_type", e.target.value)}>
            <option value="particular">Particular</option><option value="obra_social">Obra Social</option>
          </select>
        </label>
        {f.coverage_type === "obra_social" && (
          <>
            <label className="block"><span className={lbl}>Obra social</span>
              <select className={input} value={f.insurer_id} onChange={(e) => set("insurer_id", e.target.value)}>
                {insurers.length === 0 && <option value="">— Sin obras sociales —</option>}
                {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
            <label className="block"><span className={lbl}>Coseguro ($)</span><input type="number" className={input} value={f.copay_amount} onChange={(e) => set("copay_amount", Number(e.target.value))} /></label>
            <label className="block"><span className={lbl}>Estampilla ($)</span><input type="number" className={input} value={f.stamp_amount} onChange={(e) => set("stamp_amount", Number(e.target.value))} /></label>
          </>
        )}
        <label className="block"><span className={lbl}>Estado</span>
          <select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="unpaid">Pendiente</option><option value="paid">Pagado</option>
          </select>
        </label>
        {f.status === "paid" && (
          <label className="block"><span className={lbl}>Método</span>
            <select className={input} value={f.method} onChange={(e) => set("method", e.target.value)}>
              {METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">Total: <b className="tnum text-ink">{money(total)}</b></span>
        <div className="flex gap-2">
          <button onClick={onDone} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Cancelar</button>
          <button onClick={save} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>{pending ? "Guardando…" : "Crear cobro"}</button>
        </div>
      </div>
    </div>
  );
}

function CargarBonoForm({ patients, insurers, onDone }: Common) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    patient_id: patients[0]?.id ?? "",
    coverage_type: "obra_social",
    insurer_id: insurers[0]?.id ?? "",
    total_sessions: 10,
    order_number: "",
  });
  const set = (k: string, v: string | number) => setF((s) => ({ ...s, [k]: v }));
  const save = () =>
    start(async () => {
      const res = await createOrder(f);
      if (res?.error) { alert("No se pudo cargar el bono: " + res.error); return; }
      onDone();
      router.refresh();
    });
  return (
    <div className="bg-surface border border-line rounded-xl3 shadow-soft p-5 grid gap-3.5">
      <h3 className="font-display font-bold text-[15px]">Cargar bono / orden</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block col-span-2 sm:col-span-1"><span className={lbl}>Paciente</span>
          <select className={input} value={f.patient_id} onChange={(e) => set("patient_id", e.target.value)}>
            {patients.length === 0 && <option value="">— No hay pacientes —</option>}
            {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </label>
        <label className="block"><span className={lbl}>Cobertura</span>
          <select className={input} value={f.coverage_type} onChange={(e) => set("coverage_type", e.target.value)}>
            <option value="obra_social">Obra Social</option><option value="particular">Particular</option>
          </select>
        </label>
        {f.coverage_type === "obra_social" && (
          <label className="block"><span className={lbl}>Obra social</span>
            <select className={input} value={f.insurer_id} onChange={(e) => set("insurer_id", e.target.value)}>
              {insurers.length === 0 && <option value="">— Sin obras sociales —</option>}
              {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
        )}
        <label className="block"><span className={lbl}>Sesiones totales</span><input type="number" min={1} className={input} value={f.total_sessions} onChange={(e) => set("total_sessions", Number(e.target.value))} /></label>
        <label className="block"><span className={lbl}>Nº de orden</span><input className={input} value={f.order_number} onChange={(e) => set("order_number", e.target.value)} placeholder="Autorización" /></label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Cancelar</button>
        <button onClick={save} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>{pending ? "Guardando…" : "Cargar bono"}</button>
      </div>
    </div>
  );
}

function CobrarModal({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [method, setMethod] = useState("cash");
  const [copay, setCopay] = useState(Number(payment.copay_amount || 0));
  const [stamp, setStamp] = useState(Number(payment.stamp_amount || 0));
  const os = payment.coverage_type === "obra_social";
  const total = Number(payment.amount || 0) + Number(copay || 0) + Number(stamp || 0);
  const confirm = () =>
    start(async () => {
      const res = await markPaid(payment.id, { method, copay_amount: copay, stamp_amount: stamp });
      if (res?.error) { alert("No se pudo registrar el cobro: " + res.error); return; }
      onClose();
      router.refresh();
    });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(12,20,28,.45)" }} onMouseDown={onClose}>
      <div className="bg-surface border border-line rounded-xl3 shadow-lg2 w-full max-w-md p-5 grid gap-3.5" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-[16px]">Registrar cobro</h3>
        <label className="block"><span className={lbl}>Método de pago</span>
          <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {os && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={lbl}>Coseguro ($)</span><input type="number" className={input} value={copay} onChange={(e) => setCopay(Number(e.target.value))} /></label>
            <label className="block"><span className={lbl}>Estampilla ($)</span><input type="number" className={input} value={stamp} onChange={(e) => setStamp(Number(e.target.value))} /></label>
          </div>
        )}
        <div className="rounded-xl2 border p-3.5" style={{ borderColor: "var(--emerald)", background: "var(--emerald-soft)" }}>
          <div className="flex items-center justify-between font-display font-extrabold text-[15px]" style={{ color: "var(--emerald-ink)" }}>
            <span>Total a cobrar</span><span className="tnum">{money(total)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 border border-line" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Cancelar</button>
          <button onClick={confirm} disabled={pending} className="text-[12.5px] font-semibold rounded-xl2 px-3 py-2 text-white disabled:opacity-50" style={{ background: "var(--teal)" }}>{pending ? "Registrando…" : "Confirmar cobro"}</button>
        </div>
      </div>
    </div>
  );
}
