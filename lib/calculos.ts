import type { Movimiento, Pago } from "@/types/movimiento";
import type { DatosMercado, PrecioReferencia } from "@/types/datosMercado";
import { datosMercadoPorDefecto } from "@/lib/datosMercado";
import { obtenerMovimientos, obtenerPagos } from "@/lib/storage";
import { normalizar, TITULOS } from "@/lib/parser";
import { formatearBs, formatearNumero } from "@/lib/formato";
import { categoriaPorId, resolverCategoria } from "@/lib/catalogo";

/**
 * Todas las funciones leen de localStorage por defecto, pero aceptan
 * `movimientos`, `ahora` y `datos` para poder probarlas sin navegador.
 */
export interface OpcionesCalculo {
  movimientos?: Movimiento[];
  /** Pagos de apuntados (por defecto, los guardados). */
  pagos?: Pago[];
  ahora?: Date;
  datos?: DatosMercado;
}

const DIA_MS = 24 * 60 * 60 * 1000;
/** Hasta 5% por encima del costo se considera margen bajo. */
export const MARGEN_MINIMO = 0.05;

const redondear = (x: number) => Math.round(x * 100) / 100;

function resolver(op: OpcionesCalculo = {}) {
  return {
    movimientos: op.movimientos ?? obtenerMovimientos(),
    pagos: op.pagos ?? obtenerPagos(),
    ahora: op.ahora ?? new Date(),
    datos: op.datos ?? datosMercadoPorDefecto,
  };
}

const mismoProducto = (a: string, b: string) => normalizar(a).trim() === normalizar(b).trim();
/** Ventas y fiados con producto. Una deuda dicha sin detalle no es venta. */
export const esVenta = (m: Movimiento) => (m.tipo === "venta" || m.tipo === "fiado") && !m.soloDeuda;

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

function conversionDe(unidad: string, datos: DatosMercado) {
  return (
    datos.conversiones.find((c) => mismoProducto(c.unidad, unidad)) ?? {
      unidad,
      base: unidad,
      factor: 1,
    }
  );
}

/** Unidad base de una unidad: arroba → kilo, docena → unidad, caja → caja. */
export function unidadBase(unidad: string, datos: DatosMercado = datosMercadoPorDefecto): string {
  return conversionDe(unidad, datos).base;
}

/** Convierte una cantidad entre unidades. null si no son compatibles (kilo ↔ caja). */
export function convertir(
  cantidad: number,
  de: string,
  a: string,
  datos: DatosMercado = datosMercadoPorDefecto,
): number | null {
  if (mismoProducto(de, a)) return cantidad;
  const origen = conversionDe(de, datos);
  const destino = conversionDe(a, datos);
  if (origen.base !== destino.base) return null;
  return (cantidad * origen.factor) / destino.factor;
}

// ---------------------------------------------------------------------------
// Costo y precio por unidad
// ---------------------------------------------------------------------------

export interface PrecioPorUnidad {
  /** Bs por `unidad`. */
  valor: number;
  unidad: string;
}

/**
 * Costo promedio ponderado por unidad, con las compras de los últimos 7 días
 * (hasta `ahora`). Todo se pasa a la unidad pedida o, si no se pide, a la
 * unidad base de la última compra (arroba → kilo).
 * Las compras en unidades que no se pueden convertir se ignoran.
 */
