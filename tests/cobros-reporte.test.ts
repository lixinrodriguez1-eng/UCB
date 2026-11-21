import { describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import { deudas } from "@/lib/calculos";
import { enlaceWhatsApp, mensajeCobro, normalizarCelular } from "@/lib/cobros";
import { generarReporte } from "@/lib/reporte";
import { generarMovimientosDemo } from "@/lib/demo";

const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString(); // el 16 es lunes
let n = 0;
const mov = (
  fecha: string, tipo: Movimiento["tipo"], producto: string, cantidad: number, total: number, cliente?: string,
): Movimiento => ({
  id: String(++n), fecha, tipo, producto, cantidad, unidad: "kilo", total, pago: "efectivo",
  ...(cliente ? { cliente } : {}),
});

describe("mensajeCobro", () => {
  it("el ejemplo: doña Rosa, Bs 41 del pollo", () => {
    expect(mensajeCobro({ cliente: "doña Rosa", total: 41, productos: ["pollo"] })).toBe(
      "Hola doña Rosa, le recuerdo los Bs 41 del pollo 🙂",
    );
  });

  it("varios productos con su artículo", () => {
    expect(mensajeCobro({ cliente: "don Pedro", total: 27.5, productos: ["pollo", "papa", "queso"] })).toBe(
      "Hola don Pedro, le recuerdo los Bs 27,50 del pollo, de la papa y del queso 🙂",
    );
    expect(mensajeCobro({ cliente: "Juan", total: 30, productos: ["carne de res"] })).toBe(
      "Hola Juan, le recuerdo los Bs 30 de la carne de res 🙂",
    );
  });

  it("sin nombre saluda igual", () => {
    expect(mensajeCobro({ cliente: "Sin nombre", total: 10, productos: ["tomate"] })).toBe(
      "Hola, le recuerdo los Bs 10 del tomate 🙂",
    );
  });
});

describe("WhatsApp", () => {
  it.each([
    ["71234567", "59171234567"],
    ["7123 4567", "59171234567"],
    ["+591 6 123 4567", "59161234567"],
    ["59171234567", "59171234567"],
    ["12345", null],
    ["51234567", null],
  ])("celular %s → %s", (entrada, esperado) => {
    expect(normalizarCelular(entrada)).toBe(esperado);
  });

  it("arma el enlace con el mensaje codificado", () => {
    const msg = "Hola doña Rosa, le recuerdo los Bs 41 del pollo 🙂";
    expect(enlaceWhatsApp(msg, "71234567")).toBe(`https://wa.me/59171234567?text=${encodeURIComponent(msg)}`);
    expect(enlaceWhatsApp(msg)).toBe(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  });
});

describe("deudas con detalle", () => {
  it("junta productos sin repetir y ordena los apuntes", () => {
    const movimientos = [
      mov(dia(16), "fiado", "pollo", 2, 26, "doña Rosa"),
      mov(dia(17), "fiado", "Pollo", 1, 15, "Doña Rosa"),
      mov(dia(18), "fiado", "papa", 1, 6, "doña rosa"),
    ];
    const [rosa] = deudas({ movimientos, ahora: new Date(2026, 10, 19) });
    expect(rosa.total).toBe(47);
    expect(rosa.productos).toEqual(["pollo", "papa"]);
    expect(rosa.apuntes.map((a) => a.total)).toEqual([6, 15, 26]);
    expect(mensajeCobro(rosa)).toBe("Hola doña Rosa, le recuerdo los Bs 47 del pollo y de la papa 🙂");
  });
});

describe("generarReporte", () => {
  it("sin datos", () => {
    const r = generarReporte({ movimientos: [], ahora: new Date(2026, 10, 19) });
    expect(r).toMatchObject({ desde: null, semanas: [], ventasTotales: 0, diasTrabajados: 0, productoPrincipal: null });
  });

  it("semanas, promedios, días trabajados y producto principal", () => {
    const movimientos = [
      mov(dia(9, 6), "compra", "pollo", 20, 200),  // semana 1: Bs 10/kg
      mov(dia(9), "venta", "pollo", 3, 45),        // +15
      mov(dia(11), "venta", "pollo", 2, 30),       // +10
      mov(dia(16, 6), "compra", "pollo", 10, 120), // semana 2: Bs 12/kg (la del 9 ya tiene más de 7 días)
      mov(dia(16), "venta", "pollo", 2, 30),       // +6
      mov(dia(17), "fiado", "pollo", 1, 15, "doña Rosa"), // +3
      mov(dia(17, 11), "venta", "queso", 1, 20),   // sin compra: no entra en la ganancia
    ];
    const r = generarReporte({ movimientos, ahora: new Date(2026, 10, 19, 15) });

    expect(r.semanas.map((s) => s.inicio.getDate())).toEqual([9, 16]);
    expect(r.semanas.map((s) => s.ventas)).toEqual([75, 65]);
    expect(r.semanas.map((s) => s.compras)).toEqual([200, 120]);
    expect(r.semanas.map((s) => s.ganancia)).toEqual([25, 9]);
    expect(r.semanas.map((s) => s.diasTrabajados)).toEqual([2, 2]);
    expect(r.semanas[1].productosSinCosto).toEqual(["queso"]);

    expect(r).toMatchObject({
      ventasTotales: 140,
      comprasTotales: 320,
      gananciaTotal: 34,
      diasTrabajados: 4,
      gananciaPromedioSemanal: 17,
      gananciaPromedioDiaria: 8.5,
      ventaPromedioDiaria: 35,
      productoPrincipal: { producto: "pollo", ventas: 120, porcentaje: 86 },
      porCobrar: 15,
      cantidadMovimientos: 7,
    });
  });

  it("con el demo: dos semanas y el pollo como producto principal", () => {
    const ahora = new Date(2026, 10, 19, 15);
    const r = generarReporte({ movimientos: generarMovimientosDemo(ahora), ahora });
    expect(r.semanas).toHaveLength(2);
    expect(r.semanas[0].diasTrabajados).toBe(6);
    expect(r.semanas[1].diasTrabajados).toBe(4);
    expect(r.productoPrincipal?.producto).toBe("pollo");
    expect(r.semanas[1].ganancia).toBeLessThan(r.semanas[0].ganancia);
  });
});
