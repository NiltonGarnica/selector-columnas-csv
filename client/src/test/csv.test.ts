import { describe, expect, it } from "vitest";
import { buildCsv, CsvError, decodeBytes, exportFileName, parseCsv } from "../csv";

describe("parseCsv", () => {
  it("lee comillas, comas y saltos de línea dentro de los campos", () => {
    const data = parseCsv('nombre,nota\n"Pérez, Ana","línea 1\nlínea 2"\n"dice ""hola""",ok\n');
    expect(data.headers).toEqual(["nombre", "nota"]);
    expect(data.rows).toEqual([
      ["Pérez, Ana", "línea 1\nlínea 2"],
      ['dice "hola"', "ok"],
    ]);
  });

  it("detecta el punto y coma como separador", () => {
    const data = parseCsv('a;b;c\r\n1,5;2;"x;y"\r\n');
    expect(data.delimiter).toBe(";");
    expect(data.linebreak).toBe("\r\n");
    expect(data.rows).toEqual([["1,5", "2", "x;y"]]);
  });

  it("conserva registros con todos los campos vacíos", () => {
    expect(parseCsv("a,b\n,\n1,2").rows).toEqual([
      ["", ""],
      ["1", "2"],
    ]);
  });

  it("informa si el archivo está vacío", () => {
    expect(() => parseCsv("")).toThrow(new CsvError("El archivo está vacío."));
    expect(() => parseCsv("﻿  \n  ")).toThrow("El archivo está vacío.");
  });

  it("informa si hay comillas sin cerrar", () => {
    expect(() => parseCsv('a,b\n"x,1\n2,3')).toThrow(/comillas sin cerrar/);
  });

  it("rechaza archivos binarios", () => {
    expect(() => parseCsv("PK\u0003\u0004\u0000\u0000")).toThrow(/no parece un CSV/);
  });

  it("ajusta filas con campos de más o de menos y las cuenta", () => {
    const data = parseCsv("a,b,c\n1,2\n1,2,3,4");
    expect(data.rows).toEqual([
      ["1", "2", ""],
      ["1", "2", "3"],
    ]);
    expect(data.irregularRows).toBe(2);
  });
});

describe("buildCsv", () => {
  it("exporta solo las columnas elegidas en su orden original y con todos los registros", () => {
    const original = parseCsv('id;nombre;precio;nota\n1;"Silla; roja";10,5;"a\nb"\n2;Mesa;"20";"con ""comillas"""\n');
    const output = buildCsv(original, [3, 1]);
    const reread = parseCsv(output);
    expect(reread.delimiter).toBe(";");
    expect(reread.headers).toEqual(["nombre", "nota"]);
    expect(reread.rows).toEqual([
      ["Silla; roja", "a\nb"],
      ["Mesa", 'con "comillas"'],
    ]);
  });

  it("no pierde registros vacíos al exportar una sola columna", () => {
    const original = parseCsv("a,b\n,1\nx,2\n,3");
    // Los vacíos van entre comillas para que no queden como líneas en blanco.
    expect(buildCsv(original, [0])).toBe('a\n""\nx\n""');
  });
});

describe("utilidades", () => {
  it("decodifica Windows-1252 si el archivo no es UTF-8", () => {
    const bytes = new Uint8Array([0x61, 0xf1, 0x6f]); // "año" en Windows-1252
    expect(decodeBytes(bytes.buffer)).toBe("año");
    expect(decodeBytes(new TextEncoder().encode("año").buffer as ArrayBuffer)).toBe("año");
  });

  it("genera el nombre del archivo exportado", () => {
    expect(exportFileName("ventas.csv")).toBe("ventas_resultado.csv");
    expect(exportFileName("datos")).toBe("datos_resultado.csv");
  });
});
