/**
 * Vocabulario que el parser usa para reconocer productos y unidades.
 * Pensado para cargarse desde /data/caserita-datos-reales.json.
 */
export interface ProductoVocabulario {
  /** Nombre canónico, con tildes (ej. "pimentón"). */
  nombre: string;
  /** Otras formas de decirlo (ej. "chancho" para "carne de cerdo"). */
  sinonimos?: string[];
}

export interface UnidadVocabulario {
  /** Nombre canónico en singular (ej. "kilo"). */
  nombre: string;
  /** Abreviaturas y variantes (ej. "kg", "kilogramo"). */
  sinonimos?: string[];
}

export interface Vocabulario {
  productos: ProductoVocabulario[];
  unidades: UnidadVocabulario[];
}
