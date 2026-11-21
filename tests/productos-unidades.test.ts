import { describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import { costoPromedioPorUnidad, gananciaDelDia, precioVentaPorUnidad, revisarMargen } from "@/lib/calculos";
import { generarMovimientosDemo } from "@/lib/demo";
import { parsearFrase } from "@/lib/parser";

// Punto 3: "pollo entero" (por unidad) y "pollo" (por kilo) son productos distintos.

const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString(); // el 16 es lunes
const ahora = new Date(2026, 10, 18, 18);
let n = 0;
const mov = (
  fecha: string, tipo: Movimiento["tipo"], producto: string, cantidad: number, unidad: string, total: number,
): Movimiento => ({ id: `m${++n}`, fecha, tipo, producto, cantidad, unidad, total, pago: "efectivo" });

const compraPolloKilo = mov(dia(16, 6), "compra", "pollo", 20, "kilo", 340); // Bs 17/kg
const ventaPolloKilo = mov(dia(16, 9), "venta", "pollo", 3, "kilo", 39); // Bs 13/kg → pierde 4
const fiadoPolloEntero = { ...mov(dia(18, 9), "fiado", "pollo entero", 1, "unidad", 41), cliente: "doña Rosa" };

describe("el parser los distingue", () => {
  it.each([
    ["La doña Rosa se llevó apuntado un pollo entero a 41", "pollo entero", "unidad"],
    ["Vendí dos pollos enteros a 82", "pollo entero", "unidad"],
    ["Vendí 3 kilos de pollo a 39", "pollo", "kilo"],
    ["Vendí un pollo a 41", "pollo", "unidad"],
  ])("%s → %s (%s)", (frase, producto, unidad) => {
    expect(parsearFrase(frase)).toMatchObject({ producto, unidad });
  });
});

describe("costos y alertas por producto", () => {
  const movimientos = [compraPolloKilo, ventaPolloKilo, fiadoPolloEntero];

  it("las compras de pollo por kilo no son el costo del pollo entero", () => {
    expect(costoPromedioPorUnidad("pollo entero", { movimientos, ahora })).toBeNull();
    expect(costoPromedioPorUnidad("pollo", { movimientos, ahora })).toEqual({ valor: 17, unidad: "kilo" });
  });

  it("vender un pollo entero no cambia el precio de venta del pollo por kilo", () => {
    expect(precioVentaPorUnidad("pollo", { movimientos, ahora })).toMatchObject({ valor: 13, unidad: "kilo" });
    expect(precioVentaPorUnidad("pollo entero", { movimientos, ahora })).toMatchObject({ valor: 41, unidad: "unidad" });
  });

  it("no hay alerta falsa del pollo entero (sin compras de pollo entero no se compara)", () => {
    expect(revisarMargen("pollo entero", { movimientos, ahora })).toBeNull();
  });

  it("la alerta del pollo por kilo sigue intacta", () => {
    expect(revisarMargen("pollo", { movimientos, ahora })).toMatchObject({ nivel: "perdida", diferenciaPorUnidad: -4 });
  });

  it("con compras de pollo entero, se compara solo con esas", () => {
    const conEnteros = [...movimientos, mov(dia(16, 7), "compra", "pollo entero", 10, "unidad", 300)]; // Bs 30 c/u
    expect(costoPromedioPorUnidad("pollo entero", { movimientos: conEnteros, ahora })).toEqual({ valor: 30, unidad: "unidad" });
    expect(revisarMargen("pollo entero", { movimientos: conEnteros, ahora })).toBeNull(); // gana 11
    const caro = [...movimientos, mov(dia(16, 7), "compra", "pollo entero", 10, "unidad", 450)]; // Bs 45 c/u
    expect(revisarMargen("pollo entero", { movimientos: caro, ahora })).toMatchObject({
      nivel: "perdida", unidad: "unidad", diferenciaPorUnidad: -4,
      referencia: { producto: "pollo entero", precio: 41, unidad: "unidad", fuente: "El Deber / eju.tv" },
    });
  });
});

describe("unidad incompatible: no se convierte unidad a kilo", () => {
  it("'un pollo' (por unidad) no se compara con compras por kilo", () => {
    const movimientos = [compraPolloKilo, mov(dia(18, 9), "venta", "pollo", 1, "unidad", 41)];
    expect(precioVentaPorUnidad("pollo", { movimientos, ahora })).toMatchObject({ valor: 41, unidad: "unidad" });
    expect(costoPromedioPorUnidad("pollo", { movimientos, ahora, unidad: "unidad" })).toBeNull();
    expect(revisarMargen("pollo", { movimientos, ahora })).toBeNull();
  });
});

describe("en la pantalla del demo", () => {
  it("después del guion no aparece 'sin contar pollo'", () => {
    const hoy = new Date(2026, 10, 21, 10);
    const movimientos = [
      ...generarMovimientosDemo(hoy),
      { ...mov(new Date(2026, 10, 21, 9, 50).toISOString(), "fiado", "pollo entero", 1, "unidad", 41), cliente: "doña Rosa" },
    ];
    const g = gananciaDelDia({ movimientos, ahora: hoy });
    expect(g.productosSinCosto).toEqual([]);
    expect(revisarMargen("pollo entero", { movimientos, ahora: hoy })).toBeNull();
  });
});
