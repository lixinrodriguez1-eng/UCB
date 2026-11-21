import { describe, expect, it } from "vitest";
import datosJson from "@/data/caserita-datos-reales.json";
import {
  conversionesDelJson,
  datosReales,
  escenarioDelJson,
  leerUnidadConCantidad,
  preciosDelJson,
  productosDelJson,
  validarDatosReales,
} from "@/lib/datosReales";
import { datosMercadoPorDefecto } from "@/lib/datosMercado";
import { convertir, revisarMargen } from "@/lib/calculos";
import { parsearFrase } from "@/lib/parser";
import { fuenteReferencia, textoReferencia } from "@/lib/respuestas";
import type { Movimiento } from "@/types/movimiento";

describe("carga de caserita-datos-reales.json", () => {
  it("carga y pasa la validación", () => {
    expect(datosReales.precios_referencia).toHaveLength(10);
    expect(Object.keys(datosReales.unidades_locales)).toContain("arroba");
    expect(datosReales.escenario_demo_alerta_margen.semana_2).toHaveLength(2);
  });

  it("la validación avisa claro si falta algo", () => {
    expect(() => validarDatosReales({})).toThrow(/precios_referencia/);
    const sinFuente = { ...datosJson, precios_referencia: [{ producto: "pollo", unidad: "kilo", precio_ahora: 20 }] };
    expect(() => validarDatosReales(sinFuente)).toThrow(/precios_referencia\[0\]/);
  });
});

describe("unidades_locales", () => {
  it("se convierten a kilo o a unidades", () => {
    const c = conversionesDelJson();
    expect(c).toContainEqual({ unidad: "arroba", base: "kilo", factor: 11.5 });
    expect(c).toContainEqual({ unidad: "libra", base: "kilo", factor: 0.46 });
    expect(c).toContainEqual({ unidad: "cuartilla", base: "kilo", factor: 2.875 });
    expect(c).toContainEqual({ unidad: "docena", base: "unidad", factor: 12 });
    // "mano", "bolsa", "caja", "lata" no tienen equivalencia fija
    expect(c.map((x) => x.unidad)).not.toContain("mano");
  });

  it("la app usa esas conversiones", () => {
    expect(convertir(1, "cuartilla", "kilo")).toBe(2.875);
    expect(convertir(4, "cuartilla", "arroba")).toBe(1);
    expect(convertir(1, "kilo", "unidad")).toBeNull();
  });

  it("'3 libras' se lee como 3 de la unidad libra", () => {
    expect(leerUnidadConCantidad("3 libras", ["libra", "kilo"])).toEqual({ unidad: "libra", cuantas: 3 });
    expect(leerUnidadConCantidad("kilo", ["libra", "kilo"])).toEqual({ unidad: "kilo", cuantas: 1 });
  });
});

describe("precios_referencia", () => {
  const precios = preciosDelJson();

  it("pollo: Bs 20,50 el kilo, El Deber / eju.tv", () => {
    expect(precios.find((p) => p.producto === "pollo")).toEqual({
      producto: "pollo",
      unidad: "kilo",
      precio: 20.5,
      precioAntes: 12.5,
      fuente: "El Deber / eju.tv",
      mercado: "Abasto Minorista",
      fecha: "2026-07-28",
      url: "https://eju.tv/?p=5048758",
    });
  });

  it("pollo entero es otro producto, por unidad", () => {
    expect(precios.find((p) => p.producto === "pollo entero")).toMatchObject({ unidad: "unidad", precio: 41 });
  });

  it("'3 libras a Bs 8' queda en Bs 2,67 la libra", () => {
    expect(precios.find((p) => p.producto === "pepino")).toMatchObject({ unidad: "libra", precio: 2.67, precioAntes: 1.67 });
  });

  it("la app usa estos precios por defecto", () => {
    expect(datosMercadoPorDefecto.preciosReferencia).toEqual(precios);
  });

  it("texto en pantalla con su fuente", () => {
    const pollo = precios.find((p) => p.producto === "pollo")!;
    expect(textoReferencia(pollo)).toBe("En el mercado ya está a Bs 20,50 el kilo");
    expect(fuenteReferencia(pollo)).toBe("Fuente: El Deber / eju.tv · Abasto Minorista · 28 de julio de 2026");
  });
});

describe("vocabulario del JSON", () => {
  const { vocabulario } = datosReales;

  for (const tipo of ["venta", "compra", "fiado"] as const) {
    it.each(vocabulario[tipo])(`"%s" se entiende como ${tipo}`, (palabra) => {
      expect(parsearFrase(`doña Rosa ${palabra} 2 kilos de papa a 10`).tipo).toBe(tipo);
    });
  }

  it.each(vocabulario.moneda)("'%s' es la moneda", (moneda) => {
    expect(parsearFrase(`Vendí 2 kilos de papa a 10 ${moneda}`).total).toBe(10);
  });

  it.each([
    ["qr", "qr"],
    ["efectivo", "efectivo"],
    ["al contado", "efectivo"],
  ])("pago '%s'", (palabra, pago) => {
    expect(parsearFrase(`Vendí 2 kilos de papa a 10 ${palabra}`).pago).toBe(pago);
  });

  it("los productos del JSON están en el vocabulario del parser", () => {
    for (const producto of productosDelJson()) {
      expect(parsearFrase(`Vendí 2 kilos de ${producto} a 10`).producto).toBe(producto);
    }
  });

  it("plural de productos de varias palabras", () => {
    expect(parsearFrase("Vendí dos pollos enteros a 82").producto).toBe("pollo entero");
    expect(parsearFrase("Vendí 2 docenas de plátanos benianos a 35").producto).toBe("plátano beniano");
  });
});

describe("frases del escenario del JSON", () => {
  const { semana1, semana2 } = escenarioDelJson();

  it.each([...semana1, ...semana2].map((e) => [e.frase, e] as const))("%s", (frase, e) => {
    expect(parsearFrase(frase)).toMatchObject({
      tipo: e.tipo,
      producto: e.producto,
      cantidad: e.cantidad,
      unidad: e.unidad,
      total: e.total,
      faltantes: [],
    });
  });

  it("con esas compras la alerta trae el precio real", () => {
    const movs: Movimiento[] = [
      { id: "1", fecha: new Date(2026, 10, 16, 6).toISOString(), tipo: "compra", producto: "pollo", cantidad: 20, unidad: "kilo", total: 340, pago: "efectivo" },
      { id: "2", fecha: new Date(2026, 10, 16, 9).toISOString(), tipo: "venta", producto: "pollo", cantidad: 3, unidad: "kilo", total: 39, pago: "efectivo" },
    ];
    const alerta = revisarMargen("pollo", { movimientos: movs, ahora: new Date(2026, 10, 16, 12) })!;
    expect(textoReferencia(alerta.referencia!)).toBe("En el mercado ya está a Bs 20,50 el kilo");
  });
});
