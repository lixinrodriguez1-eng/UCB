import type { Movimiento, NuevoMovimiento, NuevoPago, Pago } from "@/types/movimiento";
import { recordarProducto, resolverCategoria } from "@/lib/catalogo";
import { CLAVES_DE_DATOS } from "@/lib/almacen";

const CLAVE_MOVIMIENTOS = "caserita:movimientos";
const CLAVE_PAGOS = "caserita:pagos";
/** Evento que se dispara en esta pestaña cada vez que cambian los movimientos. */
const EVENTO_CAMBIO = "caserita:cambio";

/** localStorage solo existe en el navegador. */
function hayStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function generarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Devuelve todos los movimientos, del más reciente al más antiguo. */
export function obtenerMovimientos(): Movimiento[] {
  if (!hayStorage()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_MOVIMIENTOS);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return (datos as Movimiento[]).sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
  } catch {
    return [];
  }
}

function guardarMovimientos(movimientos: Movimiento[]): void {
  if (!hayStorage()) return;
  window.localStorage.setItem(CLAVE_MOVIMIENTOS, JSON.stringify(movimientos));
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/** Agrega un movimiento y lo devuelve con su id y fecha. */
export function agregarMovimiento(nuevo: NuevoMovimiento): Movimiento {
  const categoria = nuevo.categoria ?? resolverCategoria(nuevo.producto).categoria;
  const movimiento: Movimiento = {
    ...nuevo,
    categoria,
    id: generarId(),
    fecha: nuevo.fecha ?? new Date().toISOString(),
  };
  guardarMovimientos([movimiento, ...obtenerMovimientos()]);
  recordarProducto(movimiento.producto, categoria);
  return movimiento;
}

/** Actualiza los campos de un movimiento existente. */
export function actualizarMovimiento(
  id: string,
  cambios: Partial<Omit<Movimiento, "id">>,
): Movimiento | undefined {
  const movimientos = obtenerMovimientos();
  const indice = movimientos.findIndex((m) => m.id === id);
  if (indice === -1) return undefined;
  movimientos[indice] = { ...movimientos[indice], ...cambios };
  guardarMovimientos(movimientos);
  return movimientos[indice];
}

/** Elimina un movimiento por su id. */
export function eliminarMovimiento(id: string): void {
  guardarMovimientos(obtenerMovimientos().filter((m) => m.id !== id));
}

/** Reemplaza todos los movimientos de una vez (para el modo demo). */
export function reemplazarMovimientos(movimientos: Movimiento[]): void {
  guardarMovimientos([...movimientos].sort((x, y) => y.fecha.localeCompare(x.fecha)));
}

/** Borra todos los movimientos y pagos (útil para reiniciar el demo). */
export function borrarTodo(): void {
  if (!hayStorage()) return;
  window.localStorage.removeItem(CLAVE_MOVIMIENTOS);
  window.localStorage.removeItem(CLAVE_PAGOS);
  // Pedidos, reservas, precios publicados y estrellas (el rol elegido se queda).
  for (const clave of CLAVES_DE_DATOS) window.localStorage.removeItem(clave);
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

// ---------------------------------------------------------------------------
// Pagos de apuntados
// ---------------------------------------------------------------------------

/** Todos los pagos, del más reciente al más antiguo. */
export function obtenerPagos(): Pago[] {
  if (!hayStorage()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_PAGOS);
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    if (!Array.isArray(datos)) return [];
    return (datos as Pago[]).sort((a, b) => b.fecha.localeCompare(a.fecha));
  } catch {
    return [];
  }
}

function guardarPagos(pagos: Pago[]): void {
  if (!hayStorage()) return;
  window.localStorage.setItem(CLAVE_PAGOS, JSON.stringify(pagos));
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

export function agregarPago(nuevo: NuevoPago): Pago {
  const pago: Pago = { ...nuevo, id: generarId(), fecha: nuevo.fecha ?? new Date().toISOString() };
  guardarPagos([pago, ...obtenerPagos()]);
  return pago;
}

export function reemplazarPagos(pagos: Pago[]): void {
  guardarPagos([...pagos].sort((x, y) => y.fecha.localeCompare(x.fecha)));
}

// ---------------------------------------------------------------------------
// Suscripción a cambios (para useSyncExternalStore)
// ---------------------------------------------------------------------------

/** Llama a `alCambiar` cuando cambian los movimientos, en esta pestaña o en otra. */
export function suscribirMovimientos(alCambiar: () => void): () => void {
  if (!hayStorage()) return () => {};
  const alStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CLAVE_MOVIMIENTOS || e.key === CLAVE_PAGOS) alCambiar();
  };
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  window.addEventListener("storage", alStorage);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alStorage);
  };
}

const SIN_MOVIMIENTOS: Movimiento[] = Object.freeze([]) as unknown as Movimiento[];
const SIN_PAGOS: Pago[] = Object.freeze([]) as unknown as Pago[];

let ultimoCrudo: string | null | undefined;
let ultimaLista: Movimiento[] = SIN_MOVIMIENTOS;

/**
 * Igual que obtenerMovimientos, pero devuelve el mismo arreglo mientras
 * los datos no cambien (useSyncExternalStore lo necesita así).
 */
export function obtenerMovimientosEnCache(): Movimiento[] {
  if (!hayStorage()) return SIN_MOVIMIENTOS;
  const crudo = window.localStorage.getItem(CLAVE_MOVIMIENTOS);
  if (crudo !== ultimoCrudo) {
    ultimoCrudo = crudo;
    ultimaLista = obtenerMovimientos();
  }
  return ultimaLista;
}

export function movimientosEnServidor(): Movimiento[] {
  return SIN_MOVIMIENTOS;
}

export function pagosEnServidor(): Pago[] {
  return SIN_PAGOS;
}

let ultimoCrudoPagos: string | null | undefined;
let ultimosPagos: Pago[] = SIN_PAGOS;

/** Igual que obtenerPagos, pero con el mismo arreglo mientras no cambien. */
export function obtenerPagosEnCache(): Pago[] {
  if (!hayStorage()) return SIN_PAGOS;
  const crudo = window.localStorage.getItem(CLAVE_PAGOS);
  if (crudo !== ultimoCrudoPagos) {
    ultimoCrudoPagos = crudo;
    ultimosPagos = obtenerPagos();
  }
  return ultimosPagos;
}
