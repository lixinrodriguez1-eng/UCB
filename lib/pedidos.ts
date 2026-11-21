/**
 * Pedidos de la caserita a los productores:
 * "Para mañana necesito un quintal de papa y dos cajas de tomate".
 */
import type { Movimiento } from "@/types/movimiento";
import type { ItemPedido, OfertaProductor, Pedido, Productor } from "@/types/roles";
import type { DatosMercado } from "@/types/datosMercado";
import { convertir, precioVentaPorUnidad, unidadBase, type OpcionesCalculo } from "@/lib/calculos";
import { datosMercadoPorDefecto } from "@/lib/datosMercado";
import { normalizar, parsearFrase } from "@/lib/parser";
import { agregarMovimiento } from "@/lib/storage";
import { CLAVES, crearAlmacen, generarId } from "@/lib/almacen";
import { MERCADO_EJEMPLO, NOMBRE_CASERITA, PRODUCTORES_EJEMPLO, pedidosSimulados, productorPorId } from "@/lib/ejemplos";

export const almacenPedidos = crearAlmacen<Pedido>(CLAVES.pedidos);

const redondear = (x: number) => Math.round(x * 100) / 100;
const mismo = (a: string, b: string) => normalizar(a).trim() === normalizar(b).trim();

// ---------------------------------------------------------------------------
// Entender el pedido
// ---------------------------------------------------------------------------

export interface ItemPedidoDicho {
  producto: string;
  cantidad: number;
  unidad: string;
}

const FRASES_PEDIDO = [
  "necesito", "necesitamos", "quiero comprar", "quisiera comprar", "quiero pedir", "quiero encargar",
  "pedir", "encargar", "hacer un pedido", "hacer pedido", "pedido de",
];
/** Si la frase cuenta algo que ya pasó, es un registro y no un pedido. */
const YA_PASO = ["compre", "vendi", "fie", "me debe", "se llevo", "pague", "traje"];

/**
 * ¿Es un pedido a productores? Devuelve lo que pide, o null.
 * "Quiero comprar 1 quintal de papa al mejor precio" → [{ papa, 1, quintal }].
 */
export function detectarPedido(texto: string): ItemPedidoDicho[] | null {
  const t = ` ${normalizar(texto).replace(/[^\p{L}\d\s,]/gu, " ").replace(/\s+/g, " ")} `;
  if (!FRASES_PEDIDO.some((f) => t.includes(` ${f} `))) return null;
  if (YA_PASO.some((f) => t.includes(` ${f} `))) return null;

  // Cada producto va separado por "y" o coma: "un quintal de papa y dos cajas de tomate".
  const partes = texto.split(/\s*,\s*|\s+y\s+/i);
  const items: ItemPedidoDicho[] = [];
  for (const parte of partes) {
    const r = parsearFrase(parte);
    if (r.producto && r.cantidad !== undefined && r.unidad) {
      items.push({ producto: r.producto, cantidad: r.cantidad, unidad: r.unidad });
    }
  }
  return items.length ? items : null;
}

// ---------------------------------------------------------------------------
// Comparar productores
// ---------------------------------------------------------------------------

export interface PrecioDeVenta {
  /** Bs por `unidad` (unidad base: kilo o unidad). */
  valor: number;
  unidad: string;
  fuente: "tus ventas" | "precio del mercado";
}

export interface OfertaComparada {
  productor: Productor;
  oferta: OfertaProductor;
  /** Cantidad pedida, en la unidad del productor. */
  cantidad: number;
  /** Lo que cuesta lo pedido con este productor. */
  costo: number;
  /** Lo que ganaría vendiendo todo al precio de venta (null si no se sabe). */
  teDeja: number | null;
  precioVenta: PrecioDeVenta | null;
}

/**
 * Pasa una cantidad de `de` a `a`. Si no hay conversión fija, usa la
 * equivalencia de la oferta del productor (ej. 1 caja ≈ 20 kilo).
 */
