/** Los tres roles de la app: Productor → Caserita → Familia. */
export type Rol = "caserita" | "productor" | "familia";

/** Un producto que ofrece un productor (precio por su unidad de venta). */
export interface OfertaProductor {
  producto: string;
  /** Unidad en que vende: "quintal", "caja", "arroba"... */
  unidad: string;
  /** Bs por `unidad`. */
  precio: number;
  /**
   * Cuánto trae una unidad cuando no hay conversión fija (ej. 1 caja de
   * tomate ≈ 20 kilo). Es un dato de ejemplo.
   */
  equivale?: { cantidad: number; unidad: string };
}

export interface Productor {
  id: string;
  nombre: string;
  tipo: "productor" | "mayorista";
  lugar: string;
  productos: OfertaProductor[];
  /** Todo lo inventado lleva esta marca. */
  ejemplo: true;
}

export type EstadoPedido = "pendiente" | "entregado" | "cobrado";

export interface ItemPedido {
  producto: string;
  cantidad: number;
  unidad: string;
  /** Bs por `unidad`. */
  precio: number;
  total: number;
  equivale?: { cantidad: number; unidad: string };
}

export interface Pedido {
  id: string;
  fecha: string;
  productorId: string;
  /** Quién pide (la caserita de la app o una de ejemplo). */
  caserita: string;
  mercado: string;
  items: ItemPedido[];
  total: number;
  estado: EstadoPedido;
  /** Pedidos simulados de otras caseritas. */
  ejemplo?: boolean;
}

/** Un producto con precio en un puesto, para las familias (precio por 1 unidad base). */
export interface PrecioPuesto {
  producto: string;
  /** "kilo", "unidad"... (1 kg de tomate, 1 lechuga) */
  unidad: string;
  precio: number;
}

export interface Puesto {
  id: string;
  nombre: string;
  mercado: string;
  productos: PrecioPuesto[];
  /** true en los puestos inventados; el de la caserita de la app no lo es. */
  ejemplo: boolean;
}

export type PagoReserva = "qr" | "efectivo" | "fiado";

export interface ItemReserva {
  producto: string;
  cantidad: number;
  unidad: string;
  precio: number;
  total: number;
}

export interface Reserva {
  id: string;
  fecha: string;
  puestoId: string;
  familia: string;
  items: ItemReserva[];
  total: number;
  pago: PagoReserva;
  estado: "reservada" | "entregada";
  calificacion?: number;
  ejemplo?: boolean;
}

export interface Calificacion {
  id: string;
  fecha: string;
  puestoId: string;
  estrellas: number;
  familia: string;
  ejemplo?: boolean;
}

/** Lo que la caserita decide mostrar a las familias. */
export interface Publicado {
  producto: string;
  unidad: string;
  precio: number;
}
