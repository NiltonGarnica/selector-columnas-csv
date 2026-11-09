import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Papa from "papaparse";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

const HEADERS = [
  "id", "nombre", "descripcion", "precio", "moneda", "stock", "categoria", "marca",
  "sku", "peso", "color", "talla", "proveedor", "fecha_alta", "activo",
];
const ROWS = 37;

function makeRows(): string[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    HEADERS.map((h, c) => {
      if (h === "descripcion") return `Producto ${r}, "especial"\nsegunda línea; con punto y coma`;
      if (h === "precio") return `${r},99`;
      if (h === "stock" && r % 5 === 0) return "";
      return `${h}-${r}-${c}`;
    }),
  );
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

async function uploadCsv(content: string) {
  const user = userEvent.setup();
  render(<App />);
  await user.upload(screen.getByLabelText("Archivo CSV"), new File([content], "productos.csv", { type: "text/csv" }));
  return user;
}

describe("Mapper ETL", () => {
  it("exporta 5 de 15 columnas con la misma cantidad de registros que el original", async () => {
    let downloaded: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      downloaded = blob;
      return "blob:prueba";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const rows = makeRows();
    const user = await uploadCsv(Papa.unparse([HEADERS, ...rows]));

    expect(await screen.findByText("15 de 15 columnas seleccionadas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ninguna" }));
    expect(screen.getByText("0 de 15 columnas seleccionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();

    // Se marcan en desorden: el resultado debe respetar el orden original.
    for (const name of ["sku", "nombre", "activo", "precio", "descripcion"]) {
      await user.click(screen.getByRole("checkbox", { name }));
    }
    expect(screen.getByText("5 de 15 columnas seleccionadas")).toBeInTheDocument();

    const resultTable = screen.getByRole("region", { name: "Tabla del resultado" });
    const resultHeaders = [...resultTable.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(resultHeaders).toEqual(["#", "nombre", "descripcion", "precio", "sku", "activo"]);

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(downloaded).toBeDefined();

    const text = (await readBlob(downloaded!)).replace(/^﻿/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const [headerRow, ...dataRows] = parsed.data;
    const expectedIdx = [1, 2, 3, 8, 14];

    expect(headerRow).toHaveLength(5);
    expect(headerRow).toEqual(expectedIdx.map((i) => HEADERS[i]));
    expect(dataRows).toHaveLength(ROWS);
    expect(dataRows).toEqual(rows.map((row) => expectedIdx.map((i) => row[i])));
  });

  it("muestra un mensaje claro si el archivo está vacío", async () => {
    await uploadCsv("");
    expect(await screen.findByRole("alert")).toHaveTextContent("El archivo está vacío.");
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });
});
