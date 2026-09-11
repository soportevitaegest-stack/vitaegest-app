import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { STATUS_META, AREA_LABELS, fmtTime } from "@/lib/utils/agenda";
import type { AppointmentRow } from "@/types/agenda";

export const dynamic = "force-dynamic";

const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR");

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl3 p-4 shadow-soft flex flex-col gap-2">
      <span className="text-[12px] font-medium text-muted uppercase tracking-wide">{label}</span>
      <span className="font-display font-extrabold text-2xl text-ink tnum leading-none">{value}</span>
      <div className="text-xs font-medium" style={{ color: tone ?? "var(--muted)" }}>{sub}</div>
    </div>
  );
}

export default async function InicioPage() {
  const supabase = await createClient();

  // Rango de "hoy" (TZ del runtime; para el demo alcanza).
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startToday.getDate() + 1);
  const todayDate = new Date().toISOString().slice(0, 10);

  const [{ data: apptsData }, { data: pendData }, { data: plansData }, { data: itemsData }, { data: logsData }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_at, end_at, status, area, reason, coverage_type, insurer_id, treatment_order_id, source, patients(first_name, last_name)")
        .gte("start_at", startToday.toISOString())
        .lt("start_at", startTomorrow.toISOString())
        .order("start_at", { ascending: true }),
      supabase.from("payments").select("total_amount, status").in("status", ["unpaid", "partial"]),
      supabase.from("exercise_plans").select("id, patient_id").eq("is_active", true),
      supabase.from("exercise_items").select("id, plan_id"),
      supabase.from("exercise_logs").select("item_id").eq("log_date", todayDate).eq("completed", true),
    ]);

  const appts = (apptsData ?? []) as unknown as AppointmentRow[];
  const attended = appts.filter((a) => a.status === "attended").length;
  const confirmed = appts.filter((a) => a.status === "confirmed").length;
  const pendingAp = appts.filter((a) => a.status === "pending").length;

  const pend = (pendData ?? []) as { total_amount: number }[];
  const pendTotal = pend.reduce((s, p) => s + Number(p.total_amount || 0), 0);

  // Adherencia: por plan activo, % de ítems con registro hoy; promedio entre planes.
  const plans = (plansData ?? []) as { id: string; patient_id: string }[];
  const items = (itemsData ?? []) as { id: string; plan_id: string }[];
  const loggedToday = new Set(((logsData ?? []) as { item_id: string }[]).map((l) => l.item_id));
  const adhValues = plans
    .map((pl) => {
      const its = items.filter((it) => it.plan_id === pl.id);
      if (its.length === 0) return null;
      const done = its.filter((it) => loggedToday.has(it.id)).length;
      return Math.round((done / its.length) * 100);
    })
    .filter((v): v is number => v !== null);
  const withPortal = adhValues.length;
  const adherence = withPortal ? Math.round(adhValues.reduce((a, b) => a + b, 0) / withPortal) : 0;

  const patientName = (a: AppointmentRow) => (a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Paciente");

  return (
    <>
      <Topbar title="Inicio" subtitle="Resumen de tu día" />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <Stat
            label="Turnos de hoy"
            value={String(appts.length)}
            tone="var(--emerald-ink)"
            sub={`${attended} atendidos · ${confirmed} confirmados · ${pendingAp} pendientes`}
          />
          <Stat
            label="Cobros pendientes"
            value={money(pendTotal)}
            tone="var(--coral-ink)"
            sub={`${pend.length} ${pend.length === 1 ? "cobro por registrar" : "cobros por registrar"}`}
          />
          <Stat
            label="Adherencia a portales"
            value={`${adherence}%`}
            tone={adherence >= 60 ? "var(--emerald-ink)" : "var(--coral-ink)"}
            sub={`${withPortal} ${withPortal === 1 ? "paciente activo en portal" : "pacientes activos en portal"}`}
          />
        </section>

        {/* Agenda de hoy */}
        <section className="bg-surface border border-line rounded-xl3 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-display font-bold text-[15px]">Agenda de hoy</h2>
            <Link href="/agenda" className="text-[12.5px] font-semibold" style={{ color: "var(--primary-ink)" }}>
              Ver agenda completa →
            </Link>
          </div>

          {appts.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-muted">No hay turnos para hoy.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {appts.map((a) => {
                const st = STATUS_META[a.status];
                return (
                  <div key={a.id} className="flex items-center gap-4 px-4 md:px-5 py-3.5">
                    <div className="w-14 text-center shrink-0">
                      <div className="font-display font-bold text-[15px] tnum leading-none">{fmtTime(a.start_at)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14.5px] truncate">{patientName(a)}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5" style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                          {AREA_LABELS[a.area]}
                        </span>
                        <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5" style={a.coverage_type === "obra_social" ? { background: "var(--primary-soft)", color: "var(--primary-ink)" } : { background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                          {a.coverage_type === "obra_social" ? "Obra social" : "Particular"}
                        </span>
                        {a.treatment_order_id && (
                          <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>Bono</span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-1" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
