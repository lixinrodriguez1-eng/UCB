import type { ConversionUnidad, DatosMercado } from "@/types/datosMercado";
import { conversionesDelJson, preciosDelJson } from "@/lib/datosReales";

/**
 * Unidades que usa el parser y que el JSON no trae. Se agregan solo si el
 * JSON no las define (el JSON siempre manda).
 */
const CONVERSIONES_EXTRA: ConversionUnidad[] = [
  { unidad: "quintal", base: "kilo", factor: 46 }, // 4 arrobas = 100 libras
  { unidad: "maple", base: "unidad", factor: 30 }, // maple de huevos
  { unidad: "litro", base: "litro", factor: 1 },
];

function unirConversiones(delJson: ConversionUnidad[]): ConversionUnidad[] {
  const ya = new Set(delJson.map((c) => c.unidad));
  return [...delJson, ...CONVERSIONES_EXTRA.filter((c) => !ya.has(c.unidad))];
}

/** Conversiones y precios de referencia reales, de /data/caserita-datos-reales.json. */
export const datosMercadoPorDefecto: DatosMercado = {
  conversiones: unirConversiones(conversionesDelJson()),
  preciosReferencia: preciosDelJson(),
};
