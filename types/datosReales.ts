/**
 * Forma exacta de /data/caserita-datos-reales.json.
 */

export interface PrecioReferenciaJson {
  producto: string;
  /** "kilo", "unidad", "arroba", "docena" o con cantidad: "3 libras". */
  unidad: string;
  precio_antes: number | null;
  precio_ahora: number;
  /** [mínimo, máximo] cuando la nota da un rango. */
  rango?: [number, number];
  mercado: string;
  /** "AAAA-MM-DD" */
  fecha: string;
  fuente: string;
  url: string;
  comentario?: string;
}

/** Una unidad local: cuántos kg o cuántas unidades tiene (si se sabe). */
export interface UnidadLocalJson {
  kg?: number;
  unidades?: number;
  nota?: string;
}

export interface MovimientoEscenarioJson {
  frase: string;
  tipo: "venta" | "compra" | "fiado";
  producto: string;
  cantidad: number;
  unidad: string;
  total: number;
}

export interface DatosRealesJson {
  _nota: string;
  precios_referencia: PrecioReferenciaJson[];
  unidades_locales: Record<string, UnidadLocalJson>;
  vocabulario: {
    venta: string[];
    compra: string[];
    fiado: string[];
    moneda: string[];
    pago: string[];
  };
  escenario_demo_alerta_margen: {
    _explicacion: string;
    semana_1: MovimientoEscenarioJson[];
    semana_2: MovimientoEscenarioJson[];
    alerta_esperada: string;
  };
  datos_para_el_pitch: { dato: string; url: string }[];
}