function convertirConEquivale(
  cantidad: number,
  de: string,
  a: string,
  oferta: Pick<OfertaProductor, "unidad" | "equivale">,
  datos: DatosMercado,
): number | null {
  const directo = convertir(cantidad, de, a, datos);
  if (directo !== null) return directo;
  const eq = oferta.equivale;
  if (!eq) return null;
  // De la unidad del productor a otra: 2 cajas → 40 kilo → a
  if (mismo(de, oferta.unidad)) return convertir(cantidad * eq.cantidad, eq.unidad, a, datos);
  // De otra unidad a la del productor: 40 kilo → 2 cajas
  if (mismo(a, oferta.unidad)) {
    const enEq = convertir(cantidad, de, eq.unidad, datos);
    return enEq === null ? null : enEq / eq.cantidad;
  }
  return null;
}

/** Precio al que la caserita vende el producto: sus ventas o, si no hay, el del mercado (JSON). */
export function precioDeVenta(producto: string, op: OpcionesCalculo = {}): PrecioDeVenta | null {
  const datos = op.datos ?? datosMercadoPorDefecto;
  const propio = precioVentaPorUnidad(producto, op);
  if (propio) return { valor: propio.valor, unidad: propio.unidad, fuente: "tus ventas" };
  const ref = datos.preciosReferencia.find((r) => mismo(r.producto, producto));
  if (!ref) return null;
  const base = unidadBase(ref.unidad, datos);
  const porBase = convertir(1, base, ref.unidad, datos);
  if (porBase === null) return null;
  return { valor: redondear(ref.precio * porBase), unidad: base, fuente: "precio del mercado" };
}

/**
 * Productores que tienen el producto, del más barato al más caro, con lo que
 * le deja a la caserita según su precio de venta.
 */
export function compararOfertas(
  item: ItemPedidoDicho,
  op: OpcionesCalculo & { productores?: Productor[] } = {},
): OfertaComparada[] {
  const datos = op.datos ?? datosMercadoPorDefecto;
  const productores = op.productores ?? PRODUCTORES_EJEMPLO;
  const venta = precioDeVenta(item.producto, op);
  const lista: OfertaComparada[] = [];

  for (const productor of productores) {
    const oferta = productor.productos.find((p) => mismo(p.producto, item.producto));
    if (!oferta) continue;
    const cantidad = convertirConEquivale(item.cantidad, item.unidad, oferta.unidad, oferta, datos);
    if (cantidad === null) continue;
    const costo = redondear(oferta.precio * cantidad);

    let teDeja: number | null = null;
    if (venta) {
      const enVenta = convertirConEquivale(cantidad, oferta.unidad, venta.unidad, oferta, datos);
      if (enVenta !== null) teDeja = redondear(venta.valor * enVenta - costo);
    }
    lista.push({ productor, oferta, cantidad: redondear(cantidad), costo, teDeja, precioVenta: venta });
  }
  return lista.sort((a, b) => a.costo - b.costo);
}

// ---------------------------------------------------------------------------
// Crear, recibir y pagar pedidos
// ---------------------------------------------------------------------------

export interface Eleccion {
  productorId: string;
  item: ItemPedidoDicho;
}

/** Crea un pedido "pendiente" por productor elegido. */
export function crearPedidos(
  elecciones: Eleccion[],
  op: { caserita?: string; mercado?: string; ahora?: Date; datos?: DatosMercado } = {},
): Pedido[] {
  const datos = op.datos ?? datosMercadoPorDefecto;
  const porProductor = new Map<string, ItemPedido[]>();
  for (const { productorId, item } of elecciones) {
    const productor = productorPorId(productorId);
    const oferta = productor?.productos.find((p) => mismo(p.producto, item.producto));
    if (!productor || !oferta) continue;
    const cantidad = convertirConEquivale(item.cantidad, item.unidad, oferta.unidad, oferta, datos);
    if (cantidad === null) continue;
    const lista = porProductor.get(productorId) ?? [];
    lista.push({
      producto: oferta.producto,
      cantidad: redondear(cantidad),
      unidad: oferta.unidad,
      precio: oferta.precio,
      total: redondear(oferta.precio * cantidad),
      ...(oferta.equivale ? { equivale: oferta.equivale } : {}),
    });
    porProductor.set(productorId, lista);
  }

  const fecha = (op.ahora ?? new Date()).toISOString();
  const nuevos: Pedido[] = [...porProductor.entries()].map(([productorId, items]) => ({
    id: generarId(),
    fecha,
    productorId,
    caserita: op.caserita ?? NOMBRE_CASERITA,
    mercado: op.mercado ?? MERCADO_EJEMPLO,
    items,
    total: redondear(items.reduce((s, i) => s + i.total, 0)),
    estado: "pendiente",
  }));
  almacenPedidos.guardar([...nuevos, ...almacenPedidos.leer()]);
  return nuevos;
}