export function costoPromedioPorUnidad(
  producto: string,
  op: OpcionesCalculo & { unidad?: string } = {},
): PrecioPorUnidad | null {
  const { movimientos, ahora, datos } = resolver(op);
  const hasta = ahora.getTime();
  const desde = hasta - 7 * DIA_MS;

  const compras = movimientos
    .filter((m) => m.tipo === "compra" && mismoProducto(m.producto, producto))
    .filter((m) => {
      const t = new Date(m.fecha).getTime();
      return t > desde && t <= hasta;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (compras.length === 0) return null;
  const unidad = op.unidad ?? unidadBase(compras[0].unidad, datos);

  let totalBs = 0;
  let totalCantidad = 0;
  for (const c of compras) {
    const cantidad = convertir(c.cantidad, c.unidad, unidad, datos);
    if (cantidad === null || cantidad <= 0) continue;
    totalBs += c.total;
    totalCantidad += cantidad;
  }
  if (totalCantidad === 0) return null;
  return { valor: redondear(totalBs / totalCantidad), unidad };
}

/**
 * Precio por unidad de la última venta (o fiado) del producto, hasta `ahora`.
 * Se expresa en la unidad pedida o en la unidad base de esa venta.
 */
export function precioVentaPorUnidad(
  producto: string,
  op: OpcionesCalculo & { unidad?: string } = {},
): (PrecioPorUnidad & { fecha: string }) | null {
  const { movimientos, ahora, datos } = resolver(op);
  const ultima = movimientos
    .filter((m) => esVenta(m) && mismoProducto(m.producto, producto))
    .filter((m) => new Date(m.fecha).getTime() <= ahora.getTime())
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  if (!ultima) return null;

  const unidad = op.unidad ?? unidadBase(ultima.unidad, datos);
  const cantidad = convertir(ultima.cantidad, ultima.unidad, unidad, datos);
  if (cantidad === null || cantidad <= 0) return null;
  return { valor: redondear(ultima.total / cantidad), unidad, fecha: ultima.fecha };
}

// ---------------------------------------------------------------------------
// Ganancia
// ---------------------------------------------------------------------------

export interface Ganancia {
  /** Lo que entró por ventas y fiados (Bs). */
  ingresos: number;
  /** Lo que costó la mercadería vendida (Bs), según el costo promedio de esa fecha. */
  costo: number;
  /** ingresos − costo. */
  ganancia: number;
  /**
   * Productos vendidos sin compras en los 7 días anteriores: no se sabe su
   * costo y quedan fuera de ingresos, costo y ganancia.
   */
  productosSinCosto: string[];
}

interface VentaConCosto {
  producto: string;
  ingreso: number;
  /** null si no hay compras en los 7 días anteriores a la venta. */
  costo: number | null;
}

/** Ventas (y fiados) entre `desde` y `ahora`, cada una con su costo de esa fecha. */
function ventasConCosto(desde: Date, op: OpcionesCalculo): VentaConCosto[] {
  const { movimientos, ahora, datos } = resolver(op);
  return movimientos
    .filter((m) => {
      const t = new Date(m.fecha).getTime();
      return esVenta(m) && t >= desde.getTime() && t <= ahora.getTime();
    })
    .map((v) => {
      const c = costoPromedioPorUnidad(v.producto, { movimientos, datos, ahora: new Date(v.fecha) });
      const cantidad = c ? convertir(v.cantidad, v.unidad, c.unidad, datos) : null;
      return {
        producto: v.producto,
        ingreso: v.total,
        costo: c && cantidad !== null ? c.valor * cantidad : null,
      };
    });
}

function gananciaEntre(desde: Date, op: OpcionesCalculo): Ganancia {
  let ingresos = 0;
  let costo = 0;
  const sinCosto = new Set<string>();

  for (const v of ventasConCosto(desde, op)) {
    if (v.costo === null) {
      sinCosto.add(v.producto);
      continue;
    }
    ingresos += v.ingreso;
    costo += v.costo;
  }

  return {
    ingresos: redondear(ingresos),
    costo: redondear(costo),
    ganancia: redondear(ingresos - costo),
    productosSinCosto: [...sinCosto],
  };
}

/** Ganancia de las ventas hechas entre `desde` y `hasta` (incluidos). */
export function gananciaEntreFechas(desde: Date, hasta: Date, op: OpcionesCalculo = {}): Ganancia {
  return gananciaEntre(desde, { ...op, ahora: hasta });
}

function inicioDelDia(ahora: Date): Date {
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function inicioDeLaSemana(ahora: Date): Date {
  const diasDesdeLunes = (ahora.getDay() + 6) % 7;
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasDesdeLunes);
}

/** Ganancia desde las 00:00 de hoy (hora del celular). */
export function gananciaDelDia(op: OpcionesCalculo = {}): Ganancia {
  const ahora = op.ahora ?? new Date();
  return gananciaEntre(inicioDelDia(ahora), { ...op, ahora });
}

/** Ganancia desde el lunes de esta semana a las 00:00. */
export function gananciaDeLaSemana(op: OpcionesCalculo = {}): Ganancia {
  const ahora = op.ahora ?? new Date();
  return gananciaEntre(inicioDeLaSemana(ahora), { ...op, ahora });
}

export interface GananciaProducto {
  producto: string;
  ingresos: number;
  costo: number;
  ganancia: number;
}

/**
 * Ganancia de esta semana separada por producto, de la que más deja a la
 * que menos. Los productos sin costo conocido no aparecen.
 */
export function gananciaPorProducto(op: OpcionesCalculo = {}): GananciaProducto[] {
  const ahora = op.ahora ?? new Date();
  const porProducto = new Map<string, GananciaProducto>();

  for (const v of ventasConCosto(inicioDeLaSemana(ahora), { ...op, ahora })) {
    if (v.costo === null) continue;
    const clave = normalizar(v.producto).trim();
    const fila = porProducto.get(clave) ?? { producto: v.producto, ingresos: 0, costo: 0, ganancia: 0 };
    fila.ingresos += v.ingreso;
    fila.costo += v.costo;
    porProducto.set(clave, fila);
  }

  return [...porProducto.values()]
    .map((f) => ({
      producto: f.producto,
      ingresos: redondear(f.ingresos),
      costo: redondear(f.costo),
      ganancia: redondear(f.ingresos - f.costo),
    }))
    .sort((a, b) => b.ganancia - a.ganancia);
}

export interface VentaCategoria {
  categoria: string;
  nombre: string;
  icono: string;
  total: number;
}

/** Ventas (y fiados) de hoy agrupadas por categoría. */
export function ventasPorCategoria(op: OpcionesCalculo = {}): VentaCategoria[] {
  const { movimientos, ahora } = resolver(op);
  const desde = inicioDelDia(ahora).getTime();
  const porCategoria = new Map<string, number>();
  for (const m of movimientos) {
    const t = new Date(m.fecha).getTime();
    if (!esVenta(m) || t < desde || t > ahora.getTime()) continue;
    const cat = m.categoria ?? resolverCategoria(m.producto).categoria;
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + m.total);
  }
  return [...porCategoria.entries()]
    .map(([id, total]) => {
      const c = categoriaPorId(id);
      return { categoria: id, nombre: c.nombre, icono: c.icono, total: redondear(total) };
    })
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Fiados
// ---------------------------------------------------------------------------

export interface Deuda {
  cliente: string;
  /** Lo que todavía debe (apuntado − pagado). */
  total: number;
  /** Todo lo que se le apuntó. */
  apuntado: number;
  /** Todo lo que ya pagó. */
  pagado: number;
  /** Apuntes que siguen sin pagarse (del todo o en parte). */
  fiados: number;
  /** Productos de esos apuntes, sin repetir, en el orden en que se apuntaron. */
  productos: string[];
  /** Apuntes pendientes, del más reciente al más antiguo. */
  apuntes: Movimiento[];
}

/**
 * Nombre de cliente con la forma de la app: título en minúscula y nombre con
 * mayúscula. "Doña rosa" y "doña Rosa" → "doña Rosa".
 */
export function nombreCliente(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  // "la Rosa" → "Rosa": el artículo no es parte del nombre.
  while (palabras.length > 1 && ARTICULOS_NOMBRE.has(normalizar(palabras[0]))) palabras.shift();
  return palabras
    .map((p) => {
      if (TITULOS[normalizar(p)]) return TITULOS[normalizar(p)];
      // "ROSA" (dicho o escrito en mayúsculas) → "Rosa"; "McKay" se respeta.
      const base = p.length > 1 && p === p.toUpperCase() ? p.toLowerCase() : p;
      return base.charAt(0).toUpperCase() + base.slice(1);
    })
    .join(" ");
}

const ARTICULOS_NOMBRE = new Set(["la", "el", "los", "las"]);

/**
 * Clave para juntar a un cliente: sin tildes, mayúsculas, títulos ni artículos.
 * "doña Rosa", "la Rosa", "Rosa" y "DOÑA ROSA" → "rosa".
 * "Rosa Mamani" sigue siendo otra persona ("rosa mamani").
 */
export function claveCliente(nombre: string): string {
  const palabras = normalizar(nombre).trim().split(/\s+/).filter(Boolean);
  const nucleo = palabras.filter((p) => !(p in TITULOS) && !ARTICULOS_NOMBRE.has(p));
  return (nucleo.length ? nucleo : palabras).join(" ");
}

const tieneTitulo = (nombre: string) => normalizar(nombre).split(/\s+/).some((p) => p in TITULOS);

/**
 * Suma de los fiados por cliente, menos lo que ya pagó, del que más debe al
 * que menos. Quien ya no debe nada no aparece.
 */
export function deudas(op: OpcionesCalculo = {}): Deuda[] {
  const { movimientos, pagos, ahora } = resolver(op);
  const hasta = ahora.getTime();

  const porCliente = new Map<string, { cliente: string; apuntes: Movimiento[]; pagado: number }>();
  for (const m of [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha))) {
    if (m.tipo !== "fiado" || new Date(m.fecha).getTime() > hasta) continue;
    const nombre = m.cliente?.trim() ? nombreCliente(m.cliente) : "Sin nombre";
    const clave = claveCliente(nombre);
    const fila = porCliente.get(clave) ?? { cliente: nombre, apuntes: [], pagado: 0 };
    // Si a veces se dijo "Rosa" y a veces "doña Rosa", se muestra con el título.
    if (!tieneTitulo(fila.cliente) && tieneTitulo(nombre)) fila.cliente = nombre;
    fila.apuntes.push(m);
    porCliente.set(clave, fila);
  }
  for (const p of pagos) {
    if (new Date(p.fecha).getTime() > hasta) continue;
    const fila = porCliente.get(claveCliente(p.cliente));
    if (fila) fila.pagado += p.monto;
  }

  const lista: Deuda[] = [];
  for (const { cliente, apuntes, pagado } of porCliente.values()) {
    const apuntado = apuntes.reduce((s, m) => s + m.total, 0);
    const total = redondear(apuntado - pagado);
    if (total <= 0) continue; // ya pagó todo: sale de la lista

    // Los pagos cubren primero los apuntes más antiguos.
    let restante = pagado;
    const pendientes: Movimiento[] = [];
    for (const m of [...apuntes].reverse()) {
      if (restante >= m.total - 0.005) {
        restante -= m.total;
        continue;
      }
      restante = 0;
      pendientes.push(m);
    }
    pendientes.reverse();

    // Productos en el orden en que se apuntaron.
    const productos: string[] = [];
    for (const m of [...pendientes].reverse()) {
      if (!productos.some((p) => mismoProducto(p, m.producto))) productos.push(m.producto);
    }

    lista.push({
      cliente,
      total,
      apuntado: redondear(apuntado),
      pagado: redondear(pagado),
      fiados: pendientes.length,
      productos,
      apuntes: pendientes,
    });
  }

  return lista.sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Alerta de margen
// ---------------------------------------------------------------------------

export interface AlertaMargen {
  /** "perdida": vende por debajo del costo. "margen-bajo": gana 5% o menos. */
  nivel: "perdida" | "margen-bajo";
  producto: string;
  unidad: string;
  costo: number;
  precio: number;
  /** precio − costo por unidad: negativo = pierde, positivo = gana. */
  diferenciaPorUnidad: number;
  /** (precio − costo) / costo, ej. 0.03 = 3%. */
  margen: number;
  referencia?: PrecioReferencia;
  /** Texto listo para mostrar. */
  titulo: string;
  detalle: string;
}

function buscarReferencia(
  producto: string,
  unidad: string,
  datos: DatosMercado,
): PrecioReferencia | undefined {
  const ref = datos.preciosReferencia.find((r) => mismoProducto(r.producto, producto));
  if (!ref) return undefined;
  // Pasar el precio de referencia a la misma unidad que la alerta.
  const cantidad = convertir(1, unidad, ref.unidad, datos);
  if (cantidad === null) return ref;
  return { ...ref, precio: redondear(ref.precio * cantidad), unidad };
}

/**
 * Compara el precio de la última venta con el costo promedio de la semana.
 * Devuelve una alerta si vende por debajo del costo o con 5% o menos de
 * ganancia; null si el margen está bien o faltan datos.
 */
export function revisarMargen(producto: string, op: OpcionesCalculo = {}): AlertaMargen | null {
  const { movimientos, ahora, datos } = resolver(op);
  const precio = precioVentaPorUnidad(producto, { movimientos, ahora, datos });
  if (!precio) return null;
  const costo = costoPromedioPorUnidad(producto, {
    movimientos, ahora, datos, unidad: precio.unidad,
  });
  if (!costo || costo.valor <= 0) return null;

  const diferencia = redondear(precio.valor - costo.valor);
  const margen = diferencia / costo.valor;
  if (margen > MARGEN_MINIMO) return null;

  const nivel = diferencia < 0 ? "perdida" : "margen-bajo";
  const u = precio.unidad;
  const titulo =
    nivel === "perdida"
      ? `Estás perdiendo ${formatearBs(-diferencia)} por ${u} de ${producto}`
      : `Ganas apenas ${formatearBs(diferencia)} por ${u} de ${producto} (${formatearNumero(Math.round(margen * 100))}%)`;
  const detalle = `Te cuesta ${formatearBs(costo.valor)} por ${u} y lo vendes a ${formatearBs(precio.valor)} por ${u}.`;

  return {
    nivel,
    producto,
    unidad: u,
    costo: costo.valor,
    precio: precio.valor,
    diferenciaPorUnidad: diferencia,
    margen: redondear(margen),
    referencia: buscarReferencia(producto, u, datos),
    titulo,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// Pantalla principal
// ---------------------------------------------------------------------------

/** Todo lo vendido hoy (ventas y fiados), sepa o no su costo. */
export function ventasDelDia(op: OpcionesCalculo = {}): number {
  const { movimientos, ahora } = resolver(op);
  const desde = inicioDelDia(ahora).getTime();
  const total = movimientos
    .filter((m) => {
      const t = new Date(m.fecha).getTime();
      return esVenta(m) && t >= desde && t <= ahora.getTime();
    })
    .reduce((s, m) => s + m.total, 0);
  return redondear(total);
}

export interface GananciaDia extends Ganancia {
  fecha: Date;
  /** 0 = lunes … 6 = domingo */
  indice: number;
  esHoy: boolean;
  /** Día que todavía no llegó. */
  futuro: boolean;
  /** ¿Hubo ventas (con o sin costo) ese día? */
  hayVentas: boolean;
}

/** Ganancia de cada día de esta semana, de lunes a domingo. */
export function gananciaPorDia(op: OpcionesCalculo = {}): GananciaDia[] {
  const base = resolver(op);
  const lunes = inicioDeLaSemana(base.ahora);

  return Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
    const finDelDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1).getTime() - 1;
    const futuro = fecha.getTime() > base.ahora.getTime();
    const hasta = new Date(Math.min(finDelDia, base.ahora.getTime()));
    const g = futuro
      ? { ingresos: 0, costo: 0, ganancia: 0, productosSinCosto: [] }
      : gananciaEntre(fecha, { ...base, ahora: hasta });
    return {
      ...g,
      fecha,
      indice: i,
      esHoy: fecha.getTime() === inicioDelDia(base.ahora).getTime(),
      futuro,
      hayVentas: g.ingresos > 0 || g.productosSinCosto.length > 0,
    };
  });
}
