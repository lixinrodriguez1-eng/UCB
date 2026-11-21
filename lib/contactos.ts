/**
 * Celulares de los clientes, guardados en este celular (localStorage).
 * Clave: la misma que junta a los clientes ("doña Rosa" y "Rosa" → "rosa").
 */
import { claveCliente } from "@/lib/calculos";

const CLAVE = "caserita:celulares";
const EVENTO = "caserita:celulares-cambio";

type Celulares = Record<string, string>;

const SIN_CELULARES: Celulares = Object.freeze({}) as Celulares;
let ultimoCrudo: string | null | undefined;
let ultimos: Celulares = SIN_CELULARES;

export function sinCelulares(): Celulares {
  return SIN_CELULARES;
}

/** Mismo objeto mientras no cambie (para useSyncExternalStore). */
export function obtenerCelulares(): Celulares {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (crudo !== ultimoCrudo) {
      ultimoCrudo = crudo;
      ultimos = crudo ? (JSON.parse(crudo) as Celulares) : SIN_CELULARES;
    }
  } catch {
    // sin storage: queda lo que había
  }
  return ultimos;
}

export function celularDe(celulares: Celulares, cliente: string): string | undefined {
  return celulares[claveCliente(cliente)];
}

export function guardarCelular(cliente: string, celular: string | null): void {
  const nuevos = { ...obtenerCelulares() };
  if (celular) nuevos[claveCliente(cliente)] = celular;
  else delete nuevos[claveCliente(cliente)];
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function suscribirCelulares(alCambiar: () => void): () => void {
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}
