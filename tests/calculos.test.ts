import { describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import type { DatosMercado } from "@/types/datosMercado";
import {
  convertir,
  costoPromedioPorUnidad,
  gananciaDeLaSemana,
  gananciaDelDia,
  precioVentaPorUnidad,
  revisarMargen,
} from "@/lib/calculos";
import { datosMercadoPorDefecto } from "@/lib/datosMercado";
import { escenarioDelJson } from "@/lib/datosReales";

/** Fecha en hora local: noviembre 2026 (el 16 es lunes). */
const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0, 0);

let n = 0;
function mov(
  d: number,
  tipo: Movimiento["tipo"],
  producto: string,
  cantidad: number,
  unidad: string,
  total: number,
  h = 10,
): Movimiento {
  return { id: String(++n), fecha: dia(d, h).toISOString(), tipo, producto, cantidad, unidad, total, pago: "efectivo" };
}

/*
 * Escenario propio (NO es el del JSON): el pollo sube de precio en la semana 2
 * y la caserita lo sigue vendiendo al mismo precio.
 *   Semana 1: compra 20 kg a Bs 200 (Bs 10/kg) · vende 3 kg a Bs 39 (Bs 13/kg)
 *   Semana 2: compra 20 kg a Bs 340 (Bs 17/kg) · vende 3 kg a Bs 39 (Bs 13/kg)
 */
const escenarioPollo: Movimiento[] = [
  mov(9, "compra", "pollo", 20, "kilo", 200, 6),
  mov(10, "venta", "pollo", 3, "kilo", 39),
  mov(16, "compra", "pollo", 20, "kilo", 340, 6),
  mov(17, "venta", "pollo", 3, "kilo", 39),
];

describe("escenario propio: el pollo sube y se sigue vendiendo igual", () => {
  it("semana 1: costo Bs 10/kg, vende a Bs 13/kg → sin alerta", () => {
    const op = { movimientos: escenarioPollo, ahora: dia(10, 18) };
    expect(costoPromedioPorUnidad("pollo", op)).toEqual({ valor: 10, unidad: "kilo" });
    expect(precioVentaPorUnidad("pollo", op)?.valor).toBe(13);
    expect(revisarMargen("pollo", op)).toBeNull();
  });

  it("semana 2: pierde Bs 4 por kilo", () => {
    const alerta = revisarMargen("pollo", { movimientos: escenarioPollo, ahora: dia(17, 18) });
    expect(alerta).toMatchObject({
      nivel: "perdida",
      unidad: "kilo",
      costo: 17,
      precio: 13,
      diferenciaPorUnidad: -4,
      titulo: "Estás perdiendo Bs 4 por kilo de pollo",
    });
  });

  it("la compra de hace más de 7 días ya no entra al costo", () => {
    const op = { movimientos: escenarioPollo, ahora: dia(17, 18) };
    expect(costoPromedioPorUnidad("pollo", op)?.valor).toBe(17);
  });

  it("ganancia de la semana 1 y de la semana 2", () => {
    expect(gananciaDeLaSemana({ movimientos: escenarioPollo, ahora: dia(14, 18) })).toEqual({
      ingresos: 39, costo: 30, ganancia: 9, productosSinCosto: [],
    });
    expect(gananciaDeLaSemana({ movimientos: escenarioPollo, ahora: dia(18, 18) })).toEqual({
      ingresos: 39, costo: 51, ganancia: -12, productosSinCosto: [],
    });
  });

  it("ganancia del día solo cuenta hoy", () => {
    expect(gananciaDelDia({ movimientos: escenarioPollo, ahora: dia(17, 18) }).ganancia).toBe(-12);
    expect(gananciaDelDia({ movimientos: escenarioPollo, ahora: dia(18, 18) }).ingresos).toBe(0);
  });
});

describe("conversión de unidades", () => {
  it("arroba, quintal y docena a su unidad base", () => {
    expect(convertir(1, "arroba", "kilo")).toBe(11.5);
    expect(convertir(2, "quintal", "arroba")).toBe(8);
    expect(convertir(0.5, "docena", "unidad")).toBe(6);
  });

  it("unidades incompatibles devuelven null", () => {
    expect(convertir(1, "kilo", "caja")).toBeNull();
  });

  it("costo promedio mezclando arroba y kilos", () => {
    const movimientos = [
      mov(16, "compra", "papa", 1, "arroba", 50),
      mov(17, "compra", "papa", 10, "kilo", 40),
    ];
    // Bs 90 / 21,5 kg
    expect(costoPromedioPorUnidad("papa", { movimientos, ahora: dia(17, 18) })).toEqual({
      valor: 4.19, unidad: "kilo",
    });
  });

  it("ignora compras en unidades que no se pueden convertir", () => {
    const movimientos = [
      mov(16, "compra", "tomate", 1, "caja", 120),
      mov(17, "compra", "tomate", 10, "kilo", 60),
    ];
    expect(costoPromedioPorUnidad("tomate", { movimientos, ahora: dia(17, 18) })?.valor).toBe(6);
  });

  it("precio de venta por docena pasado a unidad", () => {
    const movimientos = [mov(17, "venta", "pimentón", 0.5, "docena", 12)];
    expect(precioVentaPorUnidad("pimenton", { movimientos, ahora: dia(17, 18) })).toMatchObject({
      valor: 2, unidad: "unidad",
    });
  });
});

