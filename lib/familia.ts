/**
 * Rol Familia: puestos con precios por unidad, buscador, bolsita, reservas
 * y estrellas. Las reservas al puesto de la caserita de la app ("propio")
 * le aparecen en "Reservas de hoy"; al entregarlas se registra la VENTA.
 */
import type { Movimiento } from "@/types/movimiento";
import type { Calificacion, PagoReserva, PrecioPuesto, Publicado, Puesto, Reserva } from "@/types/roles";
import { esVenta, precioVentaPorUnidad, type OpcionesCalculo } from "@/lib/calculos";
import { normalizar } from "@/lib/parser";
import { agregarMovimiento } from "@/lib/storage";
import { CLAVES, crearAlmacen, generarId } from "@/lib/almacen";
import {
  ESTRELLAS_EJEMPLO,
  MERCADO_EJEMPLO,
  NOMBRE_CASERITA,
  PRECIOS_SUPERMERCADO_ESTIMADOS,
  PUESTOS_EJEMPLO,
} from "@/lib/ejemplos";

export const PUESTO_PROPIO = "propio";

export const almacenReservas = crearAlmacen<Reserva>(CLAVES.reservas);
export const almacenPublicados = crearAlmacen<Publicado>(CLAVES.publicados);
export const almacenCalificaciones = crearAlmacen<Calificacion>(CLAVES.calificaciones);

const redondear = (x: number) => Math.round(x * 100) / 100;
const mismo = (a: string, b: string) => normalizar(a).trim() === normalizar(b).trim();

// ---------------------------------------------------------------------------
// Publicar precios (lado caserita)
// ---------------------------------------------------------------------------

export interface ProductoPublicable extends PrecioPuesto {
  publicado: boolean;
}

/**
 * Productos que la caserita puede publicar: los que vendió (con el precio
 * por unidad de su última venta) más los que ya publicó.
 */
export function productosPublicables(movimientos: Movimiento[], publicados: Publicado[], op: OpcionesCalculo = {}): ProductoPublicable[] {
  const lista: ProductoPublicable[] = publicados.map((p) => ({ ...p, publicado: true }));
  const vistos = new Set(lista.map((p) => normalizar(p.producto)));
  for (const m of movimientos) {
    if (!esVenta(m) || vistos.has(normalizar(m.producto))) continue;
    vistos.add(normalizar(m.producto));
    const precio = precioVentaPorUnidad(m.producto, { ...op, movimientos });
    if (precio) lista.push({ producto: m.producto, unidad: precio.unidad, precio: precio.valor, publicado: false });
  }
  return lista.sort((a, b) => a.producto.localeCompare(b.producto, "es"));
}

/** Interruptor "Publicar precio". */
export function cambiarPublicado(producto: PrecioPuesto, publicar: boolean): void {
  const sin = almacenPublicados.leer().filter((p) => !mismo(p.producto, producto.producto));
  almacenPublicados.guardar(publicar ? [...sin, { producto: producto.producto, unidad: producto.unidad, precio: producto.precio }] : sin);
}

// ---------------------------------------------------------------------------
// Puestos, estrellas y buscador
// ---------------------------------------------------------------------------

export function puestos(publicados: Publicado[], nombreCaserita: string = NOMBRE_CASERITA): Puesto[] {
  const propio: Puesto = {
    id: PUESTO_PROPIO,
    nombre: nombreCaserita,
    mercado: MERCADO_EJEMPLO,
    productos: publicados,
    ejemplo: false,
  };
  return [propio, ...PUESTOS_EJEMPLO];
}

export interface Estrellas {
  promedio: number;
  cantidad: number;
}

/** Promedio de estrellas de un puesto (null si nadie lo calificó todavía). */
export function promedioEstrellas(puestoId: string, calificaciones: Calificacion[]): Estrellas | null {
  if (puestoId !== PUESTO_PROPIO && ESTRELLAS_EJEMPLO[puestoId]) return ESTRELLAS_EJEMPLO[puestoId];
  const suyas = calificaciones.filter((c) => c.puestoId === puestoId);
  if (suyas.length === 0) return null;
  const promedio = suyas.reduce((s, c) => s + c.estrellas, 0) / suyas.length;
  return { promedio: Math.round(promedio * 10) / 10, cantidad: suyas.length };
}

export interface Resultado {
  puesto: Puesto;
  precio: PrecioPuesto;
  estrellas: Estrellas | null;
}

/** Busca un producto en todos los puestos, del más barato al más caro. */
export function buscarProducto(texto: string, lista: Puesto[], calificaciones: Calificacion[]): Resultado[] {
  const buscado = normalizar(texto).trim();
  if (!buscado) return [];
  const resultados: Resultado[] = [];
  for (const puesto of lista) {
    for (const precio of puesto.productos) {
      if (normalizar(precio.producto).includes(buscado)) {
        resultados.push({ puesto, precio, estrellas: promedioEstrellas(puesto.id, calificaciones) });
      }
    }
  }
  return resultados.sort((a, b) => a.precio.precio - b.precio.precio);
}