function cambiarEstado(id: string, estado: Pedido["estado"]): Pedido | undefined {
  const lista = almacenPedidos.leer();
  const i = lista.findIndex((p) => p.id === id);
  if (i === -1) return undefined;
  lista[i] = { ...lista[i], estado };
  almacenPedidos.guardar(lista);
  return lista[i];
}

/**
 * "Recibí la mercadería": registra la COMPRA de cada producto con el costo
 * del pedido (así la ganancia y la alerta de margen usan el costo real).
 * Si la unidad no tiene equivalencia fija (caja), se registra en kilos.
 */
export function recibirPedido(id: string, ahora: Date = new Date()): Movimiento[] {
  const pedido = almacenPedidos.leer().find((p) => p.id === id);
  if (!pedido || pedido.estado !== "pendiente") return [];
  const productor = productorPorId(pedido.productorId);
  const registradas = pedido.items.map((item) => {
    // "caja" no tiene medida fija: se registra en kilos con la equivalencia del pedido.
    const sinMedidaFija = item.equivale && convertir(1, item.unidad, item.equivale.unidad) === null;
    const cantidad = sinMedidaFija ? item.cantidad * item.equivale!.cantidad : item.cantidad;
    const unidad = sinMedidaFija ? item.equivale!.unidad : item.unidad;
    return agregarMovimiento({
      tipo: "compra",
      producto: item.producto,
      cantidad: redondear(cantidad),
      unidad,
      total: item.total,
      pago: "qr",
      cliente: productor?.nombre,
      fecha: ahora.toISOString(),
    });
  });
  cambiarEstado(id, "entregado");
  return registradas;
}

/** "Pagar por QR" (de ejemplo, sin pago real): el pedido queda cobrado. */
export function marcarCobrado(id: string): Pedido | undefined {
  return cambiarEstado(id, "cobrado");
}

// ---------------------------------------------------------------------------
// Pedido grupal del mercado
// ---------------------------------------------------------------------------

export interface PedidoGrupal {
  pedidos: Pedido[];
  totales: { producto: string; unidad: string; cantidad: number }[];
  total: number;
  /** Lo que el grupo se ahorra frente al mayorista de referencia. */
  ahorroGrupo: number;
}

export function pedidoGrupal(pedido: Pedido): PedidoGrupal {
  const pedidos = [pedido, ...pedidosSimulados(pedido)];
  const mayorista = PRODUCTORES_EJEMPLO.find((p) => p.tipo === "mayorista");
  const totales = new Map<string, { producto: string; unidad: string; cantidad: number }>();
  let ahorro = 0;
  for (const p of pedidos) {
    for (const item of p.items) {
      const clave = `${item.producto}|${item.unidad}`;
      const fila = totales.get(clave) ?? { producto: item.producto, unidad: item.unidad, cantidad: 0 };
      fila.cantidad = redondear(fila.cantidad + item.cantidad);
      totales.set(clave, fila);
      const ref = mayorista?.productos.find((o) => mismo(o.producto, item.producto) && mismo(o.unidad, item.unidad));
      if (ref && mayorista?.id !== p.productorId) ahorro += (ref.precio - item.precio) * item.cantidad;
    }
  }
  return {
    pedidos,
    totales: [...totales.values()],
    total: redondear(pedidos.reduce((s, p) => s + p.total, 0)),
    ahorroGrupo: redondear(Math.max(0, ahorro)),
  };
}