describe("revisarMargen", () => {
  const conPrecio = (precio: number) => [
    mov(16, "compra", "queso", 10, "kilo", 100),
    mov(17, "venta", "queso", 1, "kilo", precio),
  ];
  const op = (movimientos: Movimiento[]) => ({ movimientos, ahora: dia(17, 18) });

  it("4% de ganancia → margen bajo", () => {
    expect(revisarMargen("queso", op(conPrecio(10.4)))).toMatchObject({
      nivel: "margen-bajo", diferenciaPorUnidad: 0.4, margen: 0.04,
    });
  });

  it("justo 5% todavía es margen bajo", () => {
    expect(revisarMargen("queso", op(conPrecio(10.5)))?.nivel).toBe("margen-bajo");
  });

  it("6% ya no da alerta", () => {
    expect(revisarMargen("queso", op(conPrecio(10.6)))).toBeNull();
  });

  it("sin compras o sin ventas no hay alerta", () => {
    expect(revisarMargen("queso", op([mov(17, "venta", "queso", 1, "kilo", 5)]))).toBeNull();
    expect(revisarMargen("queso", op([mov(17, "compra", "queso", 1, "kilo", 5)]))).toBeNull();
  });

  it("el fiado cuenta como venta", () => {
    const movimientos = [
      mov(16, "compra", "pollo", 10, "kilo", 170),
      { ...mov(17, "fiado", "pollo", 2, "kilo", 26), cliente: "doña Rosa" },
    ];
    expect(revisarMargen("pollo", op(movimientos))?.diferenciaPorUnidad).toBe(-4);
  });

  it("incluye el precio de referencia, convertido a la unidad de la alerta", () => {
    // Datos de prueba, no son precios reales.
    const datos: DatosMercado = {
      ...datosMercadoPorDefecto,
      preciosReferencia: [{ producto: "pollo", precio: 172.5, unidad: "arroba", fuente: "Fuente de prueba" }],
    };
    const alerta = revisarMargen("pollo", { ...op(escenarioPollo), datos });
    expect(alerta?.referencia).toEqual({
      producto: "pollo", precio: 15, unidad: "kilo", fuente: "Fuente de prueba",
    });
  });

  it("venta sin compras previas queda en productosSinCosto", () => {
    const g = gananciaDelDia(op([mov(17, "venta", "charque", 1, "kilo", 80)]));
    expect(g).toEqual({ ingresos: 0, costo: 0, ganancia: 0, productosSinCosto: ["charque"] });
  });
});

describe("escenario_demo_alerta_margen (caserita-datos-reales.json)", () => {
  // Semana 1: lunes 9 de noviembre de 2026. Semana 2: lunes 16.
  const { semana1, semana2 } = escenarioDelJson();
  const aMovimientos = (eventos: typeof semana1, lunes: number): Movimiento[] =>
    eventos.map((e, i) => ({
      id: `esc-${lunes}-${i}`,
      // compras a primera hora, ventas después
      fecha: dia(lunes, e.tipo === "compra" ? 6 : 10 + i).toISOString(),
      tipo: e.tipo,
      producto: e.producto,
      cantidad: e.cantidad,
      unidad: e.unidad,
      total: e.total,
      pago: "efectivo",
    }));
  const movimientos = [...aMovimientos(semana1, 9), ...aMovimientos(semana2, 16)];

  it("semana 1 no da alerta", () => {
    expect(revisarMargen("pollo", { movimientos, ahora: dia(13, 18) })).toBeNull();
  });

  it("la semana 2 da pérdida de Bs 4 por kilo, con el precio real del mercado y su fuente", () => {
    const alerta = revisarMargen("pollo", { movimientos, ahora: dia(17, 18) });
    expect(alerta).toMatchObject({
      nivel: "perdida",
      unidad: "kilo",
      costo: 17,
      precio: 13,
      diferenciaPorUnidad: -4,
      referencia: {
        producto: "pollo",
        precio: 20.5,
        unidad: "kilo",
        fuente: "El Deber / eju.tv",
        mercado: "Abasto Minorista",
        fecha: "2026-07-28",
      },
    });
  });
});
