import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { requestSuggestion } from "./api";
import {
  buildCsv,
  columnLabel,
  CsvError,
  downloadCsv,
  exportFileName,
  parseCsv,
  readFileText,
  type CsvData,
} from "./csv";
import { DataTable } from "./DataTable";

type AiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" | "aclarar" | "error"; message: string };

const DELIMITER_NAMES: Record<string, string> = {
  ",": "coma",
  ";": "punto y coma",
  "\t": "tabulador",
  "|": "barra vertical",
};

function counterText(selected: number, total: number): string {
  return `${selected} de ${total} ${total === 1 ? "columna seleccionada" : "columnas seleccionadas"}`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n.toLocaleString("es")} ${n === 1 ? singular : pluralForm}`;
}

export default function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileVersion, setFileVersion] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [goal, setGoal] = useState("");
  const [ai, setAi] = useState<AiState>({ kind: "idle" });

  const selectedColumns = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const allColumns = useMemo(() => (data ? data.headers.map((_, i) => i) : []), [data]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setReading(true);
    setLoadError(null);
    try {
      const parsed = parseCsv(await readFileText(file));
      setData(parsed);
      setFileName(file.name);
      setFileVersion((v) => v + 1);
      setSelected(new Set(parsed.headers.map((_, i) => i)));
      setAi({ kind: "idle" });
    } catch (err) {
      setData(null);
      setLoadError(
        err instanceof CsvError ? err.message : "No se pudo leer el archivo. Comprueba que sea un CSV válido.",
      );
    } finally {
      setReading(false);
    }
  }

  function toggleColumn(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function suggest(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    const objetivo = goal.trim();
    if (!objetivo) {
      setAi({ kind: "aclarar", message: "Escribe para qué necesitas el CSV final." });
      return;
    }

    setAi({ kind: "loading" });
    try {
      const result = await requestSuggestion(objetivo, data.headers);
      if (result.estado === "ok" && result.columnas.length > 0) {
        setSelected(new Set(result.columnas));
        const names = result.columnas.map((i) => columnLabel(data.headers[i], i)).join(", ");
        const reason = result.mensaje ? ` ${result.mensaje}` : "";
        setAi({
          kind: "ok",
          message: `Sugerencia aplicada: ${names}.${reason} Puedes ajustarla con las casillas.`,
        });
      } else {
        setAi({ kind: "aclarar", message: result.mensaje || "¿Puedes aclarar qué datos necesitas?" });
      }
    } catch (err) {
      setAi({ kind: "error", message: err instanceof Error ? err.message : "No se pudo obtener la sugerencia." });
    }
  }

  function exportCsv() {
    if (!data || selectedColumns.length === 0) return;
    downloadCsv(buildCsv(data, selectedColumns), exportFileName(fileName));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>Mapper ETL</h1>
            <p>Sube un CSV, elige sus columnas y exporta solo lo que necesitas.</p>
          </div>
        </div>
        <div className="actions">
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".csv,.txt,text/csv"
            aria-label="Archivo CSV"
            onChange={handleFile}
          />
          <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={reading}>
            {reading ? "Leyendo…" : "Subir CSV"}
          </button>
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={!data || selected.size === 0}>
            Exportar CSV
          </button>
        </div>
      </header>

      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}
        </div>
      )}

      {!data ? (
        <section className="empty-state">
          <h2>Empieza subiendo un archivo CSV</h2>
          <p>
            Se admiten archivos separados por comas, punto y coma o tabuladores, con cualquier cantidad de columnas.
            El archivo se procesa en tu navegador; a la IA solo se envían los nombres de las columnas.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()}>
            Subir CSV
          </button>
        </section>
      ) : (
        <>
          <p className="file-info">
            <strong>{fileName}</strong> · {plural(data.headers.length, "columna", "columnas")} ·{" "}
            {plural(data.rows.length, "registro", "registros")} · separador: {DELIMITER_NAMES[data.delimiter] ?? data.delimiter}
            {data.irregularRows > 0 && (
              <span className="warning">
                {" "}
                · {plural(data.irregularRows, "registro tiene", "registros tienen")} un número de campos distinto al de
                los encabezados
              </span>
            )}
          </p>

          <section className="controls">
            <div className="card">
              <div className="card-head">
                <h2>Columnas</h2>
                <span className="counter" aria-live="polite">
                  {counterText(selected.size, data.headers.length)}
                </span>
              </div>
              <div className="card-tools">
                <button type="button" className="link-btn" onClick={() => setSelected(new Set(allColumns))}>
                  Todas
                </button>
                <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>
                  Ninguna
                </button>
              </div>
              <ul className="column-list">
                {data.headers.map((header, i) => (
                  <li key={i}>
                    <label className={selected.has(i) ? "check is-checked" : "check"} title={header}>
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggleColumn(i)} />
                      <span>{columnLabel(header, i)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <form className="card" onSubmit={suggest}>
              <div className="card-head">
                <h2>Sugerencia con IA</h2>
              </div>
              <label className="field-label" htmlFor="goal">
                ¿Para qué necesitas el CSV final?
              </label>
              <textarea
                id="goal"
                rows={3}
                maxLength={1000}
                placeholder="Por ejemplo: Quiero un catálogo con precios"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={ai.kind === "loading"}>
                {ai.kind === "loading" ? "Consultando a Gemini…" : "Sugerir columnas con IA"}
              </button>
              {ai.kind !== "idle" && ai.kind !== "loading" && (
                <p className={`ai-message ai-${ai.kind}`} role="status">
                  {ai.message}
                </p>
              )}
            </form>
          </section>

          <section className="panels">
            <div className="panel">
              <div className="panel-head">
                <h2>CSV original</h2>
                <span>
                  {plural(data.headers.length, "columna", "columnas")} · {plural(data.rows.length, "registro", "registros")}
                </span>
              </div>
              <DataTable
                key={`original-${fileVersion}`}
                label="Tabla del CSV original"
                headers={data.headers}
                columns={allColumns}
                rows={data.rows}
              />
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>Resultado</h2>
                <span>
                  {plural(selectedColumns.length, "columna", "columnas")} · {plural(data.rows.length, "registro", "registros")}
                </span>
              </div>
              {selectedColumns.length > 0 ? (
                <DataTable
                  key={`resultado-${fileVersion}`}
                  label="Tabla del resultado"
                  headers={data.headers}
                  columns={selectedColumns}
                  rows={data.rows}
                />
              ) : (
                <div className="panel-empty">Selecciona al menos una columna para ver el resultado y exportarlo.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
