/**
 * VitaeGest · Generación de Excel en el navegador.
 *
 * ExcelJS se carga con import() dinámico: solo baja cuando alguien exporta,
 * no en cada visita al panel.
 *
 * Por qué ExcelJS y no `xlsx`: el paquete `xlsx` de npm está congelado en una
 * versión con vulnerabilidades conocidas (las correcciones solo se publican en
 * el CDN propio de SheetJS). ExcelJS se mantiene en npm y además da formato de
 * celda, anchos y filas de totales, que es justo lo que necesita el contador.
 */

export type Column = {
  key: string;
  header: string;
  width?: number;
  /** 'money' aplica formato $ #.##0 · 'date' alinea a la derecha */
  format?: "money" | "date" | "text" | "number";
  total?: boolean;
};

export type SheetSpec = {
  name: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  /** Líneas de encabezado sobre la tabla (título, período, profesional). */
  headerLines?: string[];
};

const INK = "FF455A64";
const EMERALD = "FF117864";
const TEAL_SOFT = "FFE6F9F5";
const LINE = "FFDCE4E7";

export async function buildWorkbook(
  sheets: SheetSpec[],
  meta?: { title?: string; author?: string },
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  wb.creator = meta?.author ?? "VitaeGest";
  wb.created = new Date();
  if (meta?.title) wb.title = meta.title;

  for (const spec of sheets) {
    // Excel no acepta estos caracteres en el nombre de una hoja.
    const ws = wb.addWorksheet(spec.name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31), {
      views: [{ state: "frozen", ySplit: (spec.headerLines?.length ?? 0) + 1 }],
    });

    // Encabezado libre
    (spec.headerLines ?? []).forEach((line, i) => {
      const row = ws.addRow([line]);
      row.font = { bold: i === 0, size: i === 0 ? 14 : 10, color: { argb: i === 0 ? EMERALD : INK } };
      ws.mergeCells(row.number, 1, row.number, Math.max(spec.columns.length, 1));
    });
    if (spec.headerLines?.length) ws.addRow([]);

    // Cabecera de la tabla
    const headerRow = ws.addRow(spec.columns.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: INK }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_SOFT } };
      cell.border = { bottom: { style: "thin", color: { argb: LINE } } };
      cell.alignment = { vertical: "middle" };
    });
    headerRow.height = 22;

    // Datos
    for (const r of spec.rows) {
      const row = ws.addRow(spec.columns.map((c) => normalize(r[c.key], c.format)));
      row.eachCell((cell, i) => {
        const col = spec.columns[i - 1];
        if (col?.format === "money") cell.numFmt = '"$"#,##0.00';
        if (col?.format === "number") cell.numFmt = "#,##0";
        cell.font = { color: { argb: INK }, size: 10 };
        cell.alignment = { vertical: "middle", wrapText: false };
      });
    }

    // Fila de totales
    const totalCols = spec.columns.filter((c) => c.total);
    if (totalCols.length && spec.rows.length) {
      ws.addRow([]);
      const values = spec.columns.map((c) => {
        if (spec.columns.indexOf(c) === 0) return "TOTAL";
        if (!c.total) return null;
        return spec.rows.reduce((acc, r) => acc + toNumber(r[c.key]), 0);
      });
      const totalRow = ws.addRow(values);
      totalRow.eachCell((cell, i) => {
        const col = spec.columns[i - 1];
        cell.font = { bold: true, color: { argb: EMERALD }, size: 11 };
        cell.border = { top: { style: "double", color: { argb: LINE } } };
        if (col?.format === "money") cell.numFmt = '"$"#,##0.00';
      });
    }

    // Anchos: los declarados, o calculados por contenido (con techo).
    spec.columns.forEach((c, i) => {
      const column = ws.getColumn(i + 1);
      if (c.width) {
        column.width = c.width;
        return;
      }
      const longest = spec.rows.reduce(
        (max, r) => Math.max(max, String(r[c.key] ?? "").length),
        c.header.length,
      );
      column.width = Math.min(Math.max(longest + 3, 10), 48);
    });

    if (spec.rows.length) {
      ws.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number, column: spec.columns.length },
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalize(v: unknown, format?: Column["format"]) {
  if (v === null || v === undefined) return "";
  if (format === "money" || format === "number") return toNumber(v);
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

/** Dispara la descarga en el navegador. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Damos tiempo a que el navegador tome el blob antes de soltarlo.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** "facturacion-2026-09-01_2026-09-30.xlsx" */
export function stamp(prefix: string, ext: string, from?: string, to?: string) {
  const range = from && to ? `-${from}_${to}` : `-${new Date().toISOString().slice(0, 10)}`;
  return `${prefix}${range}.${ext}`;
}
