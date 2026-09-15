"use client";

import { useEffect, useState } from "react";
import {
  contarDatos,
  exportarBackupCompleto,
  exportarFacturacionExcel,
  exportarFacturacionPdf,
  exportarPacientesExcel,
  type FiltroFacturacion,
} from "@/lib/export";

/**
 * Panel de exportación · /exportar
 *
 * Todo se genera en el navegador. La única llamada al servidor es traer los
 * datos, que ya están protegidos por RLS.
 */

type Estado = { corriendo: string | null; paso: string; pct: number; error: string | null };

const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function ExportPanel() {
  const [filtro, setFiltro] = useState<FiltroFacturacion>({
    desde: iso(primerDiaMes),
    hasta: iso(hoy),
    concepto: "all",
    estado: null,
  });
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [st, setSt] = useState<Estado>({ corriendo: null, paso: "", pct: 0, error: null });

  useEffect(() => {
    contarDatos()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  async function correr(id: string, fn: (p: (paso: string, pct: number) => void) => Promise<void>) {
    setSt({ corriendo: id, paso: "Empezando…", pct: 0, error: null });
    try {
      await fn((paso, pct) => setSt((s) => ({ ...s, paso, pct })));
      setSt({ corriendo: null, paso: "", pct: 0, error: null });
    } catch (e) {
      setSt({
        corriendo: null,
        paso: "",
        pct: 0,
        error: e instanceof Error ? e.message : "No se pudo exportar",
      });
    }
  }

  const ocupado = st.corriendo !== null;

  return (
    <div className="space-y-6">
      {st.error && (
        <p className="rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-dark" role="alert">
          {st.error}
        </p>
      )}

      {/* ── Facturación ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink">Facturación de un período</h2>
        <p className="mt-1 text-sm text-ink-soft">
          El Excel trae tres hojas: resumen, detalle de cada cobro y totales por
          obra social. El PDF es el mismo resumen listo para imprimir.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <label className="text-sm">
            <span className="font-semibold text-ink">Desde</span>
            <input
              type="date"
              value={filtro.desde}
              onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-ink">Hasta</span>
            <input
              type="date"
              value={filtro.hasta}
              onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-ink">Concepto</span>
            <select
              value={filtro.concepto}
              onChange={(e) =>
                setFiltro({ ...filtro, concepto: e.target.value as FiltroFacturacion["concepto"] })
              }
              className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
            >
              <option value="all">Todo</option>
              <option value="session">Solo sesiones</option>
              <option value="deposit">Solo señas</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold text-ink">Estado</span>
            <select
              value={filtro.estado ?? ""}
              onChange={(e) =>
                setFiltro({
                  ...filtro,
                  estado: (e.target.value || null) as FiltroFacturacion["estado"],
                })
              }
              className="mt-1.5 w-full rounded-xl border border-ink-line bg-canvas px-3 py-2.5 text-ink outline-none focus:border-teal focus:bg-white"
            >
              <option value="">Todos</option>
              <option value="paid">Cobrado</option>
              <option value="unpaid">Sin cobrar</option>
              <option value="partial">Parcial</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Atajo onClick={() => setFiltro({ ...filtro, desde: iso(primerDiaMes), hasta: iso(hoy) })}>
            Este mes
          </Atajo>
          <Atajo
            onClick={() => {
              const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
              const h = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
              setFiltro({ ...filtro, desde: iso(d), hasta: iso(h) });
            }}
          >
            Mes pasado
          </Atajo>
          <Atajo
            onClick={() =>
              setFiltro({ ...filtro, desde: iso(new Date(hoy.getFullYear(), 0, 1)), hasta: iso(hoy) })
            }
          >
            Este año
          </Atajo>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={ocupado}
            onClick={() => correr("fact-xlsx", (p) => exportarFacturacionExcel(filtro, p))}
            className="btn-primary"
          >
            {st.corriendo === "fact-xlsx" ? st.paso : "Descargar Excel"}
          </button>
          <button
            disabled={ocupado}
            onClick={() => correr("fact-pdf", (p) => exportarFacturacionPdf(filtro, p))}
            className="btn-ghost"
          >
            {st.corriendo === "fact-pdf" ? st.paso : "Descargar PDF"}
          </button>
        </div>
      </section>

      {/* ── Pacientes ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-bold text-ink">Listado de pacientes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Datos de contacto, fecha de alta, última sesión y cuántas sesiones lleva
          cada una.
        </p>
        <button
          disabled={ocupado}
          onClick={() => correr("pac", (p) => exportarPacientesExcel(p))}
          className="btn-ghost mt-4"
        >
          {st.corriendo === "pac" ? st.paso : "Descargar Excel"}
        </button>
      </section>

      {/* ── Backup completo ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border-2 border-teal bg-white p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">Llevarte todos tus datos</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Un ZIP con absolutamente todo: pacientes, evoluciones, turnos, cobros y
          bonos. Viene en Excel para leerlo, y en JSON por si algún día querés
          pasarlo a otro sistema. Tus historias clínicas son tuyas.
        </p>

        {counts && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["Pacientes", counts.pacientes],
                ["Evoluciones", counts.evoluciones],
                ["Turnos", counts.turnos],
                ["Cobros", counts.cobros],
                ["Bonos", counts.bonos],
              ] as [string, number][]
            ).map(([label, n]) => (
              <div key={label} className="rounded-xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-primary">
                  {n?.toLocaleString("es-AR") ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}

        {st.corriendo === "backup" && (
          <div className="mt-5">
            <div className="flex justify-between text-sm text-ink-soft">
              <span>{st.paso}</span>
              <span className="tabular-nums">{st.pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-teal transition-all duration-300"
                style={{ width: `${st.pct}%` }}
              />
            </div>
          </div>
        )}

        <button
          disabled={ocupado}
          onClick={() => correr("backup", (p) => exportarBackupCompleto(p))}
          className="btn-primary mt-5"
        >
          {st.corriendo === "backup" ? "Preparando…" : "Descargar todo (.zip)"}
        </button>

        <p className="mt-3 text-xs text-ink-faint">
          Se arma en tu navegador: los datos no pasan por ningún servidor. Con
          muchas evoluciones puede tardar un minuto — no cierres la pestaña.
        </p>
      </section>

      <p className="rounded-xl bg-canvas px-5 py-4 text-sm text-ink-soft">
        <strong className="text-ink">Guardalos bien.</strong> Estos archivos
        contienen historias clínicas. Van a una carpeta tuya, no a un mail ni a
        un grupo de WhatsApp.
      </p>
    </div>
  );
}

function Atajo({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-primary"
    >
      {children}
    </button>
  );
}
