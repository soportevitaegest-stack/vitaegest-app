import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { fullName, initials, ageFrom, activeOrder } from "@/lib/utils/format";
import type { Patient } from "@/types/domain";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  attended: "Atendido",
  cancelled: "Cancelado",
  no_show: "Ausente",
};

type EvolutionRow = {
  id: string;
  evolution_date: string;
  soap_subjective: string | null;
  soap_objective: string | null;
  soap_assessment: string | null;
  soap_plan: string | null;
  treatment_done: string | null;
  structured_data: { eva?: number } | null;
};

// NEXT 14: params es un objeto síncrono (en Next 15 sería una Promise).
export default async function FichaPacientePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, first_name, last_name, document_id, birth_date, sex, phone, email, notes, is_active, medical_background, treatment_orders(total_sessions, used_sessions, status)"
    )
    .eq("id", params.id)
    .single();

  if (!patient) notFound();
  const p = patient as unknown as Patient;

  const [{ data: evolutionsData }, { data: appointments }] = await Promise.all([
    supabase
      .from("clinical_evolutions")
      .select(
        "id, evolution_date, soap_subjective, soap_objective, soap_assessment, soap_plan, treatment_done, structured_data"
      )
      .eq("patient_id", params.id)
      .order("evolution_date", { ascending: false })
      .limit(20),
    supabase
      .from("appointments")
      .select("id, start_at, status, area")
      .eq("patient_id", params.id)
      .order("start_at", { ascending: false })
      .limit(5),
  ]);

  const evolutions = (evolutionsData ?? []) as unknown as EvolutionRow[];
  const bono = activeOrder(p.treatment_orders);
  const bg = p.medical_background ?? {};
  const name = fullName(p);
  const card = "bg-surface border border-line rounded-xl3 shadow-soft p-5";
  const evaTone = (v?: number) => (v == null ? "var(--muted)" : v >= 7 ? "var(--rose)" : v >= 4 ? "var(--amber)" : "var(--emerald-ink)");

  return (
    <>
      <Topbar title="Ficha del paciente" subtitle={name} />
      <main className="flex-1 overflow-y-auto px-5 md:px-7 py-6" style={{ background: "var(--canvas)" }}>
        <div className="mb-4">
          <Link href="/pacientes" className="text-[13px] font-semibold" style={{ color: "var(--primary-ink)" }}>
            ← Volver a pacientes
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-5 items-start">
          {/* Columna izquierda: datos base + bono + antecedentes */}
          <div className="flex flex-col gap-5">
            <section className={card}>
              <div className="flex items-center gap-3.5">
                <div
                  className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-lg font-display font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,var(--primary),var(--teal))" }}
                >
                  {initials(name)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-[17px] truncate">{name}</h2>
                  <p className="text-[13px] text-muted">{ageFrom(p.birth_date)} años · {p.phone ?? "sin teléfono"}</p>
                </div>
              </div>
              {p.notes && <p className="text-[13px] text-muted mt-3.5 leading-snug"><span className="font-semibold text-ink">Motivo: </span>{p.notes}</p>}
            </section>

            <section className={card}>
              <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Bono / cobertura</h3>
              {bono ? (
                <div className="rounded-xl2 border border-line p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">Sesiones restantes</span>
                    <span className="text-[13px] font-bold tnum" style={{ color: "var(--teal-ink)" }}>
                      {bono.total_sessions - bono.used_sessions} de {bono.total_sessions}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl2 border border-dashed border-line p-3 text-center text-[12.5px] text-muted" style={{ background: "var(--surface-2)" }}>
                  Particular · sin bono activo
                </div>
              )}
            </section>

            <section className={card}>
              <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Antecedentes</h3>
              <dl className="grid gap-2 text-[13px]">
                <div><dt className="font-semibold">Generales</dt><dd className="text-muted">{bg.antecedentes || "—"}</dd></div>
                <div><dt className="font-semibold">Cirugías</dt><dd className="text-muted">{bg.cirugias || "—"}</dd></div>
                <div><dt className="font-semibold">Medicación</dt><dd className="text-muted">{bg.medicacion || "—"}</dd></div>
                <div><dt className="font-semibold">Alergias</dt><dd className="text-muted">{bg.alergias || "—"}</dd></div>
              </dl>
            </section>

            <section className={card}>
              <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-3">Últimos turnos</h3>
              {appointments?.length ? (
                <div className="flex flex-col gap-2">
                  {appointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl2 border border-line px-3 py-2 text-[13px]" style={{ background: "var(--surface-2)" }}>
                      <span className="tnum">{new Date(a.start_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="font-semibold">{STATUS_LABEL[a.status] ?? a.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-muted">Sin turnos registrados.</p>
              )}
            </section>
          </div>

          {/* Columna derecha: historia clínica (evoluciones) */}
          <div className="flex flex-col gap-5">
            <section className={card}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide">Historia clínica · evoluciones</h3>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/pacientes/${p.id}/evaluaciones`}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 trans border border-line"
                    style={{ background: "var(--surface-2)", color: "var(--primary-ink)" }}
                  >
                    Ficha especializada
                  </Link>
                  <Link
                    href={`/pacientes/${p.id}/evoluciones/nueva`}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold rounded-xl2 px-3 py-1.5 text-white trans"
                    style={{ background: "var(--teal)" }}
                  >
                    + Nueva evolución
                  </Link>
                </div>
              </div>

              {evolutions.length ? (
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: "var(--border)" }} />
                  <div className="flex flex-col gap-3.5">
                    {evolutions.map((ev, i) => {
                      const eva = ev.structured_data?.eva;
                      const tone = evaTone(eva);
                      return (
                        <div key={ev.id} className="relative">
                          <span className="absolute -left-[18px] top-1 w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: tone, background: "var(--surface)" }} />
                          <div className="rounded-xl2 border border-line p-3.5" style={{ background: i === 0 ? "var(--surface-2)" : "var(--surface)" }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-display font-bold text-[13.5px]">
                                  {new Date(ev.evolution_date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                                {i === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>Última</span>}
                              </div>
                              {eva != null && <span className="text-[12px] font-bold tnum" style={{ color: tone }}>EVA {eva}/10</span>}
                            </div>
                            <div className="grid gap-1.5">
                              {([["S", ev.soap_subjective], ["O", ev.soap_objective], ["A", ev.soap_assessment], ["P", ev.soap_plan]] as const)
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <div key={k} className="flex gap-2">
                                    <span className="w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: "var(--primary-soft)", color: "var(--primary-ink)" }}>{k}</span>
                                    <p className="text-[12.5px] text-ink leading-snug">{v}</p>
                                  </div>
                                ))}
                            </div>
                            {ev.treatment_done && (
                              <div className="mt-2 rounded-lg p-2" style={{ background: "var(--teal-soft)" }}>
                                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--teal-ink)" }}>Tratamiento realizado</span>
                                <p className="text-[12.5px] text-ink leading-snug mt-0.5">{ev.treatment_done}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl2 border border-dashed border-line p-8 text-center" style={{ background: "var(--surface-2)" }}>
                  <p className="text-[13px] text-muted mb-3">Sin evoluciones cargadas todavía.</p>
                  <Link href={`/pacientes/${p.id}/evoluciones/nueva`} className="text-[13px] font-semibold" style={{ color: "var(--primary-ink)" }}>
                    Cargar la primera evolución →
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
