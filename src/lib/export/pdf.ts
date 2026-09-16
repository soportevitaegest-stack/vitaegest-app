/**
 * VitaeGest · Generación de PDF en el navegador (jsPDF + autoTable).
 *
 * Dos documentos:
 *   · buildBillingPdf     → resumen de facturación de un período
 *   · buildPatientPdf     → historia clínica completa de una paciente
 *
 * Las dos llevan membrete con el nombre, la matrícula y el consultorio de la
 * profesional: es lo que hace que el informe sirva para derivar o presentar
 * ante una obra social.
 *
 * jsPDF usa Helvetica, que cubre acentos y ñ sin cargar fuentes externas.
 */

type Jsp = import("jspdf").jsPDF;

const EMERALD = [17, 120, 100] as const;
const TEAL = [26, 188, 156] as const;
const INK = [69, 90, 100] as const;
const INK_SOFT = [107, 127, 137] as const;
const LINE = [220, 228, 231] as const;

export type Membrete = {
  full_name: string;
  license_number?: string | null;
  clinic_name?: string | null;
  phone?: string | null;
};

async function nuevoDoc(): Promise<{ doc: Jsp; autoTable: typeof import("jspdf-autotable").default }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setFont("helvetica", "normal");
  return { doc, autoTable };
}

const M = 44; // margen

function encabezado(doc: Jsp, prof: Membrete, titulo: string, subtitulo?: string): number {
  // Barra esmeralda
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");

  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.text(prof.full_name, M, 52);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK_SOFT);
  const datos = [
    prof.license_number ? `Mat. ${prof.license_number}` : null,
    prof.clinic_name,
    prof.phone,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (datos) doc.text(datos, M, 68);

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(M, 80, doc.internal.pageSize.getWidth() - M, 80);

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text(titulo, M, 108);

  let y = 108;
  if (subtitulo) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK_SOFT);
    doc.text(subtitulo, M, 126);
    y = 126;
  }
  return y + 22;
}

function piePaginas(doc: Jsp, nota: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.setFont("helvetica", "normal");
    doc.text(nota, M, h - 26, { maxWidth: w - M * 2 - 60 });
    doc.text(`${i} / ${total}`, w - M, h - 26, { align: "right" });
  }
}

const money = (n: unknown) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 })
    .format(Number(n ?? 0));

const hoy = () =>
  new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

/* ── 1 · Facturación del período ──────────────────────────────────────────── */

