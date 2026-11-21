/**
 * Carga /data/caserita-datos-reales.json y lo convierte a lo que usa la app:
 * conversiones de unidades, precios de referencia (con su fuente),
 * productos y el escenario del demo.
 */
import datosJson from "@/data/caserita-datos-reales.json";
import type { DatosRealesJson, MovimientoEscenarioJson } from "@/types/datosReales";
import type { ConversionUnidad, PrecioReferencia } from "@/types/datosMercado";

/** Revisa que el JSON tenga lo mínimo que la app necesita; si no, avisa claro. */
export function validarDatosReales(datos: unknown): DatosRealesJson {
  const d = datos as Partial<DatosRealesJson> | null;
  const faltan: string[] = [];
  if (!d || typeof d !== "object") throw new Error("caserita-datos-reales.json no es un objeto JSON");
  if (!Array.isArray(d.precios_referencia)) faltan.push("precios_referencia (lista)");
  if (!d.unidades_locales || typeof d.unidades_locales !== "object") faltan.push("unidades_locales (objeto)");
  if (!d.vocabulario || typeof d.vocabulario !== "object") faltan.push("vocabulario (objeto)");
  const esc = d.escenario_demo_alerta_margen;
  if (!esc || !Array.isArray(esc.semana_1) || !Array.isArray(esc.semana_2)) {
    faltan.push("escenario_demo_alerta_margen.semana_1 / semana_2");
  }
  if (faltan.length) throw new Error(`A caserita-datos-reales.json le falta: ${faltan.join(", ")}`);

  for (const [i, p] of d.precios_referencia!.entries()) {
    if (typeof p.producto !== "string" || typeof p.unidad !== "string" || typeof p.precio_ahora !== "number" || typeof p.fuente !== "string") {
      throw new Error(`precios_referencia[${i}] necesita producto, unidad, precio_ahora y fuente`);
    }
  }
  return d as DatosRealesJson;
}

export const datosReales: DatosRealesJson = validarDatosReales(datosJson);

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

/** Unidades del JSON que se pueden pasar a kilo o a unidades. */
export function conversionesDelJson(datos: DatosRealesJson = datosReales): ConversionUnidad[] {
  const lista: ConversionUnidad[] = [];
  for (const [unidad, info] of Object.entries(datos.unidades_locales)) {
    if (typeof info.kg === "number") lista.push({ unidad, base: "kilo", factor: info.kg });
    else if (typeof info.unidades === "number") lista.push({ unidad, base: "unidad", factor: info.unidades });
    // "mano", "bolsa", "caja", "lata": sin equivalencia fija, no se convierten.
  }
  return lista;
}

/** "libras" → "libra" si "libra" es una unidad conocida. */
function singularDeUnidad(texto: string, conocidas: string[]): string {
  const t = texto.trim().toLowerCase();
  return conocidas.find((u) => t === u || t === `${u}s` || t === `${u}es`) ?? t;
}

/**
 * "3 libras" → { unidad: "libra", cuantas: 3 }; "kilo" → { unidad: "kilo", cuantas: 1 }.
 */
export function leerUnidadConCantidad(texto: string, conocidas: string[]): { unidad: string; cuantas: number } {
  const m = texto.trim().match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!m) return { unidad: singularDeUnidad(texto, conocidas), cuantas: 1 };
  return { unidad: singularDeUnidad(m[2], conocidas), cuantas: Number(m[1].replace(",", ".")) };
}

// ---------------------------------------------------------------------------
// Precios de referencia
// ---------------------------------------------------------------------------

/** Precios de la prensa, pasados a precio por una unidad ("3 libras a 8" → Bs 2,67 la libra). */
export function preciosDelJson(datos: DatosRealesJson = datosReales): PrecioReferencia[] {
  const conocidas = Object.keys(datos.unidades_locales);
  return datos.precios_referencia.map((p) => {
    const { unidad, cuantas } = leerUnidadConCantidad(p.unidad, conocidas);
    const porUnidad = (x: number) => Math.round((x / cuantas) * 100) / 100;
    return {
      producto: p.producto,
      unidad,
      precio: porUnidad(p.precio_ahora),
      fuente: p.fuente,
      fecha: p.fecha,
      mercado: p.mercado,
      url: p.url,
      ...(typeof p.precio_antes === "number" ? { precioAntes: porUnidad(p.precio_antes) } : {}),
    };
  });
}

/** Productos que el JSON menciona (para el vocabulario del parser). */
export function productosDelJson(datos: DatosRealesJson = datosReales): string[] {
  const nombres = [
    ...datos.precios_referencia.map((p) => p.producto),
    ...datos.escenario_demo_alerta_margen.semana_1.map((m) => m.producto),
    ...datos.escenario_demo_alerta_margen.semana_2.map((m) => m.producto),
  ];
  return [...new Set(nombres)];
}

export function escenarioDelJson(datos: DatosRealesJson = datosReales): {
  semana1: MovimientoEscenarioJson[];
  semana2: MovimientoEscenarioJson[];
  alertaEsperada: string;
} {
  const e = datos.escenario_demo_alerta_margen;
  return { semana1: e.semana_1, semana2: e.semana_2, alertaEsperada: e.alerta_esperada };
}
