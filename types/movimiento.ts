/** Tipo de movimiento que registra la caserita. */
export type TipoMovimiento = "venta" | "compra" | "fiado";

/** Forma de pago del movimiento. */
export type FormaPago = "efectivo" | "qr";

/** Un registro de venta, compra o fiado. */
export interface Movimiento {
  id: string;
  /** Fecha en formato ISO 8601 (ej. "2026-11-20T08:30:00.000Z"). */
  fecha: string;
  tipo: TipoMovimiento;
  producto: string;
  /** Categoría automática del producto (ej. "verduras"). */
  categoria?: string;
  cantidad: number;
  /** Unidad de medida: "kg", "arroba", "unidad", "docena", etc. */
  unidad: string;
  /** Monto total en bolivianos (Bs). */
  total: number;
  cliente?: string;
  pago: FormaPago;
}

/** Datos para crear un movimiento nuevo (el id y la fecha se generan solos). */
export type NuevoMovimiento = Omit<Movimiento, "id" | "fecha"> &
  Partial<Pick<Movimiento, "fecha">>;

/** Un pago (total o a cuenta) de lo que un cliente tenía apuntado. */
export interface Pago {
  id: string;
  /** Fecha en formato ISO 8601. */
  fecha: string;
  /** Nombre del cliente tal como figura en sus apuntes (ej. "doña Rosa"). */
  cliente: string;
  /** Monto pagado en bolivianos (Bs). */
  monto: number;
  pago: FormaPago;
}

export type NuevoPago = Omit<Pago, "id" | "fecha"> & Partial<Pick<Pago, "fecha">>;