// ---------------------------------------------------------------------------
// Bolsita y ahorro
// ---------------------------------------------------------------------------

export interface ItemBolsita {
  producto: string;
  unidad: string;
  precio: number;
  cantidad: number;
}

export function totalBolsita(items: ItemBolsita[]): number {
  return redondear(items.reduce((s, i) => s + i.precio * i.cantidad, 0));
}

/**
 * Ahorro frente a precios de supermercado ESTIMADOS (de ejemplo).
 * Solo cuenta los productos que tienen precio estimado en la misma unidad.
 */
export function ahorroEstimado(items: ItemBolsita[]): { supermercado: number; ahorro: number; porcentaje: number } {
  let supermercado = 0;
  let puesto = 0;
  for (const i of items) {
    const ref = PRECIOS_SUPERMERCADO_ESTIMADOS[normalizar(i.producto)];
    if (!ref || !mismo(ref.unidad, i.unidad)) continue;
    supermercado += ref.precio * i.cantidad;
    puesto += i.precio * i.cantidad;
  }
  const ahorro = redondear(Math.max(0, supermercado - puesto));
  return {
    supermercado: redondear(supermercado),
    ahorro,
    porcentaje: supermercado > 0 ? Math.round((ahorro / supermercado) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

export function reservar(datos: {
  puestoId: string;
  familia: string;
  items: ItemBolsita[];
  pago: PagoReserva;
  ahora?: Date;
}): Reserva {
  const items = datos.items
    .filter((i) => i.cantidad > 0)
    .map((i) => ({ producto: i.producto, cantidad: i.cantidad, unidad: i.unidad, precio: i.precio, total: redondear(i.precio * i.cantidad) }));
  const reserva: Reserva = {
    id: generarId(),
    fecha: (datos.ahora ?? new Date()).toISOString(),
    puestoId: datos.puestoId,
    familia: datos.familia.trim() || "Familia",
    items,
    total: redondear(items.reduce((s, i) => s + i.total, 0)),
    pago: datos.pago,
    estado: "reservada",
  };
  almacenReservas.guardar([reserva, ...almacenReservas.leer()]);
  return reserva;
}

/**
 * "Entregado": registra la VENTA de cada producto de la reserva. Si la
 * familia eligió fiado, se registra como fiado a su nombre (sale en "Me deben").
 */
export function entregarReserva(id: string, ahora: Date = new Date()): Movimiento[] {
  const lista = almacenReservas.leer();
  const i = lista.findIndex((r) => r.id === id);
  if (i === -1 || lista[i].estado !== "reservada") return [];
  const r = lista[i];
  const ventas = r.items.map((item) =>
    agregarMovimiento({
      tipo: r.pago === "fiado" ? "fiado" : "venta",
      producto: item.producto,
      cantidad: item.cantidad,
      unidad: item.unidad,
      total: item.total,
      pago: r.pago === "qr" ? "qr" : "efectivo",
      cliente: r.familia,
      fecha: ahora.toISOString(),
    }),
  );
  lista[i] = { ...r, estado: "entregada" };
  almacenReservas.guardar(lista);
  return ventas;
}

/** La familia califica su compra (1 a 5 estrellas). */
export function calificar(reservaId: string, estrellas: number, ahora: Date = new Date()): Calificacion | null {
  const valor = Math.min(5, Math.max(1, Math.round(estrellas)));
  const lista = almacenReservas.leer();
  const i = lista.findIndex((r) => r.id === reservaId);
  if (i === -1) return null;
  lista[i] = { ...lista[i], calificacion: valor };
  almacenReservas.guardar(lista);
  const nueva: Calificacion = {
    id: generarId(),
    fecha: ahora.toISOString(),
    puestoId: lista[i].puestoId,
    estrellas: valor,
    familia: lista[i].familia,
  };
  // Una calificación por reserva: si ya había, se reemplaza.
  const otras = almacenCalificaciones.leer().filter((c) => c.id !== `reserva-${reservaId}`);
  almacenCalificaciones.guardar([...otras, { ...nueva, id: `reserva-${reservaId}` }]);
  return nueva;
}

/** Reservas de hoy al puesto de la caserita de la app. */
export function reservasDeHoy(reservas: Reserva[], ahora: Date): Reserva[] {
  const hoy = ahora.toDateString();
  return reservas
    .filter((r) => r.puestoId === PUESTO_PROPIO && new Date(r.fecha).toDateString() === hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
