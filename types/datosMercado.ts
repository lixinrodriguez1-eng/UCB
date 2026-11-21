/**
 * Datos del mercado que vienen de /data/caserita-datos-reales.json
 * (unidades_locales y precios_referencia).
 */

/** 1 `unidad` equivale a `factor` de `base`. Ej: 1 arroba = 11,5 kilo. */
export interface ConversionUnidad {
  unidad: string;
  base: string;
  factor: number;
}

export interface PrecioReferencia {
  producto: string;
  /** Precio en Bs por `unidad`. */
  precio: number;
  unidad: string;
  /** De dónde sale el dato (ej. un medio o una institución). */
  fuente: string;
  /** "AAAA-MM-DD" */
  fecha?: string;
  /** Mercado donde se relevó (ej. "Abasto Minorista"). */
  mercado?: string;
  url?: string;
  /** Precio anterior, en Bs por `unidad`, si la fuente lo da. */
  precioAntes?: number;
}

export interface DatosMercado {
  conversiones: ConversionUnidad[];
  preciosReferencia: PrecioReferencia[];
}
