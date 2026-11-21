import type { Deuda } from "@/lib/calculos";
import { formatearBs } from "@/lib/formato";
import { normalizar } from "@/lib/parser";

/** Femeninos del mercado que no terminan en "a". */
const FEMENINOS = new Set(["carne", "leche", "sal", "miel", "nuez", "coliflor", "col"]);

/** "del pollo", "de la papa", "de la carne de res" */
function conDe(producto: string): string {
  const primera = normalizar(producto).split(" ")[0];
  const femenino = /a$/.test(primera) || FEMENINOS.has(primera);
  return femenino ? `de la ${producto}` : `del ${producto}`;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

/**
 * Recordatorio amable de cobro:
 * "Hola doña Rosa, le recuerdo los Bs 41 del pollo 🙂"
 */
export function mensajeCobro(deuda: Pick<Deuda, "cliente" | "total" | "productos">): string {
  const saludo = deuda.cliente && deuda.cliente !== "Sin nombre" ? `Hola ${deuda.cliente}` : "Hola";
  const productos = deuda.productos.length ? ` ${enumerar(deuda.productos.map(conDe))}` : "";
  return `${saludo}, le recuerdo los ${formatearBs(deuda.total)}${productos} 🙂`;
}

/**
 * Celular boliviano en formato internacional, solo dígitos.
 * "7123 4567" → "59171234567". null si no parece un número válido.
 */
export function normalizarCelular(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  if (/^[67]\d{7}$/.test(digitos)) return `591${digitos}`;
  if (/^591[67]\d{7}$/.test(digitos)) return digitos;
  if (/^\d{10,15}$/.test(digitos)) return digitos; // otro país, ya con código
  return null;
}

/**
 * Enlace de WhatsApp con el mensaje escrito. Sin celular, WhatsApp
 * deja elegir el contacto.
 */
export function enlaceWhatsApp(mensaje: string, celular?: string | null): string {
  const destino = celular ? normalizarCelular(celular) ?? "" : "";
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
}
