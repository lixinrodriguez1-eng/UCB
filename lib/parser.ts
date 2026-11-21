import type { FormaPago, Movimiento, TipoMovimiento } from "@/types/movimiento";
import type { Vocabulario } from "@/types/vocabulario";
import { CATALOGO, resolverCategoria } from "@/lib/catalogo";
import { esPalabraNumero, leerNumero, leerYMedio } from "@/lib/numeros";
import { vocabularioPorDefecto } from "@/lib/vocabulario";

/** Campos que el parser intenta sacar de la frase. */
export type CampoParseado = Omit<Movimiento, "id" | "fecha">;
export type NombreCampo = keyof CampoParseado;

/** Lo que se entendió de la frase + lo que faltó. */
export type ResultadoParseo = Partial<CampoParseado> & {
  faltantes: NombreCampo[];
};

/** true si la frase trae todo lo necesario para guardar el movimiento. */
export function estaCompleto(
  r: ResultadoParseo,
): r is ResultadoParseo & CampoParseado {
  return r.faltantes.length === 0;
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

interface Token {
  /** Como se escribió (para conservar nombres propios). */
  orig: string;
  /** Minúsculas y sin tildes. */
  norm: string;
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenizar(texto: string): Token[] {
  const partes = texto.match(/\d+(?:[.,]\d+)?|\p{L}+/gu) ?? [];
  return partes.map((orig) => ({ orig, norm: normalizar(orig) }));
}

/** Formas plurales de una palabra ya normalizada. */
function plurales(palabra: string): string[] {
  if (/[aeiou]$/.test(palabra)) return [palabra + "s"];
  if (palabra.endsWith("z")) return [palabra.slice(0, -1) + "ces"];
  return [palabra + "es", palabra + "s"];
}

/** Variantes de una expresión (singular y plural de su primera palabra). */
/**
 * Variantes de una expresión: singular, plural de la primera palabra y plural
 * de todas las palabras antes de "de" ("pollos enteros", "carnes de res").
 */
function variantes(expresion: string): string[] {
  const palabras = normalizar(expresion).split(/\s+/);
  const [primera, ...resto] = palabras;
  const formas = [primera, ...plurales(primera)].map((p) => [p, ...resto].join(" "));

  const corte = palabras.indexOf("de");
  const hasta = corte === -1 ? palabras.length : corte;
  if (hasta > 1) {
    const todas = palabras.map((p, i) => (i < hasta ? plurales(p)[0] : p));
    formas.push(todas.join(" "));
  }
  return [...new Set(formas)];
}

// ---------------------------------------------------------------------------
// Palabras clave
// ---------------------------------------------------------------------------

const MARCAS_FIADO = new Set([
  "fiado", "fiada", "fiados", "fie", "fio", "fiar", "fiamos",
  "apuntado", "apuntada", "apunte", "apunto", "anotado", "anotada", "anote",
  "debe", "deben", "cuenta",
]);
// Incluye el vocabulario de /data/caserita-datos-reales.json:
// compra: "traje", "me trajeron", "pagué por" · venta: "despaché", "se llevó".
const MARCAS_COMPRA = new Set([
  "compre", "compro", "compramos", "comprado", "compra", "compras",
  "traje", "trajeron", "pague",
]);
const MARCAS_VENTA = new Set([
  "vendi", "vendo", "vendimos", "vendido", "venta", "ventas", "vendio", "llevo",
  "despache", "despachamos",
]);
const PAGO_QR = new Set(["qr", "transferencia", "transferi", "deposito"]);
const PAGO_EFECTIVO = new Set(["efectivo", "contado", "cash"]);
const MONEDA = new Set(["bs", "boliviano", "bolivianos", "peso", "pesos"]);
const ANTES_DE_TOTAL = new Set([
  "a", "por", "en", "son", "total", "cobre", "pague", "cuesta", "vale",
  // "don Juan me debe 30": el número suelto después de "debe" es el monto.
  "debe", "deben",
]);
/** Títulos de trato, normalizados → como se escriben ("dona" → "doña"). */
export const TITULOS: Record<string, string> = {
  don: "don", dona: "doña", senor: "señor", senora: "señora",
  sr: "señor", sra: "señora", casera: "casera", casero: "casero",
  caserita: "caserita", caserito: "caserito", tia: "tía", tio: "tío",
  vecina: "vecina", vecino: "vecino", comadre: "comadre", compadre: "compadre",
};
const ARTICULOS = new Set(["el", "la", "los", "las"]);
const PALABRAS_VACIAS = new Set([
  "a", "al", "de", "del", "el", "la", "los", "las", "le", "les", "me", "se",
  "y", "o", "por", "con", "en", "para", "que", "mi", "su", "cada", "x",
  "entero", "entera", "enteros", "enteras", "nomas", "ya", "hoy", "ayer",
  "lleva", "llevaron", "uno", "una", "un",
]);

const RESERVADAS = new Set([
  ...MARCAS_FIADO, ...MARCAS_COMPRA, ...MARCAS_VENTA, ...PAGO_QR,
  ...PAGO_EFECTIVO, ...MONEDA, ...ANTES_DE_TOTAL, ...PALABRAS_VACIAS,
]);

// ---------------------------------------------------------------------------
// Índices del vocabulario
// ---------------------------------------------------------------------------

interface Indices {
  unidades: Map<string, string>;
  productos: Map<string, string>;
  maxPalabrasProducto: number;
}

const cacheIndices = new WeakMap<Vocabulario, Indices>();

function indexar(vocabulario: Vocabulario): Indices {
  const enCache = cacheIndices.get(vocabulario);
  if (enCache) return enCache;

  const unidades = new Map<string, string>();
  for (const u of vocabulario.unidades) {
    for (const forma of [u.nombre, ...(u.sinonimos ?? [])]) {
      for (const v of variantes(forma)) unidades.set(v, u.nombre);
    }
  }

  const productos = new Map<string, string>();
  let maxPalabrasProducto = 1;
  for (const p of vocabulario.productos) {
    for (const forma of [p.nombre, ...(p.sinonimos ?? [])]) {
      for (const v of variantes(forma)) {
        productos.set(v, p.nombre);
        maxPalabrasProducto = Math.max(maxPalabrasProducto, v.split(" ").length);
      }
    }
  }
  for (const p of Array.isArray(CATALOGO) ? CATALOGO : []) {
    for (const forma of [p.nombre, ...(p.sinonimos ?? [])]) {
      for (const v of variantes(forma)) {
        if (!productos.has(v)) productos.set(v, p.nombre);
        maxPalabrasProducto = Math.max(maxPalabrasProducto, v.split(" ").length);
      }
    }
  }

  const indices = { unidades, productos, maxPalabrasProducto };
  cacheIndices.set(vocabulario, indices);
  return indices;
}

/** Busca el producto más largo que empiece en `i`. */
function productoEn(
  n: string[],
  i: number,
  idx: Indices,
): { nombre: string; fin: number } | null {
  for (let largo = idx.maxPalabrasProducto; largo >= 1; largo--) {
    if (i + largo > n.length) continue;
    const frase = n.slice(i, i + largo).join(" ");
    const nombre = idx.productos.get(frase);
    if (nombre) return { nombre, fin: i + largo };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detección de cada campo
// ---------------------------------------------------------------------------

function detectarTipo(n: string[]): TipoMovimiento | undefined {
  if (n.some((t) => MARCAS_FIADO.has(t))) return "fiado";
  for (let i = 0; i < n.length; i++) {
    // "me vendieron" / "me vendió" = la caserita compró
    if (n[i] === "me" && /^vendi(o|eron)$/.test(n[i + 1] ?? "")) return "compra";
    if (MARCAS_COMPRA.has(n[i])) return "compra";
    if (MARCAS_VENTA.has(n[i])) return "venta";
  }
  return undefined;
}

function detectarPago(n: string[]): FormaPago {
  if (n.some((t) => PAGO_QR.has(t))) return "qr";
  // Lo normal en el mercado es efectivo.
  return "efectivo";
}

function capitalizar(palabra: string): string {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
}

function esPalabraDeNombre(t: Token, idx: Indices): boolean {
  return (
    !RESERVADAS.has(t.norm) &&
    !esPalabraNumero(t.norm) &&
    !idx.unidades.has(t.norm) &&
    !idx.productos.has(t.norm)
  );
}

function armarNombre(tokens: Token[]): string {
  return tokens
    .map((t) => TITULOS[t.norm] ?? capitalizar(t.orig))
    .join(" ");
}

function detectarCliente(tokens: Token[], idx: Indices): string | undefined {
  const n = tokens.map((t) => t.norm);

  // 1) "doña Rosa", "don Pedro Rojas"
  for (let i = 0; i < tokens.length; i++) {
    if (!(n[i] in TITULOS)) continue;
    const nombre: Token[] = [tokens[i]];
    let j = i + 1;
    while (j < tokens.length && nombre.length < 3 && esPalabraDeNombre(tokens[j], idx)) {
      // Un segundo nombre/apellido solo si viene con mayúscula.
      if (nombre.length > 1 && tokens[j].orig[0] === tokens[j].orig[0].toLowerCase()) break;
      nombre.push(tokens[j]);
      j++;
    }
    if (nombre.length > 1) return armarNombre(nombre);
  }

  // 2) "Juan se llevó...", "La Rosa me debe..."
  for (let i = 1; i < tokens.length; i++) {
    const esSeLlevo = n[i] === "se" && /^lleva(ron)?$|^llevo$/.test(n[i + 1] ?? "");
    const esMeDebe = n[i] === "me" && n[i + 1] === "debe";
    if (!esSeLlevo && !esMeDebe) continue;
    let inicio = 0;
    while (inicio < i && ARTICULOS.has(n[inicio])) inicio++;
    const sujeto = tokens.slice(inicio, i);
    if (
      sujeto.length >= 1 &&
      sujeto.length <= 3 &&
      sujeto.every((t) => t.norm in TITULOS || esPalabraDeNombre(t, idx))
    ) {
      return armarNombre(sujeto);
    }
  }

  // 3) "le fié a Juan", "para Juan"
  for (let i = 0; i < tokens.length - 1; i++) {
    if ((n[i] === "a" || n[i] === "para") && esPalabraDeNombre(tokens[i + 1], idx)) {
      return armarNombre([tokens[i + 1]]);
    }
  }

  return undefined;
}

/** ¿Después del precio viene "el kilo", "cada uno", "por docena"...? */
function largoPrecioUnitario(n: string[], i: number, idx: Indices): number {
  const t = n[i];
  const sig = n[i + 1];
  if (t === "cada") {
    if (sig && (idx.unidades.has(sig) || sig === "uno" || sig === "una")) return 2;
    return 1;
  }
  if ((t === "el" || t === "la" || t === "por" || t === "x") && sig && idx.unidades.has(sig)) {
    return 2;
  }
  return 0;
}

const redondear = (x: number) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

/**
 * Convierte una frase hablada en los campos de un Movimiento.
 *
 * - Números en palabras o dígitos (uno a mil, "y medio", "media").
 * - "pesos" = bolivianos.
 * - "a X" es el TOTAL, salvo que diga "a X el kilo" / "a X cada uno".
 * - No importan tildes, mayúsculas ni plural/singular del producto.
 *
 * Si falta algo, devuelve lo que entendió y la lista `faltantes`.
 */
/** Producto que se usa para una deuda dicha sin detalle ("don Juan me debe 30"). */
export const PRODUCTO_DEUDA = "deuda";

/**
 * Parte una frase con varios registros: "Vendí 2 kilos de papa a 9 pesos y
 * don Juan me debe 30" → ["Vendí 2 kilos de papa a 9 pesos", "don Juan me debe 30"].
 * Solo corta en " y " cuando lo que sigue trae su propio verbo (vendí, compré,
 * me debe, se llevó…), para no partir "cuarenta y cinco" ni "kilo y medio".
 */
export function dividirFrase(texto: string): string[] {
  const partes = texto.split(/\s+y\s+/i);
  if (partes.length === 1) return [texto.trim()];
  const conVerbo = (t: string) => {
    const n = normalizar(t).split(/[^\p{L}\d]+/u);
    return n.some((p) => MARCAS_VENTA.has(p) || MARCAS_COMPRA.has(p) || MARCAS_FIADO.has(p));
  };
  const frases: string[] = [partes[0]];
  for (const parte of partes.slice(1)) {
    if (conVerbo(parte) && conVerbo(frases[frases.length - 1])) frases.push(parte);
    else frases[frases.length - 1] += ` y ${parte}`;
  }
  return frases.map((f) => f.trim()).filter(Boolean);
}

export function parsearFrase(
  texto: string,
  vocabulario: Vocabulario = vocabularioPorDefecto,
): ResultadoParseo {
  const idx = indexar(vocabulario);
  const tokens = tokenizar(texto);
  const n = tokens.map((t) => t.norm);

  const resultado: ResultadoParseo = { faltantes: [] };
  const usados = new Set<number>();

  resultado.tipo = detectarTipo(n);
  resultado.pago = detectarPago(n);

  let precioUnitario: number | undefined;
  let finCantidad = -1; // donde termina "veinte kilos", para buscar el producto

  // --- Números: cantidad, unidad y total --------------------------------
  for (let i = 0; i < n.length; i++) {
    if (usados.has(i)) continue;
    // El "medio" de "kilo y medio" no es un número aparte.
    if (n[i - 1] === "y" && (n[i] === "medio" || n[i] === "media")) continue;
    const num = leerNumero(n, i);
    if (!num) continue;

    let j = num.fin;
    for (let k = i; k < j; k++) usados.add(k);
    const anterior = n[i - 1];

    // ¿"veinte kilos", "un cuarto de kilo"?
    let unidad: string | undefined;
    if (idx.unidades.has(n[j] ?? "")) {
      unidad = idx.unidades.get(n[j]);
      usados.add(j);
      j++;
    } else if (n[j] === "de" && idx.unidades.has(n[j + 1] ?? "")) {
      unidad = idx.unidades.get(n[j + 1]);
      usados.add(j).add(j + 1);
      j += 2;
    }

    if (unidad && resultado.cantidad === undefined) {
      let cantidad = num.valor;
      const yMedio = leerYMedio(n, j); // "dos kilos y medio"
      if (yMedio) {
        cantidad += 0.5;
        usados.add(j).add(j + 1);
        j += yMedio;
      }
      resultado.cantidad = cantidad;
      resultado.unidad = unidad;
      finCantidad = j;
      i = j - 1;
      continue;
    }

    const esTotal =
      MONEDA.has(n[j] ?? "") ||
      MONEDA.has(anterior ?? "") ||
      ANTES_DE_TOTAL.has(anterior ?? "") ||
      resultado.cantidad !== undefined;

    if (esTotal && resultado.total === undefined && precioUnitario === undefined) {
      if (MONEDA.has(n[j] ?? "")) {
        usados.add(j);
        j++;
      }
      const largo = largoPrecioUnitario(n, j, idx);
      if (largo) {
        precioUnitario = num.valor;
        const posibleUnidad = idx.unidades.get(n[j + 1] ?? "");
        if (posibleUnidad && resultado.unidad === undefined) resultado.unidad = posibleUnidad;
        for (let k = j; k < j + largo; k++) usados.add(k);
        j += largo;
      } else {
        resultado.total = num.valor;
      }
      i = j - 1;
      continue;
    }

    if (resultado.cantidad === undefined) {
      // "un pollo entero", "5 limones": cantidad sin unidad explícita
      resultado.cantidad = num.valor;
      finCantidad = j;
      i = j - 1;
    }
  }

  // --- Unidad sin número: "kilo de tomate", "kilo y medio de papa" --------
  if (resultado.unidad === undefined || resultado.cantidad === undefined) {
    for (let i = 0; i < n.length; i++) {
      if (usados.has(i) || !idx.unidades.has(n[i])) continue;
      resultado.unidad ??= idx.unidades.get(n[i]);
      if (resultado.cantidad === undefined) {
        resultado.cantidad = 1 + (leerYMedio(n, i + 1) ? 0.5 : 0);
      }
      usados.add(i);
      finCantidad = i + 1 + leerYMedio(n, i + 1);
      break;
    }
  }

  if (resultado.cantidad !== undefined && resultado.unidad === undefined) {
    resultado.unidad = "unidad";
  }

  if (precioUnitario !== undefined && resultado.cantidad !== undefined) {
    resultado.total = redondear(precioUnitario * resultado.cantidad);
  }

  // --- Producto ---------------------------------------------------------
  for (let i = 0; i < n.length; i++) {
    if (usados.has(i)) continue;
    const p = productoEn(n, i, idx);
    if (p) {
      resultado.producto = p.nombre;
      break;
    }
  }

  // Producto que no está en el vocabulario: lo que viene después de la cantidad.
  if (resultado.producto === undefined && finCantidad >= 0) {
    let i = finCantidad;
    if (n[i] === "de") i++;
    const palabras: string[] = [];
    while (
      i < n.length &&
      palabras.length < 3 &&
      !RESERVADAS.has(n[i]) &&
      !esPalabraNumero(n[i]) &&
      !(n[i] in TITULOS)
    ) {
      palabras.push(tokens[i].orig.toLowerCase());
      i++;
    }
    if (palabras.length) resultado.producto = palabras.join(" ");
  }

  // --- Cliente ----------------------------------------------------------
  const cliente = detectarCliente(tokens, idx);
  if (cliente) resultado.cliente = cliente;

  if (resultado.producto) {
    resultado.categoria = resolverCategoria(resultado.producto).categoria;
  }

  // --- Deuda sin detalle: "don Juan me debe 30" ----------------------------
  // Hay cliente y monto pero ningún producto ni cantidad: se apunta como deuda.
  if (
    resultado.tipo === "fiado" &&
    resultado.total !== undefined &&
    resultado.producto === undefined &&
    resultado.cantidad === undefined
  ) {
    resultado.producto = PRODUCTO_DEUDA;
    resultado.cantidad = 1;
    resultado.unidad = "unidad";
    resultado.soloDeuda = true;
  }

  // --- Faltantes --------------------------------------------------------
  const requeridos: NombreCampo[] = ["tipo", "producto", "cantidad", "unidad", "total"];
  for (const campo of requeridos) {
    if (resultado[campo] === undefined) resultado.faltantes.push(campo);
  }
  if (resultado.tipo === "fiado" && !resultado.cliente) {
    resultado.faltantes.push("cliente");
  }

  return resultado;
}
