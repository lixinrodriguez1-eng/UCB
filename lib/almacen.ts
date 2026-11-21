/**
 * Listas guardadas en localStorage (pedidos, reservas, precios publicados,
 * calificaciones y rol). Avisan con el mismo evento que los movimientos, así
 * todas las pantallas se actualizan solas.
 */

export const EVENTO_CAMBIO = "caserita:cambio";

export const CLAVES = {
  rol: "caserita:rol",
  pedidos: "caserita:pedidos",
  reservas: "caserita:reservas",
  publicados: "caserita:publicados",
  calificaciones: "caserita:calificaciones",
} as const;

/** Lo que "Borrar todo" limpia además de movimientos y pagos (el rol se queda). */
export const CLAVES_DE_DATOS = [CLAVES.pedidos, CLAVES.reservas, CLAVES.publicados, CLAVES.calificaciones];

function hayStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function avisarCambio(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

export interface Almacen<T> {
  leer(): T[];
  guardar(lista: T[]): void;
  /** Mismo arreglo mientras no cambie (para useSyncExternalStore). */
  enCache(): T[];
  enServidor(): T[];
  suscribir(alCambiar: () => void): () => void;
}

export function crearAlmacen<T>(clave: string): Almacen<T> {
  const vacio = Object.freeze([]) as unknown as T[];
  let ultimoCrudo: string | null | undefined;
  let ultimaLista: T[] = vacio;

  const leer = (): T[] => {
    if (!hayStorage()) return [];
    try {
      const datos: unknown = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
      return Array.isArray(datos) ? (datos as T[]) : [];
    } catch {
      return [];
    }
  };

  return {
    leer,
    guardar(lista) {
      if (!hayStorage()) return;
      window.localStorage.setItem(clave, JSON.stringify(lista));
      avisarCambio();
    },
    enCache() {
      if (!hayStorage()) return vacio;
      const crudo = window.localStorage.getItem(clave);
      if (crudo !== ultimoCrudo) {
        ultimoCrudo = crudo;
        ultimaLista = leer();
      }
      return ultimaLista;
    },
    enServidor: () => vacio,
    suscribir(alCambiar) {
      if (typeof window === "undefined") return () => {};
      const alStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === clave) alCambiar();
      };
      window.addEventListener(EVENTO_CAMBIO, alCambiar);
      window.addEventListener("storage", alStorage);
      return () => {
        window.removeEventListener(EVENTO_CAMBIO, alCambiar);
        window.removeEventListener("storage", alStorage);
      };
    },
  };
}

export function generarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
