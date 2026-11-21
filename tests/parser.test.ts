import { describe, expect, it } from "vitest";
import { estaCompleto, parsearFrase } from "@/lib/parser";
import { leerNumero } from "@/lib/numeros";

describe("parsearFrase — frases del enunciado", () => {
  it("compra de pollo con números en palabras y 'pesos'", () => {
    expect(parsearFrase("Compré veinte kilos de pollo a doscientos pesos")).toEqual({
      tipo: "compra", producto: "pollo", cantidad: 20, unidad: "kilo",
      total: 200, pago: "efectivo", faltantes: [],
    });
  });

  it("venta con dígitos", () => {
    expect(parsearFrase("Vendí 3 kilos de tomate a 21")).toEqual({
      tipo: "venta", producto: "tomate", cantidad: 3, unidad: "kilo",
      total: 21, pago: "efectivo", faltantes: [],
    });
  });

  it("arroba y 'bolivianos'", () => {
    expect(parsearFrase("Compré una arroba de papa a 50 bolivianos")).toEqual({
      tipo: "compra", producto: "papa", cantidad: 1, unidad: "arroba",
      total: 50, pago: "efectivo", faltantes: [],
    });
  });

  it("fiado con cliente", () => {
    expect(
      parsearFrase("La doña Rosa se llevó apuntado un pollo entero a 41"),
    ).toEqual({
      // "pollo entero" (por unidad) es otro producto que "pollo" (por kilo)
      tipo: "fiado", producto: "pollo entero", cantidad: 1, unidad: "unidad",
      total: 41, cliente: "doña Rosa", pago: "efectivo", faltantes: [],
    });
  });

  it("media docena pagada por QR", () => {
    expect(parsearFrase("Vendí media docena de pimentón a 12 por QR")).toEqual({
      tipo: "venta", producto: "pimentón", cantidad: 0.5, unidad: "docena",
      total: 12, pago: "qr", faltantes: [],
    });
  });
});

describe("parsearFrase — más casos", () => {
  it("'y medio' después de la unidad y 'cuarenta y cinco'", () => {
    expect(parsearFrase("Vendí dos kilos y medio de cebolla a cuarenta y cinco")).toMatchObject({
      tipo: "venta", producto: "cebolla", cantidad: 2.5, unidad: "kilo",
      total: 45, faltantes: [],
    });
  });

  it("sin tildes, quintal, centenas y 'bs'", () => {
    expect(parsearFrase("compre un quintal de azucar a trescientos cincuenta bs")).toMatchObject({
      tipo: "compra", producto: "azúcar", cantidad: 1, unidad: "quintal",
      total: 350, faltantes: [],
    });
  });

  it("todo en mayúsculas y producto en plural", () => {
    expect(parsearFrase("VENDÍ 5 LIMONES A 2")).toMatchObject({
      tipo: "venta", producto: "limón", cantidad: 5, unidad: "unidad",
      total: 2, faltantes: [],
    });
  });

  it("fiado con 'le fié a don ...'", () => {
    expect(parsearFrase("Le fié a don Pedro dos pollos a ochenta")).toMatchObject({
      tipo: "fiado", producto: "pollo", cantidad: 2, unidad: "unidad",
      total: 80, cliente: "don Pedro", faltantes: [],
    });
  });

  it("'a X el kilo' es precio unitario → multiplica", () => {
    expect(parsearFrase("Vendí 4 kilos de papa a 6 el kilo")).toMatchObject({
      tipo: "venta", producto: "papa", cantidad: 4, unidad: "kilo",
      total: 24, faltantes: [],
    });
  });

  it("medio kilo, producto de varias palabras y QR en minúsculas", () => {
    expect(parsearFrase("vendi medio kilo de carne de res a veinticinco con qr")).toMatchObject({
      tipo: "venta", producto: "carne de res", cantidad: 0.5, unidad: "kilo",
      total: 25, pago: "qr", faltantes: [],
    });
  });

  it("'ciento veinte' y arrobas en plural", () => {
    expect(parsearFrase("Compré tres arrobas de yuca a ciento veinte pesos")).toMatchObject({
      tipo: "compra", producto: "yuca", cantidad: 3, unidad: "arroba",
      total: 120, faltantes: [],
    });
  });

  it("decimal con coma y 'en efectivo'", () => {
    expect(parsearFrase("vendi 1,5 kilos de queso a 60 en efectivo")).toMatchObject({
      tipo: "venta", producto: "queso", cantidad: 1.5, unidad: "kilo",
      total: 60, pago: "efectivo", faltantes: [],
    });
  });

  it("'me vendieron' cuenta como compra", () => {
    expect(parsearFrase("Me vendieron 2 quintales de arroz a 600")).toMatchObject({
      tipo: "compra", producto: "arroz", cantidad: 2, unidad: "quintal",
      total: 600, faltantes: [],
    });
  });

  it("cliente sin título: 'Juan se llevó fiado...'", () => {
    expect(parsearFrase("Juan se llevó fiado kilo y medio de papa a 9")).toMatchObject({
      tipo: "fiado", producto: "papa", cantidad: 1.5, unidad: "kilo",
      total: 9, cliente: "Juan", faltantes: [],
    });
  });

  it("producto que no está en el vocabulario", () => {
    expect(parsearFrase("Vendí 3 kilos de copoazú a 45")).toMatchObject({
      tipo: "venta", producto: "copoazú", cantidad: 3, unidad: "kilo",
      total: 45, faltantes: [],
    });
  });

  it("faltan cantidad, unidad y total", () => {
    const r = parsearFrase("Vendí tomate");
    expect(r).toMatchObject({ tipo: "venta", producto: "tomate" });
    expect(r.faltantes).toEqual(["cantidad", "unidad", "total"]);
    expect(estaCompleto(r)).toBe(false);
  });

  it("falta el tipo", () => {
    const r = parsearFrase("tres kilos de papa a treinta");
    expect(r).toMatchObject({ producto: "papa", cantidad: 3, unidad: "kilo", total: 30 });
    expect(r.tipo).toBeUndefined();
    expect(r.faltantes).toEqual(["tipo"]);
  });

  it("fiado sin cliente pide el cliente", () => {
    const r = parsearFrase("Se llevó fiado un kilo de queso a 40");
    expect(r).toMatchObject({ tipo: "fiado", producto: "queso", cantidad: 1, total: 40 });
    expect(r.faltantes).toEqual(["cliente"]);
  });

  it("frase vacía devuelve todo como faltante", () => {
    expect(parsearFrase("").faltantes).toEqual(["tipo", "producto", "cantidad", "unidad", "total"]);
  });
});

describe("leerNumero — números en palabras de uno a mil", () => {
  const casos: [string, number][] = [
    ["uno", 1], ["una", 1], ["quince", 15], ["veintiun", 21], ["veintinueve", 29],
    ["treinta y uno", 31], ["noventa y nueve", 99], ["cien", 100], ["ciento uno", 101],
    ["ciento cincuenta y cinco", 155], ["doscientos veinte", 220],
    ["quinientas", 500], ["novecientos noventa y nueve", 999], ["mil", 1000],
    ["dos y medio", 2.5], ["veinte y media", 20.5], ["media", 0.5], ["15", 15], ["2.5", 2.5],
  ];
  it.each(casos)("'%s' → %d", (frase, esperado) => {
    const tokens = frase.split(" ");
    const r = leerNumero(tokens, 0);
    expect(r?.valor).toBe(esperado);
    expect(r?.fin).toBe(tokens.length);
  });

  it("no lee palabras que no son números", () => {
    expect(leerNumero(["pollo"], 0)).toBeNull();
  });
});
