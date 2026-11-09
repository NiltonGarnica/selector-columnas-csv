export interface Suggestion {
  estado: "ok" | "aclarar";
  columnas: number[];
  mensaje: string;
}

export async function requestSuggestion(objetivo: string, encabezados: string[]): Promise<Suggestion> {
  let response: Response;
  try {
    response = await fetch("/api/sugerir-columnas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivo, encabezados }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  const body = (await response.json().catch(() => null)) as (Suggestion & { error?: string }) | null;
  if (!response.ok || !body) {
    throw new Error(body?.error ?? "El servidor no pudo procesar la sugerencia.");
  }
  return body;
}
