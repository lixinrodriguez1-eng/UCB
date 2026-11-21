import { useMemo, useSyncExternalStore } from "react";
import type { Movimiento, Pago } from "@/types/movimiento";
import { obtenerMovimientosEnCache, obtenerPagosEnCache, suscribirMovimientos } from "@/lib/storage";

const enServidor = () => null;

/** Movimientos guardados; se actualiza solo. null mientras no hay navegador. */
export function useMovimientos(): Movimiento[] | null {
  return useSyncExternalStore(suscribirMovimientos, obtenerMovimientosEnCache, enServidor);
}

/** Pagos de apuntados; se actualiza solo. null mientras no hay navegador. */
export function usePagos(): Pago[] | null {
  return useSyncExternalStore(suscribirMovimientos, obtenerPagosEnCache, enServidor);
}

// --- Hora actual, redondeada al minuto ---------------------------------------

function suscribirMinuto(alCambiar: () => void): () => void {
  const id = window.setInterval(alCambiar, 30_000);
  return () => window.clearInterval(id);
}
const minutoActual = () => Math.floor(Date.now() / 60_000);

/**
 * La hora de ahora (cambia cada minuto), para que "hoy" se actualice solo
 * después de medianoche. null mientras no hay navegador.
 */
export function useAhora(): Date | null {
  const minuto = useSyncExternalStore(suscribirMinuto, minutoActual, enServidor);
  // Final del minuto: así lo que se acaba de registrar ya cuenta como "hasta ahora".
  // Misma instancia mientras no cambie el minuto (para useMemo).
  return useMemo(() => (minuto === null ? null : new Date((minuto + 1) * 60_000 - 1)), [minuto]);
}
