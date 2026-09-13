import { createClient } from "@/lib/supabase/server";
import { fmtTime } from "@/lib/utils/agenda";
import { todayKey } from "@/lib/utils/tz";

// Panel de seguimiento del portal, visto por el profesional. Server Component:
// lee directo de las tablas (RLS filtra por professional_id = auth.uid()).

type Plan = { id: string; title: string; area: string; created_at: string };
type Item = { id: string; name: string; detail: string | null; sort: number };
type Log = { item_id: string; log_date: string; completed: boolean };
type Checkin = { checkin_date: string; mood: string | null; notes: string | null };
type Entry = {
  id: string;
  entry_at: string;
  urine_ml: number | null;
  urgency: number | null;
  leak: string | null;
  liquid_type: string | null;
  liquid_ml: number | null;
};

const LEAK: Record<string, string> = { N: "—", E: "Esfuerzo", U: "Urgencia" };

function minusDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export async function PortalSeguimiento({
  patientId,
  scope,
}: {
  patientId: string;
  scope?: string | null;
}) {
  const supabase = await createClient();
  const today = todayKey();
  const since = minusDays(today, 6);
  const showDiary = scope !== "exercises"; // dermato = sin diario miccional

  const { data: planRow } = await supabase
    .from("exercise_plans")
    .select("id, title, area, created_at")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = planRow as Plan | null;

  const [{ data: itemsData }, { data: logsData }, { data: checkinsData }, { data: entriesData }] =
    await Promise.all([
      plan
        ? supabase.from("exercise_items").select("id, name, detail, sort").eq("plan_id", plan.id).order("sort")
        : Promise.resolve({ data: [] }),
      supabase
        .from("exercise_logs")
        .select("item_id, log_date, completed")
        .eq("patient_id", patientId)
        .gte("log_date", since),
      supabase
        .from("patient_checkins")
        .select("checkin_date, mood, notes")
        .eq("patient_id", patientId)
        .order("checkin_date", { ascending: false })
        .limit(5),
      supabase
        .from("voiding_diary_entries")
        .select("id, entry_at, urine_ml, urgency, leak, liquid_type, liquid_ml")
        .eq("patient_id", patientId)
        .order("entry_at", { ascending: false })
        .limit(12),
    ]);

  const items = (itemsData ?? []) as Item[];
  const logs = (logsData ?? []) as Log[];
  const checkins = (checkinsData ?? []) as Checkin[];
  const entries = (entriesData ?? []) as Entry[];

  const doneToday = new Set(logs.filter((l) => l.log_date === today && l.completed).map((l) => l.item_id));
  const completed7d = logs.filter((l) => l.completed).length;
  const adherence7d = items.length ? Math.min(100, Math.round((completed7d / (items.length * 7)) * 100)) : 0;

  const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";
  const hasActivity = plan || checkins.length > 0 || entries.length > 0;

  if (!hasActivity) {
    return (
      <section className={card}>
        <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Seguimiento · Portal del paciente</h3>
        <div className="rounded-xl2 border border-dashed border-line p-6 text-center text-[13px] text-muted" style={{ background: "var(--surface-2)" }}>
          El paciente todavía no usó el portal. Generá y compartí el enlace desde arriba.
        </div>
      </section>
    );
  }

  return (
    <section className={`grid grid-cols-1 gap-5 ${showDiary ? "lg:grid-cols-2" : ""}`}>
      {/* Plan de ejercicios + adherencia */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide">Plan de ejercicios</h3>
          {plan && (
            <span className="text-[12px] font-bold tnum px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>
              {adherence7d}% · 7 días
            </span>
          )}
        </div>

        {plan ? (
          <>
            <p className="font-display font-bold text-[14.5px] mb-1">{plan.title}</p>
            <p className="text-[12.5px] text-muted mb-3">{doneToday.size} de {items.length} hechos hoy</p>
            <div className="flex flex-col gap-1.5">
              {items.map((it) => {
                const done = doneToday.has(it.id);
                return (
                  <div key={it.id} className="flex items-center gap-2.5 rounded-xl2 border border-line px-3 py-2" style={{ background: "var(--surface-2)" }}>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ background: done ? "var(--emerald-ink)" : "var(--border)" }} />
                    <span className="text-[13px] font-medium flex-1 truncate">{it.name}</span>
                    {it.detail && <span className="text-[11.5px] text-muted truncate max-w-[45%]">{it.detail}</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-muted">Sin plan asignado.</p>
        )}

        {checkins.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line">
            <h4 className="text-[11.5px] font-semibold text-muted uppercase tracking-wide mb-2">Cómo se sintió</h4>
            <div className="flex flex-col gap-1.5">
              {checkins.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[12.5px]">
                  <span className="tnum text-muted w-16 shrink-0">{new Date(c.checkin_date + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</span>
                  <span className="font-semibold">{c.mood ?? "—"}</span>
                  {c.notes && <span className="text-muted truncate">· {c.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diario miccional (solo piso pélvico) */}
      {showDiary && (
      <div className={card}>
        <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-3">Diario miccional · últimos registros</h3>
        {entries.length === 0 ? (
          <p className="text-[13px] text-muted">Sin registros cargados todavía.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12.5px]" style={{ minWidth: 340 }}>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="font-semibold px-1 py-1.5">Hora</th>
                  <th className="font-semibold px-1 py-1.5 text-right">Orina</th>
                  <th className="font-semibold px-1 py-1.5">Urg.</th>
                  <th className="font-semibold px-1 py-1.5">Escape</th>
                  <th className="font-semibold px-1 py-1.5">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-1 py-2 tnum">{fmtTime(e.entry_at)}</td>
                    <td className="px-1 py-2 text-right tnum">{e.urine_ml != null ? `${e.urine_ml} ml` : "—"}</td>
                    <td className="px-1 py-2 tnum">{e.urgency ?? "—"}</td>
                    <td className="px-1 py-2">{e.leak ? LEAK[e.leak] ?? e.leak : "—"}</td>
                    <td className="px-1 py-2">{e.liquid_type ? `${e.liquid_type}${e.liquid_ml ? ` (${e.liquid_ml})` : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
