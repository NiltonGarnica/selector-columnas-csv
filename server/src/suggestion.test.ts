import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeSuggestion, validateRequest } from "./suggestion.js";

test("valida objetivo y encabezados", () => {
  assert.equal(validateRequest({ objetivo: "  ", encabezados: ["a"] }).ok, false);
  assert.equal(validateRequest({ objetivo: "catálogo", encabezados: [] }).ok, false);
  assert.equal(validateRequest({ objetivo: "catálogo", encabezados: [1, 2] }).ok, false);
  assert.deepEqual(validateRequest({ objetivo: " catálogo ", encabezados: ["nombre", "precio"] }), {
    ok: true,
    value: { objetivo: "catálogo", encabezados: ["nombre", "precio"] },
  });
});

test("descarta índices inventados, duplicados y fuera de rango", () => {
  const result = sanitizeSuggestion({ estado: "ok", columnas: [3, 1, 1, 9, -1, 2.5], mensaje: "Listo" }, 4);
  assert.deepEqual(result, { estado: "ok", columnas: [1, 3], mensaje: "Listo" });
});

test("pide aclarar si no hay columnas válidas o la respuesta no se entiende", () => {
  assert.equal(sanitizeSuggestion({ estado: "ok", columnas: [7] }, 4).estado, "aclarar");
  assert.equal(sanitizeSuggestion(null, 4).estado, "aclarar");
  const clarify = sanitizeSuggestion({ estado: "aclarar", columnas: [], mensaje: "¿Qué datos?" }, 4);
  assert.deepEqual(clarify, { estado: "aclarar", columnas: [], mensaje: "¿Qué datos?" });
});
