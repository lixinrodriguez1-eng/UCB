import { describe, expect, it } from "vitest";
import { pluralizar, resumirMovimiento } from "@/lib/formato";
import { parsearFrase } from "@/lib/parser";

describe("resumirMovimiento", () => {
  it.each([
    ["Compré veinte kilos de pollo a doscientos pesos", "Compra · 20 kilos de pollo · Bs\u00a0200"],
    ["Vendí 3 kilos de tomate a 21", "Venta · 3 kilos de tomate · Bs\u00a021"],
    ["Compré una arroba de papa a 50 bolivianos", "Compra · 1 arroba de papa · Bs\u00a050"],
    ["La doña Rosa se llevó apuntado un pollo entero a 41", "Fiado · 1 pollo entero · Bs\u00a041 · doña Rosa"],
    ["Vendí dos pollos enteros a 82", "Venta · 2 pollos enteros · Bs\u00a082"],
    ["Vendí media docena de pimentón a 12 por QR", "Venta · media docena de pimentón · Bs\u00a012"],
    ["Vendí medio kilo de queso a 20", "Venta · medio kilo de queso · Bs\u00a020"],
    ["Vendí 2 kilos y medio de cebolla a 45", "Venta · 2,5 kilos de cebolla · Bs\u00a045"],
    ["VENDÍ 5 LIMONES A 2", "Venta · 5 limones · Bs\u00a02"],
  ])("%s → %s", (frase, esperado) => {
    expect(resumirMovimiento(parsearFrase(frase))).toBe(esperado);
  });

  it("con datos incompletos muestra lo que hay", () => {
    expect(resumirMovimiento(parsearFrase("Vendí tomate"))).toBe("Venta · tomate");
  });
});

describe("pluralizar", () => {
  it.each([
    ["kilo", "kilos"], ["unidad", "unidades"], ["cajón", "cajones"],
    ["limón", "limones"], ["maíz", "maíces"], ["carne de res", "carnes de res"],
  ])("%s → %s", (s, p) => expect(pluralizar(s)).toBe(p));
});

describe("formatearBs", () => {
  it.each([
    [200, "Bs\u00a0200"], [0.4, "Bs\u00a00,40"], [10.4, "Bs\u00a010,40"], [4.19, "Bs\u00a04,19"], [12.5, "Bs\u00a012,50"],
  ])("%d → %s", async (n, esperado) => {
    const { formatearBs } = await import("@/lib/formato");
    expect(formatearBs(n)).toBe(esperado);
  });
});

describe("contar (plural)", () => {
  it.each([
    [1, "movimiento", "1 movimiento"],
    [2, "movimiento", "2 movimientos"],
    [0, "movimiento", "0 movimientos"],
    [57, "movimiento", "57 movimientos"],
    [1, "pago", "1 pago"],
    [3, "unidad", "3 unidades"],
  ])("%d %s → %s", async (n, palabra, esperado) => {
    const { contar } = await import("@/lib/formato");
    expect(contar(n, palabra)).toBe(esperado);
  });

  it.each([
    [1, 0, "1 movimiento"],
    [2, 0, "2 movimientos"],
    [1, 1, "1 movimiento y 1 pago"],
    [56, 3, "56 movimientos y 3 pagos"],
    [0, 1, "1 pago"],
    [0, 0, "0 movimientos"],
  ])("%d movimientos y %d pagos → %s", async (m, p, esperado) => {
    const { contarRegistros } = await import("@/lib/formato");
    expect(contarRegistros(m, p)).toBe(esperado);
  });
});
