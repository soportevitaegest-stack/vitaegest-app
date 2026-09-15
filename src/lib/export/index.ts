"use client";

import { createClient } from "@/lib/supabase/client";
import { buildWorkbook, downloadBlob, stamp, type SheetSpec } from "./sheet";
import { buildBillingPdf, buildPatientPdf, type Membrete } from "./pdf";

/**
 * VitaeGest · Exportaciones. Todo corre en el navegador de la profesional:
 *   · No consume tiempo de función en Vercel (el plan Hobby corta a los 10 s).
 *   · Los datos clínicos no pasan por ningún servidor intermedio.
 *
 * Las librerías pesadas (ExcelJS, jsPDF, JSZip) entran por import() dinámico,
 * así que solo bajan cuando alguien aprieta Exportar.
 *
 * NOTA: si tu cliente de Supabase para componentes cliente no se llama
 * `createClient`, ajustá el import de arriba.
 */

export type Progreso = (paso: string, pct: number) => void;

const PARTES = [
  "perfil",
  "pacientes",
  "evoluciones",
  "turnos",
  "cobros",
  "bonos",
  "obras_sociales",
  "prestaciones",
  "adjuntos",
  "plantillas",
] as const;

type Parte = (typeof PARTES)[number];

const NOMBRE_HOJA: Record<Parte, string> = {
  perfil: "Perfil",
  pacientes: "Pacientes",
  evoluciones: "Evoluciones",
  turnos: "Turnos",
  cobros: "Cobros",
  bonos: "Bonos y órdenes",
  obras_sociales: "Obras sociales",
  prestaciones: "Prestaciones",
  adjuntos: "Adjuntos",
  plantillas: "Plantillas",
};

async function membrete(): Promise<Membrete> {
  const supabase = createClient();
  const { data } = await supabase
    .from("professionals")
    .select("full_name, license_number, clinic_name, phone")
    .single();
  return (
    data ?? { full_name: "Profesional", license_number: null, clinic_name: null, phone: null }
  );
}

const fmtFecha = (iso: string) => iso.split("-").reverse().join("/");

/* ══ 1 · FACTURACIÓN ═══════════════════════════════════════════════════════ */

export type FiltroFacturacion = {
  desde: string; // YYYY-MM-DD
  hasta: string;
  concepto?: "all" | "session" | "deposit";
  estado?: "paid" | "unpaid" | "partial" | "refunded" | null;
};

async function traerFacturacion(f: FiltroFacturacion) {
  const supabase = createClient();
  const params = {
    p_from: f.desde,
    p_to: f.hasta,
    p_kind: f.concepto ?? "all",
    p_status: f.estado ?? null,
  };
  const [filas, resumen] = await Promise.all([
    supabase.rpc("export_billing", params),
    supabase.rpc("export_billing_summary", params),
  ]);
  if (filas.error) throw filas.error;
  if (resumen.error) throw resumen.error;
  return {
    filas: (filas.data ?? []) as Record<string, unknown>[],
    resumen: (resumen.data ?? {}) as Record<string, unknown>,
  };
}

