import Papa from "papaparse";

export interface CsvData {
  headers: string[];
  rows: string[][];
  /** Separador detectado (coma, punto y coma, tabulador o barra). */
  delimiter: string;
  /** Salto de línea detectado en el archivo original. */
  linebreak: string;
  /** Registros cuyo número de campos no coincide con los encabezados. */
  irregularRows: number;
}

export class CsvError extends Error {}

/** Decodifica como UTF-8 y, si no es válido, como Windows-1252 (habitual en CSV exportados desde Excel). */
export function decodeBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(decodeBytes(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new CsvError("No se pudo leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

export function parseCsv(text: string): CsvData {
  const content = text.replace(/^﻿/, "");
  if (content.includes("\u0000")) {
    throw new CsvError("No se pudo leer el archivo: no parece un CSV de texto.");
  }
  if (content.trim() === "") {
    throw new CsvError("El archivo está vacío.");
  }

  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  const quoteError = result.errors.find((e) => e.type === "Quotes");
  if (quoteError) {
    const where = quoteError.row != null ? ` cerca de la fila ${quoteError.row + 1}` : "";
    throw new CsvError(`No se pudo leer el archivo: hay comillas sin cerrar${where}. Revisa el formato del CSV.`);
  }

  const [headerRow, ...body] = result.data;
  if (!headerRow || headerRow.every((h) => h.trim() === "")) {
    throw new CsvError("El archivo no tiene una fila de encabezados válida.");
  }

  const width = headerRow.length;
  let irregularRows = 0;
  const rows = body.map((row) => {
    if (row.length === width) return row;
    irregularRows++;
    return row.length > width ? row.slice(0, width) : [...row, ...Array<string>(width - row.length).fill("")];
  });

  return {
    headers: headerRow,
    rows,
    delimiter: result.meta.delimiter || ",",
    linebreak: result.meta.linebreak || "\r\n",
    irregularRows,
  };
}

/**
 * Genera un CSV solo con las columnas indicadas, en su orden original,
 * con los mismos nombres y todos los registros en el mismo orden.
 */
export function buildCsv(data: CsvData, columns: number[]): string {
  const cols = [...new Set(columns)].sort((a, b) => a - b);
  const matrix = [cols.map((i) => data.headers[i]), ...data.rows.map((row) => cols.map((i) => row[i] ?? ""))];
  return Papa.unparse(matrix, {
    delimiter: data.delimiter,
    newline: data.linebreak,
    escapeFormulae: false,
    // Con una sola columna, un campo vacío generaría una línea en blanco que se perdería al releer el archivo.
    quotes: (value: unknown) => cols.length === 1 && value === "",
  });
}

export function columnLabel(header: string, index: number): string {
  return header.trim() === "" ? `(sin nombre ${index + 1})` : header;
}

export function exportFileName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "datos";
  return `${base}_resultado.csv`;
}

export function downloadCsv(content: string, fileName: string): void {
  // El BOM permite que Excel abra correctamente tildes y eñes.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
