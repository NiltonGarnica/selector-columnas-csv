import { useEffect, useRef, useState } from "react";
import { columnLabel } from "./csv";

const ROW_HEIGHT = 34;
const OVERSCAN = 12;

interface Props {
  headers: string[];
  columns: number[];
  rows: string[][];
  label: string;
}

function displayValue(value: string | undefined): string {
  return (value ?? "").replace(/\r\n|\r|\n/g, " ⏎ ");
}

/** Tabla con desplazamiento horizontal y vertical que solo dibuja las filas visibles. */
export function DataTable({ headers, columns, rows, label }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(520);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setViewport(el.clientHeight || 520));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);

  return (
    <div
      className="table-scroll"
      ref={scrollRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table>
        <thead>
          <tr>
            <th className="rownum" scope="col">#</th>
            {columns.map((i) => (
              <th key={i} scope="col" title={headers[i]}>
                {columnLabel(headers[i], i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="empty-cell" colSpan={columns.length + 1}>
                El archivo solo tiene encabezados, sin registros.
              </td>
            </tr>
          )}
          {start > 0 && <tr aria-hidden="true" style={{ height: start * ROW_HEIGHT }} />}
          {rows.slice(start, end).map((row, offset) => {
            const index = start + offset;
            return (
              <tr key={index}>
                <td className="rownum">{index + 1}</td>
                {columns.map((i) => (
                  <td key={i} title={row[i]}>
                    {displayValue(row[i])}
                  </td>
                ))}
              </tr>
            );
          })}
          {end < rows.length && <tr aria-hidden="true" style={{ height: (rows.length - end) * ROW_HEIGHT }} />}
        </tbody>
      </table>
    </div>
  );
}