export async function buildBillingPdf(input: {
  profesional: Membrete;
  desde: string;
  hasta: string;
  filas: Record<string, unknown>[];
  resumen: Record<string, unknown>;
}): Promise<Blob> {
  const { doc, autoTable } = await nuevoDoc();
  const y = encabezado(
    doc,
    input.profesional,
    "Resumen de facturación",
    `Período ${input.desde} al ${input.hasta}`,
  );

  // Tarjetas de totales
  const r = input.resumen;
  const tiles: [string, string][] = [
    ["Cobros", String(r.cobros ?? 0)],
    ["Pacientes", String(r.pacientes ?? 0)],
    ["Cobrado", money(r.cobrado)],
    ["Pendiente", money(r.pendiente)],
  ];
  const w = (doc.internal.pageSize.getWidth() - M * 2 - 24) / 4;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (w + 8);
    doc.setFillColor(246, 250, 249);
    doc.roundedRect(x, y, w, 46, 6, 6, "F");
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.text(label.toUpperCase(), x + 10, y + 16);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...EMERALD);
    doc.text(value, x + 10, y + 34);
    doc.setFont("helvetica", "normal");
  });

  const cols = [
    { header: "Fecha", dataKey: "fecha" },
    { header: "Paciente", dataKey: "paciente" },
    { header: "Concepto", dataKey: "concepto" },
    { header: "Cobertura", dataKey: "cobertura" },
    { header: "Obra social", dataKey: "obra_social" },
    { header: "Total", dataKey: "total" },
    { header: "Estado", dataKey: "estado" },
    { header: "Medio", dataKey: "medio" },
  ];

  autoTable(doc, {
    startY: y + 66,
    columns: cols,
    body: input.filas.map((f) => ({ ...f, total: money(f.total) })),
    margin: { left: M, right: M, bottom: 54 },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: [...INK] },
    headStyles: { fillColor: [...EMERALD], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 250, 249] },
    columnStyles: { total: { halign: "right" } },
    didDrawPage: () => {
      doc.setFillColor(...EMERALD);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
    },
  });

  // Desglose por obra social
  const porOS = (r.por_obra_social as { obra_social: string; cobros: number; total: number }[]) ?? [];
  if (porOS.length) {
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, {
      startY: lastY + 26,
      head: [["Obra social", "Cobros", "Total"]],
      body: porOS.map((o) => [o.obra_social, String(o.cobros), money(o.total)]),
      margin: { left: M, right: M, bottom: 54 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [...INK] },
      headStyles: { fillColor: [...TEAL], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
  }

  piePaginas(
    doc,
    `Emitido el ${hoy()} desde VitaeGest. Documento de gestión interna: no reemplaza la factura electrónica.`,
  );
  return doc.output("blob");
}

/* ── 2 · Historia clínica de una paciente ─────────────────────────────────── */

type Record_ = {
  profesional: Membrete;
  paciente: Record<string, unknown>;
  evoluciones: Record<string, unknown>[];
  turnos: Record<string, unknown>[];
  bonos: Record<string, unknown>[];
};

export async function buildPatientPdf(rec: Record_): Promise<Blob> {
  const { doc, autoTable } = await nuevoDoc();
  const p = rec.paciente;
  let y = encabezado(doc, rec.profesional, "Historia clínica", String(p.nombre ?? ""));

  // Datos de la paciente
  const datos: [string, string][] = [
    ["Documento", str(p.documento)],
    ["Fecha de nacimiento", fecha(p.fecha_nacimiento)],
    ["Sexo", str(p.sexo)],
    ["Teléfono", str(p.telefono)],
    ["Email", str(p.email)],
    ["Primera consulta", fecha(p.alta)],
  ].filter(([, v]) => v !== "—") as [string, string][];

  autoTable(doc, {
    startY: y,
    body: datos,
    margin: { left: M, right: M, bottom: 54 },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 3, textColor: [...INK] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 130, textColor: [...INK_SOFT] } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  for (const [titulo, valor] of [
    ["Antecedentes", p.antecedentes],
    ["Alergias", p.alergias],
    ["Observaciones", p.observaciones],
  ] as [string, unknown][]) {
    if (!valor) continue;
    y = seccion(doc, y, titulo);
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(
      String(valor),
      doc.internal.pageSize.getWidth() - M * 2,
    ) as string[];
    doc.text(lines, M, y);
    y += lines.length * 12 + 14;
  }

  // Bonos
  if (rec.bonos.length) {
    y = seccion(doc, y, "Órdenes y bonos");
    autoTable(doc, {
      startY: y,
      head: [["Nº", "Diagnóstico", "Derivante", "Obra social", "Sesiones", "Estado"]],
      body: rec.bonos.map((b) => [
        str(b.numero),
        str(b.diagnostico),
        str(b.derivante),
        str(b.obra_social),
        `${b.usadas ?? 0} / ${b.total ?? 0}`,
        ESTADO_BONO[String(b.estado)] ?? str(b.estado),
      ]),
      margin: { left: M, right: M, bottom: 54 },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: [...INK] },
      headStyles: { fillColor: [...TEAL], textColor: [255, 255, 255], fontStyle: "bold" },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  // Evoluciones — el corazón del informe
  y = seccion(doc, y, `Evoluciones (${rec.evoluciones.length})`);
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = doc.internal.pageSize.getWidth() - M * 2;

  for (const e of rec.evoluciones) {
    if (y > pageH - 140) {
      doc.addPage();
      doc.setFillColor(...EMERALD);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
      y = 60;
    }

    doc.setFillColor(...TEAL);
    doc.rect(M, y - 9, 3, 13, "F");
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...EMERALD);
    doc.text(
      `${fechaHora(e.fecha)}${e.titulo ? ` · ${e.titulo}` : ""}${
        e.plantilla ? `  (${e.plantilla})` : ""
      }`,
      M + 10,
      y,
    );
    y += 15;

    doc.setFont("helvetica", "normal");
    for (const [sigla, campo] of [
      ["S", e.subjetivo],
      ["O", e.objetivo],
      ["A", e.evaluacion],
      ["P", e.plan],
    ] as [string, unknown][]) {
      if (!campo) continue;
      doc.setFontSize(9);
      doc.setTextColor(...TEAL);
      doc.setFont("helvetica", "bold");
      doc.text(sigla, M + 10, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(String(campo), maxW - 32) as string[];
      doc.text(lines, M + 26, y);
      y += lines.length * 11 + 4;
      if (y > pageH - 80) {
        doc.addPage();
        doc.setFillColor(...EMERALD);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");
        y = 60;
      }
    }

    // Campos estructurados (EVA, PERFECT, edema, SpO2…)
    const datosExtra = e.datos as Record<string, unknown> | null;
    if (datosExtra && Object.keys(datosExtra).length) {
      const texto = Object.entries(datosExtra)
        .map(([k, v]) => `${etiqueta(k)}: ${valorPlano(v)}`)
        .join("   ·   ");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK_SOFT);
      const lines = doc.splitTextToSize(texto, maxW - 32) as string[];
      doc.text(lines, M + 26, y);
      y += lines.length * 10 + 4;
    }
    y += 12;
  }

  piePaginas(
    doc,
    `${str(p.nombre)} · Emitido el ${hoy()} desde VitaeGest. Documento clínico confidencial (Ley 26.529).`,
  );
  return doc.output("blob");
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function seccion(doc: Jsp, y: number, titulo: string): number {
  doc.setFontSize(11.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text(titulo.toUpperCase(), M, y);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.line(M, y + 5, doc.internal.pageSize.getWidth() - M, y + 5);
  doc.setFont("helvetica", "normal");
  return y + 22;
}

const str = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

const ESTADO_BONO: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  expired: "Vencido",
  cancelled: "Cancelado",
};

/**
 * Las columnas DATE de Postgres llegan como "1988-04-12", sin hora. Pasarlas
 * por new Date() las interpreta como medianoche UTC y, al mostrarlas en hora
 * argentina (-03:00), retroceden un día: el 12 aparece como 11. Por eso las
 * fechas de solo-día se arman a mano y solo los timestamps usan la zona.
 */
const fecha = (v: unknown) => {
  if (!v) return "—";
  const s = String(v);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (soloFecha) {
    const [, a, m, d] = soloFecha;
    return `${Number(d)}/${Number(m)}/${a}`;
  }
  return new Date(s).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
};

const fechaHora = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const etiqueta = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function valorPlano(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.map(valorPlano).join(", ");
  if (typeof v === "object")
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k} ${valorPlano(x)}`)
      .join(" / ");
  if (typeof v === "boolean") return v ? "sí" : "no";
  return String(v);
}
