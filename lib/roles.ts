import { useSyncExternalStore } from "react";
import type { Rol } from "@/types/roles";
import { CLAVES, avisarCambio, EVENTO_CAMBIO } from "@/lib/almacen";

const ROLES: Rol[] = ["caserita", "productor", "familia"];

function leerRol(): Rol | "" {
  try {
    const valor = window.localStorage.getItem(CLAVES.rol);
    return ROLES.includes(valor as Rol) ? (valor as Rol) : "";
  } catch {
    return "";
  }
}

/** Elige el rol (o "" para volver al selector). Se recuerda en este celular. */
export function elegirRol(rol: Rol | ""): void {
  try {
    if (rol) window.localStorage.setItem(CLAVES.rol, rol);
    else window.localStorage.removeItem(CLAVES.rol);
  } catch {
    // sin storage: igual cambia mientras la página esté abierta
  }
  avisarCambio();
}

function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}
const EN_SERVIDOR = null;
const enServidor = () => EN_SERVIDOR;

/** Rol elegido: "" si todavía no eligió, null mientras no hay navegador. */
export function useRol(): Rol | "" | null {
  return useSyncExternalStore(suscribir, leerRol, enServidor);
}
