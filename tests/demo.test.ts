import { describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import { gananciaPorDia, revisarMargen, ventasDelDia } from "@/lib/calculos";
import { generarMovimientosDemo, hayDatosDemo } from "@/lib/demo";

// Jueves 19 de noviembre de 2026, 15:00 (hora local). El lunes es el 16.
const jueves = new Date(2026, 10, 19, 15, 0);
const demo = generarMovimientosDemo(jueves);

describe("generarMovimientosDemo", () => {
  it("no carga nada del futuro", () => {
    expect(demo.every((m) => new Date(m.fecha) <= jueves)).toBe(true);
  });

  it("semana 1 es la semana pasada y semana 2 esta semana hasta hoy", () => {
    const dias = new Set(demo.map((m) => new Date(m.fecha).getDate()));
    // Semana pasada: lunes 9 a sábado 14. Esta semana: lunes 16 a jueves 19.
    expect([...dias].sort((a, b) => a - b)).toEqual([9, 10, 11, 12, 13, 14, 16, 17, 18, 19]);
  });

  it("ids únicos", () => {
    expect(new Set(demo.map((m) => m.id)).size).toBe(demo.length);
  });

  it("semana 1: el pollo deja ganancia (sin alerta)", () => {
    expect(revisarMargen("pollo", { movimientos: demo, ahora: new Date(2026, 10, 13, 18, 0) })).toBeNull();
  });

  it("semana 2: pierde Bs 4 por kilo de pollo", () => {
    expect(revisarMargen("pollo", { movimientos: demo, ahora: jueves })).toMatchObject({
      nivel: "perdida", costo: 17, precio: 13, diferenciaPorUnidad: -4, unidad: "kilo",
    });
  });

  it("lo de hoy que todavía no pasó se corre a antes de ahora, en orden", () => {
    const temprano = new Date(2026, 10, 19, 8, 0); // antes de las ventas de las 9
    const lista = generarMovimientosDemo(temprano);
    const deHoy = lista.filter((m) => new Date(m.fecha).getDate() === 19);
    expect(deHoy.length).toBeGreaterThan(0);
    expect(deHoy.every((m) => new Date(m.fecha) <= temprano)).toBe(true);
    const tiempos = deHoy.map((m) => new Date(m.fecha).getTime());
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b));
  });
});

describe("pantalla principal", () => {
  const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString();
  const mov = (fecha: string, tipo: Movimiento["tipo"], producto: string, cantidad: number, total: number): Movimiento =>
    ({ id: fecha + producto + tipo, fecha, tipo, producto, cantidad, unidad: "kilo", total, pago: "efectivo" });

  const movimientos = [
    mov(dia(16, 6), "compra", "pollo", 20, 200),
    mov(dia(16), "venta", "pollo", 3, 45),       // +15
    mov(dia(17), "venta", "pollo", 2, 16),       // −4
    mov(dia(19, 9), "venta", "pollo", 1, 15),    // +5
    mov(dia(19, 11), "fiado", "charque", 1, 80), // sin costo
  ];
  const ahora = new Date(2026, 10, 19, 15, 0);

  it("ventasDelDia cuenta ventas y fiados, con o sin costo", () => {
    expect(ventasDelDia({ movimientos, ahora })).toBe(95);
  });

  it("gananciaPorDia devuelve lunes a domingo", () => {
    const dias = gananciaPorDia({ movimientos, ahora });
    expect(dias.map((d) => d.fecha.getDate())).toEqual([16, 17, 18, 19, 20, 21, 22]);
    expect(dias.map((d) => d.ganancia)).toEqual([15, -4, 0, 5, 0, 0, 0]);
    expect(dias.map((d) => d.hayVentas)).toEqual([true, true, false, true, false, false, false]);
    expect(dias.map((d) => d.futuro)).toEqual([false, false, false, false, true, true, true]);
    expect(dias.find((d) => d.esHoy)?.productosSinCosto).toEqual(["charque"]);
  });
});

describe("hayDatosDemo", () => {
  it("detecta el demo aunque se registren movimientos reales encima", () => {
    const demo = generarMovimientosDemo(new Date(2026, 10, 19, 15));
    const real = { id: "a1b2c3", fecha: new Date().toISOString(), tipo: "venta" as const, producto: "papa", cantidad: 1, unidad: "kilo", total: 6, pago: "efectivo" as const };
    expect(hayDatosDemo(demo)).toBe(true);
    expect(hayDatosDemo([real, ...demo])).toBe(true);
    expect(hayDatosDemo([real])).toBe(false);
    expect(hayDatosDemo([])).toBe(false);
  });
});
