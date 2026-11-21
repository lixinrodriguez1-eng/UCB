import { useSyncExternalStore } from "react";
import type { Almacen } from "@/lib/almacen";

/** Lista de un almacén; se actualiza sola. Vacía mientras no hay navegador. */
export function useAlmacen<T>(almacen: Almacen<T>): T[] {
  return useSyncExternalStore(almacen.suscribir, almacen.enCache, almacen.enServidor);
}
