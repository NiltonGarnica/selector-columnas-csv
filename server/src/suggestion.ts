export interface SuggestRequest {
  objetivo: string;
  encabezados: string[];
}

export interface Suggestion {
  estado: "ok" | "aclarar";
  columnas: number[];
  mensaje: string;
}

const MAX_GOAL_LENGTH = 1000;
const MAX_HEADERS = 1000;
const MAX_HEADER_LENGTH = 300;

const DEFAULT_CLARIFY =
  "No encontré columnas que encajen con ese objetivo. ¿Puedes describir con más detalle qué datos necesitas en el CSV final?";

type Validation = { ok: true; value: SuggestRequest } | { ok: false; error: string };

export function validateRequest(body: unknown): Validation {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const objetivo = typeof data.objetivo === "string" ? data.objetivo.trim() : "";
  const encabezados = data.encabezados;

  if (!objetivo) return { ok: false, error: "Escribe para qué necesitas el CSV final." };
  if (objetivo.length > MAX_GOAL_LENGTH) {
    return { ok: false, error: `El objetivo no puede superar ${MAX_GOAL_LENGTH} caracteres.` };
  }
  if (!Array.isArray(encabezados) || encabezados.length === 0) {
    return { ok: false, error: "Faltan los encabezados del CSV." };
  }
  if (encabezados.length > MAX_HEADERS) {
    return { ok: false, error: `El CSV tiene demasiadas columnas (máximo ${MAX_HEADERS}).` };
  }
  if (!encabezados.every((h) => typeof h === "string" && h.length <= MAX_HEADER_LENGTH)) {
    return { ok: false, error: "Los encabezados del CSV no son válidos." };
  }
  return { ok: true, value: { objetivo, encabezados: encabezados as string[] } };
}

/** Normaliza la respuesta del modelo: solo índices válidos, sin duplicados y en orden original. */
export function sanitizeSuggestion(raw: unknown, headerCount: number): Suggestion {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const mensaje = typeof data.mensaje === "string" ? data.mensaje.trim() : "";
  const candidates = Array.isArray(data.columnas) ? data.columnas : [];
  const columnas = [
    ...new Set(
      candidates.filter(
        (n): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < headerCount,
      ),
    ),
  ].sort((a, b) => a - b);

  if (data.estado === "ok" && columnas.length > 0) {
    return { estado: "ok", columnas, mensaje };
  }
  return { estado: "aclarar", columnas: [], mensaje: mensaje || DEFAULT_CLARIFY };
}
