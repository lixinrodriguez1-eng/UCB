import { CATALOGO, CATEGORIAS, CATEGORIA_OTROS, categoriaPorId, etiquetaCategoria, type ProductoCatalogo } from "@/data/catalogo";
export { CATALOGO };

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export { CATEGORIAS, CATEGORIA_OTROS, categoriaPorId, etiquetaCategoria };
export type { ProductoCatalogo };

export interface ProductoPropio {
  nombre: string;
  categoria: string;
  usos: number;
  ultimoUso: string;
}

const CLAVE_MIS_PRODUCTOS = "mis productos";
const EVENTO_MIS_PRODUCTOS = "caserita:mis-productos";

let ultimoCrudoMis: string | null | undefined;
let ultimosMis: ProductoPropio[] = [];

function hayStorage(): boolean {
  try { return typeof window !== "undefined" && !!window.localStorage; } catch { return false; }
}

function normalizarProducto(nombre: string): string {
  return normalizar(nombre).replace(/\s+/g, " ").trim();
}

function singularBasico(p: string): string {
  if (p.endsWith("ces")) return p.slice(0, -3) + "z";
  if (p.endsWith("es") && p.length > 4) return p.slice(0, -2);
  if (p.endsWith("s") && p.length > 3) return p.slice(0, -1);
  return p;
}

function claveProducto(nombre: string): string {
  return normalizarProducto(nombre)
    .split(" ")
    .filter(Boolean)
    .map(singularBasico)
    .join(" ");
}

function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = temp;
    }
  }
  return dp[a.length];
}

function casiIgual(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return Math.abs(a.length - b.length) <= 3;
  const d = distanciaLevenshtein(a, b);
  const max = Math.max(a.length, b.length);
  return max <= 5 ? d <= 1 : d <= 2;
}

interface EntradaIndice {
  nombre: string;
  categoria: string;
  clave: string;
}

const INDICE: EntradaIndice[] = [];
for (const p of CATALOGO) {
  const formas = [p.nombre, ...(p.sinonimos ?? [])];
  for (const forma of formas) {
    INDICE.push({ nombre: p.nombre, categoria: p.categoria, clave: claveProducto(forma) });
  }
}

const CLAVES_CATALOGO = new Map<string, EntradaIndice>();
for (const e of INDICE) if (!CLAVES_CATALOGO.has(e.clave)) CLAVES_CATALOGO.set(e.clave, e);

export function obtenerMisProductos(): ProductoPropio[] {
  if (!hayStorage()) return ultimosMis;
  try {
    const crudo = window.localStorage.getItem(CLAVE_MIS_PRODUCTOS);
    if (crudo !== ultimoCrudoMis) {
      ultimoCrudoMis = crudo;
      const datos: unknown = crudo ? JSON.parse(crudo) : [];
      ultimosMis = Array.isArray(datos)
        ? (datos as ProductoPropio[]).filter((p) => p && typeof p.nombre === "string" && typeof p.categoria === "string")
        : [];
    }
  } catch { /* conserva */ }
  return ultimosMis;
}

function guardarMisProductos(productos: ProductoPropio[]): void {
  ultimosMis = productos;
  ultimoCrudoMis = JSON.stringify(productos);
  if (!hayStorage()) return;
  try { window.localStorage.setItem(CLAVE_MIS_PRODUCTOS, ultimoCrudoMis); } catch { return; }
  window.dispatchEvent(new Event(EVENTO_MIS_PRODUCTOS));
}

export function suscribirMisProductos(alCambiar: () => void): () => void {
  if (!hayStorage()) return () => {};
  const alStorage = (e: StorageEvent) => { if (e.key === null || e.key === CLAVE_MIS_PRODUCTOS) alCambiar(); };
  window.addEventListener(EVENTO_MIS_PRODUCTOS, alCambiar);
  window.addEventListener("storage", alStorage);
  return () => {
    window.removeEventListener(EVENTO_MIS_PRODUCTOS, alCambiar);
    window.removeEventListener("storage", alStorage);
  };
}

function categoriaPorKeywords(clave: string): string | undefined {
  if (/\bqueso\b/.test(clave)) return "lacteos";
  if (/\b(carne|costilla|pecho|res|cerdo|chancho|pollo|chorizo|charque|menudo|pescado)\b/.test(clave)) return "carnes";
  if (/\b(aceite|fideo|harina|arroz|azucar|sal|atun|galleta|gaseosa)\b/.test(clave)) return "abarrotes";
  if (/\b(detergente|jabon|lavandina|shampoo|escoba|esponja)\b/.test(clave)) return "limpieza";
  return undefined;
}