export async function exportarFacturacionExcel(f: FiltroFacturacion, onProgress?: Progreso) {
  onProgress?.("Trayendo los cobros…", 15);
  const { filas, resumen } = await traerFacturacion(f);
  if (!filas.length) throw new Error("No hay cobros en ese período.");

  const prof = await membrete();
  onProgress?.("Armando el Excel…", 60);

  const detalle: SheetSpec = {
    name: "Detalle",
    headerLines: [
      `Facturación · ${prof.full_name}`,
      `Período ${fmtFecha(f.desde)} al ${fmtFecha(f.hasta)}${
        prof.license_number ? ` · Mat. ${prof.license_number}` : ""
      }`,
    ],
    columns: [
      { key: "fecha", header: "Fecha", width: 12 },
      { key: "turno", header: "Turno", width: 17 },
      { key: "paciente", header: "Paciente", width: 28 },
      { key: "documento", header: "Documento", width: 13 },
      { key: "concepto", header: "Concepto", width: 11 },
      { key: "prestacion", header: "Prestación", width: 26 },
      { key: "cobertura", header: "Cobertura", width: 13 },
      { key: "obra_social", header: "Obra social", width: 22 },
      { key: "plan", header: "Plan", width: 14 },
      { key: "orden", header: "Orden", width: 14 },
      { key: "honorarios", header: "Honorarios", format: "money", total: true, width: 14 },
      { key: "coseguro", header: "Coseguro", format: "money", total: true, width: 12 },
      { key: "estampilla", header: "Estampilla", format: "money", total: true, width: 12 },
      { key: "total", header: "Total", format: "money", total: true, width: 14 },
      { key: "estado", header: "Estado", width: 12 },
      { key: "medio", header: "Medio", width: 15 },
      { key: "observaciones", header: "Observaciones", width: 34 },
    ],
    rows: filas,
  };

  const porOS = (resumen.por_obra_social ?? []) as Record<string, unknown>[];
  const resumenSheet: SheetSpec = {
    name: "Resumen",
    headerLines: [`Resumen del período`, `${fmtFecha(f.desde)} al ${fmtFecha(f.hasta)}`],
    columns: [
      { key: "concepto", header: "Concepto", width: 26 },
      { key: "valor", header: "Valor", width: 18, format: "money" },
    ],
    rows: [
      { concepto: "Honorarios", valor: resumen.honorarios },
      { concepto: "Coseguros", valor: resumen.coseguros },
      { concepto: "Estampillas", valor: resumen.estampillas },
      { concepto: "Total facturado", valor: resumen.total },
      { concepto: "Cobrado", valor: resumen.cobrado },
      { concepto: "Pendiente de cobro", valor: resumen.pendiente },
      { concepto: "Señas de reserva", valor: resumen.senas },
    ],
  };

  const osSheet: SheetSpec = {
    name: "Por obra social",
    columns: [
      { key: "obra_social", header: "Obra social", width: 30 },
      { key: "cobros", header: "Cobros", width: 10, format: "number", total: true },
      { key: "total", header: "Total", width: 16, format: "money", total: true },
    ],
    rows: porOS,
  };

  const blob = await buildWorkbook([resumenSheet, detalle, osSheet], {
    title: `Facturación ${f.desde} a ${f.hasta}`,
    author: prof.full_name,
  });
  onProgress?.("Descargando…", 100);
  downloadBlob(blob, stamp("facturacion", "xlsx", f.desde, f.hasta));
}

export async function exportarFacturacionPdf(f: FiltroFacturacion, onProgress?: Progreso) {
  onProgress?.("Trayendo los cobros…", 20);
  const { filas, resumen } = await traerFacturacion(f);
  if (!filas.length) throw new Error("No hay cobros en ese período.");

  const prof = await membrete();
  onProgress?.("Armando el PDF…", 65);
  const blob = await buildBillingPdf({
    profesional: prof,
    desde: fmtFecha(f.desde),
    hasta: fmtFecha(f.hasta),
    filas,
    resumen,
  });
  onProgress?.("Descargando…", 100);
  downloadBlob(blob, stamp("facturacion", "pdf", f.desde, f.hasta));
}

/* ══ 2 · HISTORIA CLÍNICA DE UNA PACIENTE ══════════════════════════════════ */

export async function exportarHistoriaPdf(patientId: string, onProgress?: Progreso) {
  const supabase = createClient();
  onProgress?.("Trayendo la historia clínica…", 25);

  const { data, error } = await supabase.rpc("export_patient_record", { p_patient: patientId });
  if (error) throw error;

  const rec = data as {
    profesional: Membrete;
    paciente: Record<string, unknown>;
    evoluciones: Record<string, unknown>[];
    turnos: Record<string, unknown>[];
    bonos: Record<string, unknown>[];
  };

  onProgress?.("Armando el PDF…", 70);
  const blob = await buildPatientPdf(rec);

  const nombre = String(rec.paciente.nombre ?? "paciente")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();

  onProgress?.("Descargando…", 100);
  downloadBlob(blob, stamp(`historia-${nombre}`, "pdf"));
}

/* ══ 3 · BACKUP COMPLETO ═══════════════════════════════════════════════════ */

export async function contarDatos(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("export_counts");
  if (error) throw error;
  return (data ?? {}) as Record<string, number>;
}

/**
 * ZIP con TODO: un Excel con una hoja por tabla, los JSON crudos (por si hay
 * que migrar a otro sistema) y un LEEME.txt que explica qué es cada cosa.
 *
 * Trae una tabla por vez a propósito: con 400 pacientes y 3.000 evoluciones,
 * pedir todo junto se pasa del timeout de la base.
 */
