/**
 * Lectura de números hablados en español ("veinte", "ciento veinticinco",
 * "dos y medio", "media", "1,5") a partir de tokens ya normalizados
 * (minúsculas y sin tildes).
 */

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9,
};

const ESPECIALES: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
};

const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90,
};

const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100,
  doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

const MEDIOS = new Set(["medio", "media"]);

export interface NumeroLeido {
  valor: number;
  /** Índice del primer token que ya no forma parte del número. */
  fin: number;
}

function esDigito(t: string | undefined): boolean {
  return t !== undefined && /^\d+(?:[.,]\d+)?$/.test(t);
}

function valorDigitos(t: string): number {
  // "1.000" → mil; "1,5" o "1.5" → uno coma cinco
  if (/^\d{1,3}\.\d{3}$/.test(t)) return Number(t.replace(".", ""));
  return Number(t.replace(",", "."));
}

/** ¿El token, por sí solo, puede empezar un número? */
export function esPalabraNumero(t: string | undefined): boolean {
  if (t === undefined) return false;
  return (
    esDigito(t) || t in UNIDADES || t in ESPECIALES || t in DECENAS ||
    t in CENTENAS || t === "mil" || MEDIOS.has(t)
  );
}

/** Suma "y medio" / "y media" si viene justo en la posición `i`. */
export function leerYMedio(tokens: string[], i: number): number {
  return tokens[i] === "y" && MEDIOS.has(tokens[i + 1] ?? "") ? 2 : 0;
}

/**
 * Intenta leer un número que empiece en `tokens[i]`.
 * Devuelve null si ahí no empieza ningún número.
 */
export function leerNumero(tokens: string[], i: number): NumeroLeido | null {
  const primero = tokens[i];
  if (primero === undefined) return null;

  let valor: number;
  let j = i;

  if (esDigito(primero)) {
    valor = valorDigitos(primero);
    j = i + 1;
    if (tokens[j] === "mil") {
      valor *= 1000;
      j++;
    }
  } else if (MEDIOS.has(primero)) {
    return { valor: 0.5, fin: i + 1 };
  } else {
    let total = 0;
    let actual = 0;
    let ultimo: "unidad" | "especial" | "decena" | "centena" | "mil" | null = null;

    while (j < tokens.length) {
      const t = tokens[j];
      if (t in UNIDADES) {
        if (ultimo === "unidad" || ultimo === "especial") break;
        actual += UNIDADES[t];
        ultimo = "unidad";
      } else if (t in ESPECIALES) {
        if (ultimo === "unidad" || ultimo === "especial" || ultimo === "decena") break;
        actual += ESPECIALES[t];
        ultimo = "especial";
      } else if (t in DECENAS) {
        if (ultimo === "unidad" || ultimo === "especial" || ultimo === "decena") break;
        actual += DECENAS[t];
        ultimo = "decena";
      } else if (
        t === "y" &&
        ultimo === "decena" &&
        tokens[j + 1] !== undefined &&
        tokens[j + 1] in UNIDADES &&
        tokens[j + 1] !== "cero"
      ) {
        // "cuarenta y cinco"
        actual += UNIDADES[tokens[j + 1]];
        ultimo = "unidad";
        j += 2;
        continue;
      } else if (t in CENTENAS) {
        if (ultimo !== null && ultimo !== "mil") break;
        actual += CENTENAS[t];
        ultimo = "centena";
      } else if (t === "mil") {
        if (ultimo === "mil") break;
        total += (actual || 1) * 1000;
        actual = 0;
        ultimo = "mil";
      } else {
        break;
      }
      j++;
    }

    if (ultimo === null) return null;
    valor = total + actual;
  }

  // "dos y medio"
  const extra = leerYMedio(tokens, j);
  if (extra) {
    valor += 0.5;
    j += extra;
  }

  return { valor, fin: j };
}