export function resolverCategoria(nombre: string): { categoria: string; fuente: "catalogo" | "mis-productos" | "keyword" | "fuzzy" | "otros" } {
  const clave = claveProducto(nombre);
  if (!clave) return { categoria: CATEGORIA_OTROS, fuente: "otros" };

  const propio = obtenerMisProductos().find((p) => claveProducto(p.nombre) === clave);
  if (propio) return { categoria: propio.categoria, fuente: "mis-productos" };

  const exacta = CLAVES_CATALOGO.get(clave);
  if (exacta) return { categoria: exacta.categoria, fuente: "catalogo" };

  const keyword = categoriaPorKeywords(clave);
  if (keyword) return { categoria: keyword, fuente: "keyword" };

  // fuzzy: comparar contra catálogo y mis productos
  let mejor: { categoria: string; dist: number } | null = null;
  for (const e of INDICE) {
    if (!casiIgual(clave, e.clave)) continue;
    const dist = distanciaLevenshtein(clave, e.clave);
    if (!mejor || dist < mejor.dist) mejor = { categoria: e.categoria, dist };
  }
  for (const p of obtenerMisProductos()) {
    const c = claveProducto(p.nombre);
    if (!casiIgual(clave, c)) continue;
    const dist = distanciaLevenshtein(clave, c);
    if (!mejor || dist < mejor.dist) mejor = { categoria: p.categoria, dist };
  }
  if (mejor) return { categoria: mejor.categoria, fuente: "fuzzy" };

  return { categoria: CATEGORIA_OTROS, fuente: "otros" };
}

export function recordarProducto(nombre: string, categoria: string): void {
  const clave = claveProducto(nombre);
  if (!clave) return;
  const actuales = obtenerMisProductos();
  const idx = actuales.findIndex((p) => claveProducto(p.nombre) === clave);
  const ahora = new Date().toISOString();
  if (idx >= 0) {
    const prev = actuales[idx];
    const actualizado = { ...prev, nombre: prev.nombre || nombre, categoria, usos: prev.usos + 1, ultimoUso: ahora };
    const copia = [...actuales];
    copia[idx] = actualizado;
    guardarMisProductos(copia);
  } else {
    guardarMisProductos([{ nombre: nombre.trim(), categoria, usos: 1, ultimoUso: ahora }, ...actuales]);
  }
}

export function establecerCategoriaProducto(nombre: string, categoria: string): void {
  const clave = claveProducto(nombre);
  if (!clave) return;
  const actuales = obtenerMisProductos();
  const idx = actuales.findIndex((p) => claveProducto(p.nombre) === clave);
  const ahora = new Date().toISOString();
  if (idx >= 0) {
    const copia = [...actuales];
    copia[idx] = { ...copia[idx], categoria, ultimoUso: ahora };
    guardarMisProductos(copia);
  } else {
    guardarMisProductos([{ nombre: nombre.trim(), categoria, usos: 1, ultimoUso: ahora }, ...actuales]);
  }
}

export function productosPorCategoria(categoria: string): string[] {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  for (const p of CATALOGO) {
    if (p.categoria !== categoria) continue;
    const k = claveProducto(p.nombre);
    if (vistos.has(k)) continue;
    vistos.add(k);
    nombres.push(p.nombre);
  }
  for (const p of obtenerMisProductos()) {
    if (p.categoria !== categoria) continue;
    const k = claveProducto(p.nombre);
    if (vistos.has(k)) continue;
    vistos.add(k);
    nombres.push(p.nombre);
  }
  return nombres;
}

export function productosMasUsados(movimientos: { producto: string }[], limite = 6): string[] {
  const conteo = new Map<string, { nombre: string; n: number }>();
  for (const m of movimientos) {
    const k = claveProducto(m.producto);
    if (!k) continue;
    const prev = conteo.get(k);
    if (prev) prev.n += 1;
    else conteo.set(k, { nombre: m.producto, n: 1 });
  }
  return [...conteo.values()].sort((a, b) => b.n - a.n).slice(0, limite).map((x) => x.nombre);
}

// ---------------------------------------------------------------------------
// Fotos de productos (Pexels, dentro del proyecto: funcionan sin internet)
// ---------------------------------------------------------------------------

export interface FotoProducto {
  src: string;
  /** true si es la foto de la categoría (el producto no tiene una propia). */
  deCategoria: boolean;
}

/** Foto de la categoría, si se descargó. */
export function imagenCategoria(categoria: string): string | undefined {
  return categoriaPorId(categoria).imagen;
}

/**
 * Foto para mostrar un producto: la suya si está en el catálogo; si no (por
 * ejemplo, un producto nuevo dicho por voz), la de su categoría.
 */
const POR_NOMBRE = new Map(CATALOGO.map((p) => [p.nombre, p]));

export function imagenProducto(nombre: string): FotoProducto | null {
  const entrada = CLAVES_CATALOGO.get(claveProducto(nombre));
  const delCatalogo = entrada ? POR_NOMBRE.get(entrada.nombre) : undefined;
  if (delCatalogo?.imagen) {
    return { src: delCatalogo.imagen, deCategoria: delCatalogo.imagen.includes("/categoria-") };
  }
  const categoria = delCatalogo?.categoria ?? resolverCategoria(nombre).categoria;
  const src = imagenCategoria(categoria);
  return src ? { src, deCategoria: true } : null;
}