export async function exportarBackupCompleto(onProgress?: Progreso) {
  const supabase = createClient();
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const prof = await membrete();
  const datos: Partial<Record<Parte, Record<string, unknown>[]>> = {};

  for (let i = 0; i < PARTES.length; i++) {
    const parte = PARTES[i];
    onProgress?.(`Descargando ${NOMBRE_HOJA[parte].toLowerCase()}…`, Math.round((i / PARTES.length) * 70));
    const { data, error } = await supabase.rpc("export_backup_part", { p_part: parte });
    if (error) throw error;
    datos[parte] = (data ?? []) as Record<string, unknown>[];
    zip.file(`json/${parte}.json`, JSON.stringify(data ?? [], null, 2));
  }

  onProgress?.("Armando el Excel…", 78);
  const sheets: SheetSpec[] = PARTES.filter((p) => (datos[p]?.length ?? 0) > 0).map((parte) => {
    const rows = datos[parte]!;
    const keys = Object.keys(rows[0]);
    return {
      name: NOMBRE_HOJA[parte],
      columns: keys.map((k) => ({
        key: k,
        header: etiquetaColumna(k),
        format: /amount|price|total|monto/i.test(k) ? ("money" as const) : undefined,
      })),
      rows,
    };
  });

  const xlsx = await buildWorkbook(sheets, {
    title: `Backup VitaeGest · ${prof.full_name}`,
    author: prof.full_name,
  });
  zip.file("vitaegest-datos.xlsx", xlsx);

  const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  zip.file(
    "LEEME.txt",
    [
      `BACKUP DE VITAEGEST`,
      `${prof.full_name}${prof.license_number ? ` · Mat. ${prof.license_number}` : ""}`,
      `Generado el ${fecha}`,
      ``,
      `QUÉ HAY ACÁ ADENTRO`,
      ``,
      `  vitaegest-datos.xlsx`,
      `      Todo en un Excel, una hoja por tipo de dato. Es lo que vas a`,
      `      querer abrir si necesitás leer o buscar algo.`,
      ``,
      `  json/`,
      `      Los mismos datos en formato crudo, tal como están en la base.`,
      `      Sirve si alguna vez querés pasar todo a otro sistema: cualquier`,
      `      programador puede leerlos sin pedirnos nada.`,
      ``,
      `CONTENIDO`,
      ...PARTES.map((p) => `  ${NOMBRE_HOJA[p].padEnd(18)} ${datos[p]?.length ?? 0} registros`),
      ``,
      `SOBRE LOS ARCHIVOS ADJUNTOS`,
      `  La hoja "Adjuntos" lista los estudios y fotos que cargaste (nombre,`,
      `  tipo y fecha), pero no los archivos en sí. Esos se descargan desde`,
      `  la ficha de cada paciente.`,
      ``,
      `IMPORTANTE`,
      `  Este archivo contiene historias clínicas. Guardalo en un lugar`,
      `  seguro y no lo compartas por mail ni por WhatsApp.`,
    ].join("\n"),
  );

  onProgress?.("Comprimiendo…", 90);
  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (m) => onProgress?.("Comprimiendo…", 90 + Math.round(m.percent / 10)),
  );

  onProgress?.("Descargando…", 100);
  downloadBlob(blob, stamp("vitaegest-backup", "zip"));
}

/* ══ 4 · PADRÓN DE PACIENTES ═══════════════════════════════════════════════ */

export async function exportarPacientesExcel(onProgress?: Progreso) {
  const supabase = createClient();
  onProgress?.("Trayendo pacientes…", 25);
  const { data, error } = await supabase.rpc("export_patients_list");
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  if (!rows.length) throw new Error("Todavía no cargaste pacientes.");

  const prof = await membrete();
  onProgress?.("Armando el Excel…", 70);
  const blob = await buildWorkbook(
    [
      {
        name: "Pacientes",
        headerLines: [`Pacientes · ${prof.full_name}`],
        columns: [
          { key: "apellido", header: "Apellido", width: 20 },
          { key: "nombre", header: "Nombre", width: 20 },
          { key: "documento", header: "Documento", width: 14 },
          { key: "nacimiento", header: "Nacimiento", width: 13 },
          { key: "telefono", header: "Teléfono", width: 16 },
          { key: "email", header: "Email", width: 26 },
          { key: "direccion", header: "Dirección", width: 30 },
          { key: "estado", header: "Estado", width: 11 },
          { key: "alta", header: "Alta", width: 12 },
          { key: "ultima_sesion", header: "Última sesión", width: 14 },
          { key: "sesiones", header: "Sesiones", width: 10, format: "number", total: true },
        ],
        rows,
      },
    ],
    { title: "Pacientes", author: prof.full_name },
  );
  onProgress?.("Descargando…", 100);
  downloadBlob(blob, stamp("pacientes", "xlsx"));
}

function etiquetaColumna(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
