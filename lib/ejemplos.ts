/**
 * DATOS DE EJEMPLO para los roles Productor y Familia.
 * Todo lo que está acá es inventado para la demo y se muestra marcado como
 * "ejemplo" en la pantalla. Lo único real son los precios de referencia del
 * JSON (/data/caserita-datos-reales.json), que se usan aparte.
 */
import type { Calificacion, Pedido, Productor, Puesto, Reserva } from "@/types/roles";
import type { Movimiento } from "@/types/movimiento";

/** Mercado de la caserita de la app en la demo. */
export const MERCADO_EJEMPLO = "Mercado Los Pozos";

/** Nombre del puesto de la caserita de la app (si no cargó su nombre en el reporte). */
export const NOMBRE_CASERITA = "Doña Rosa";

/** Cuánto trae una caja de tomate (ejemplo: no hay medida fija en el JSON). */
const CAJA_DE_TOMATE = { cantidad: 20, unidad: "kilo" };

export const PRODUCTORES_EJEMPLO: Productor[] = [
  {
    id: "don-mateo",
    nombre: "Don Mateo",
    tipo: "productor",
    lugar: "Comunidad de Okinawa (ejemplo)",
    productos: [
      { producto: "papa", unidad: "quintal", precio: 145 },
      { producto: "cebolla", unidad: "quintal", precio: 120 },
      { producto: "tomate", unidad: "caja", precio: 115, equivale: CAJA_DE_TOMATE },
    ],
    ejemplo: true,
  },
  {
    id: "dona-elsa",
    nombre: "Doña Elsa",
    tipo: "productor",
    lugar: "Valles cruceños (ejemplo)",
    productos: [
      { producto: "tomate", unidad: "caja", precio: 100, equivale: CAJA_DE_TOMATE },
      { producto: "papa", unidad: "quintal", precio: 155 },
      { producto: "zanahoria", unidad: "quintal", precio: 110 },
    ],
    ejemplo: true,
  },
  {
    id: "mayorista-abasto",
    nombre: "Mayorista del Abasto (referencia)",
    tipo: "mayorista",
    lugar: "Abasto (ejemplo)",
    productos: [
      { producto: "papa", unidad: "quintal", precio: 170 },
      { producto: "tomate", unidad: "caja", precio: 130, equivale: CAJA_DE_TOMATE },
      { producto: "cebolla", unidad: "quintal", precio: 150 },
      { producto: "zanahoria", unidad: "quintal", precio: 140 },
    ],
    ejemplo: true,
  },
];

export function productorPorId(id: string): Productor | undefined {
  return PRODUCTORES_EJEMPLO.find((p) => p.id === id);
}

/**
 * Pedidos simulados de otras caseritas del mismo mercado, para el
 * "Pedido grupal". Se generan a partir del pedido real (mismo productor).
 */
export function pedidosSimulados(base: Pick<Pedido, "productorId" | "mercado" | "fecha">): Pedido[] {
  const productor = productorPorId(base.productorId);
  if (!productor) return [];
  const precio = (producto: string) => productor.productos.find((p) => p.producto === producto);
  const otras: { caserita: string; pide: [string, number][] }[] = [
    { caserita: "Doña Carmen (ejemplo)", pide: [["papa", 2], ["tomate", 1]] },
    { caserita: "Doña Juana (ejemplo)", pide: [["papa", 1.5], ["zanahoria", 1]] },
    { caserita: "Don Pedro (ejemplo)", pide: [["papa", 1], ["cebolla", 1], ["tomate", 2]] },
  ];
  return otras
    .map((o, i) => {
      const items = o.pide
        .map(([producto, cantidad]) => {
          const oferta = precio(producto);
          if (!oferta) return null;
          return {
            producto,
            cantidad,
            unidad: oferta.unidad,
            precio: oferta.precio,
            total: Math.round(oferta.precio * cantidad * 100) / 100,
            ...(oferta.equivale ? { equivale: oferta.equivale } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return {
        id: `ejemplo-${base.productorId}-${i}`,
        fecha: base.fecha,
        productorId: base.productorId,
        caserita: o.caserita,
        mercado: base.mercado,
        items,
        total: Math.round(items.reduce((s, x) => s + x.total, 0) * 100) / 100,
        estado: "pendiente" as const,
        ejemplo: true,
      };
    })
    .filter((p) => p.items.length > 0);
}

/** Pedidos de otros mercados ya cobrados, para la vista del productor. */
export function pedidosOtrosMercados(productorId: string, ahora: Date): Pedido[] {
  const productor = productorPorId(productorId);
  if (!productor) return [];
  const oferta = productor.productos[0];
  const ayer = new Date(ahora.getTime() - 86_400_000).toISOString();
  return [
    {
      id: `ejemplo-${productorId}-abasto`,
      fecha: ayer,
      productorId,
      caserita: "Don Luis (ejemplo)",
      mercado: "Mercado Abasto (ejemplo)",
      items: [{ producto: oferta.producto, cantidad: 3, unidad: oferta.unidad, precio: oferta.precio, total: oferta.precio * 3 }],
      total: oferta.precio * 3,
      estado: "cobrado",
      ejemplo: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Familia
// ---------------------------------------------------------------------------

export const PUESTOS_EJEMPLO: Puesto[] = [
  {
    id: "dona-carmen",
    nombre: "Doña Carmen",
    mercado: MERCADO_EJEMPLO,
    productos: [
      { producto: "tomate", unidad: "kilo", precio: 8 },
      { producto: "papa", unidad: "kilo", precio: 5 },
      { producto: "lechuga", unidad: "unidad", precio: 5 },
      { producto: "zanahoria", unidad: "kilo", precio: 7 },
    ],
    ejemplo: true,
  },
  {
    id: "don-pedro",
    nombre: "Don Pedro",
    mercado: "Mercado La Ramada (ejemplo)",
    productos: [
      { producto: "tomate", unidad: "kilo", precio: 7.5 },
      { producto: "lechuga", unidad: "unidad", precio: 6 },
      { producto: "zanahoria", unidad: "kilo", precio: 6.5 },
      { producto: "pollo", unidad: "kilo", precio: 14 },
    ],
    ejemplo: true,
  },
];

/** Estrellas de ejemplo de los puestos inventados (fijas). */
export const ESTRELLAS_EJEMPLO: Record<string, { promedio: number; cantidad: number }> = {
  "dona-carmen": { promedio: 4.5, cantidad: 12 },
  "don-pedro": { promedio: 4.2, cantidad: 8 },
};

/**
 * Precios de supermercado ESTIMADOS (ejemplo) para calcular el ahorro de la
 * familia. Bs por kilo o por unidad.
 */
export const PRECIOS_SUPERMERCADO_ESTIMADOS: Record<string, { unidad: string; precio: number }> = {
  tomate: { unidad: "kilo", precio: 11 },
  papa: { unidad: "kilo", precio: 7.5 },
  lechuga: { unidad: "unidad", precio: 8 },
  zanahoria: { unidad: "kilo", precio: 10 },
  cebolla: { unidad: "kilo", precio: 9 },
  pollo: { unidad: "kilo", precio: 22 },
  queso: { unidad: "kilo", precio: 45 },
};

/** Precios que publica Doña Rosa en el "Modo demo completo" (como en el resumen del proyecto). */
export const PUBLICADOS_DEMO = [
  { producto: "tomate", unidad: "kilo", precio: 7 },
  { producto: "papa", unidad: "kilo", precio: 4.5 },
  { producto: "lechuga", unidad: "unidad", precio: 5 },
  { producto: "zanahoria", unidad: "kilo", precio: 6 },
];

/** Calificaciones de ejemplo que trae el "Modo demo completo" para Doña Rosa. */
export function calificacionesDemo(ahora: Date): Calificacion[] {
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000).toISOString();
  return [
    { id: "ejemplo-cal-1", fecha: hace(3), puestoId: "propio", estrellas: 5, familia: "Familia Vargas (ejemplo)", ejemplo: true },
    { id: "ejemplo-cal-2", fecha: hace(2), puestoId: "propio", estrellas: 4, familia: "Familia Suárez (ejemplo)", ejemplo: true },
    { id: "ejemplo-cal-3", fecha: hace(1), puestoId: "propio", estrellas: 5, familia: "Familia Mendoza (ejemplo)", ejemplo: true },
  ];
}

/**
 * Compras de esta mañana que trae el "Modo demo completo" para los productos
 * que Doña Rosa publica y el demo de siempre no compra (lechuga, zanahoria).
 * Así "Hoy ganaste" sabe su costo cuando las familias los compran.
 */
export function comprasDemoCompleto(ahora: Date): Movimiento[] {
  const hoy = (h: number, m: number) => new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m);
  const temprano = (h: number, m: number) => new Date(Math.min(hoy(h, m).getTime(), ahora.getTime() - 60_000)).toISOString();
  return [
    { id: "demo-completo-1", fecha: temprano(6, 40), tipo: "compra", producto: "lechuga", cantidad: 30, unidad: "unidad", total: 75, pago: "efectivo", cliente: "Doña Elsa (ejemplo)" },
    { id: "demo-completo-2", fecha: temprano(6, 45), tipo: "compra", producto: "zanahoria", cantidad: 20, unidad: "kilo", total: 70, pago: "efectivo", cliente: "Doña Elsa (ejemplo)" },
  ];
}

/** Reservas de hoy que trae el "Modo demo completo" para el puesto de Doña Rosa. */
export function reservasDemo(ahora: Date): Reserva[] {
  const hace = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();
  return [
    {
      id: "ejemplo-res-1",
      fecha: hace(40),
      puestoId: "propio",
      familia: "Familia Pérez (ejemplo)",
      items: [
        { producto: "tomate", cantidad: 1, unidad: "kilo", precio: 7, total: 7 },
        { producto: "lechuga", cantidad: 2, unidad: "unidad", precio: 5, total: 10 },
      ],
      total: 17,
      pago: "qr",
      estado: "reservada",
      ejemplo: true,
    },
    {
      id: "ejemplo-res-2",
      fecha: hace(15),
      puestoId: "propio",
      familia: "Familia Rojas (ejemplo)",
      items: [{ producto: "papa", cantidad: 2, unidad: "kilo", precio: 4.5, total: 9 }],
      total: 9,
      pago: "fiado",
      estado: "reservada",
      ejemplo: true,
    },
  ];
}
