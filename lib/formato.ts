import type { Movimiento, TipoMovimiento } from "@/types/movimiento";

export const etiquetaTipo: Record<TipoMovimiento, string> = {
  venta: "Venta",
  compra: "Compra",
  fiado: "Fiado",
};

const numeroBo = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 });

export function formatearNumero(n: number): string {
  return numeroBo.format(n);
}

const plataBo = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "Bs 200", "Bs 12,50" (centavos solo si los hay) */
export function formatearBs(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  return `Bs ${Number.isInteger(redondeado) ? formatearNumero(redondeado) : plataBo.format(redondeado)}`;
}

/** Plural en español de una palabra o de la primera palabra de una expresión. */
function pluralPalabra(palabra: string): string {
  if (/[aeiouáéíóú]$/i.test(palabra)) return palabra + "s";
  if (/z$/i.test(palabra)) return palabra.slice(0, -1) + "ces";
  // "limón" → "limones", "cajón" → "cajones"
  if (/[áéíóú]n$/i.test(palabra)) return palabra.slice(0, -2) + palabra.at(-2)!.normalize("NFD")[0] + "nes";
  return palabra + "es";
}

/**
 * Plural de una expresión: todas las palabras antes de "de".
 * "pollo entero" → "pollos enteros", "carne de res" → "carnes de res".
 */
export function pluralizar(expresion: string): string {
  const palabras = expresion.split(" ");
  const corte = palabras.indexOf("de");
  const hasta = corte === -1 ? palabras.length : corte;
  return palabras.map((p, i) => (i < hasta ? pluralPalabra(p) : p)).join(" ");
}

/** "20 kilos de pollo", "media docena de pimentón", "1 pollo", "2 pollos" */
export function describirCantidad(
  cantidad: number,
  unidad: string,
  producto: string,
): string {
  if (unidad === "unidad") {
    return `${formatearNumero(cantidad)} ${cantidad === 1 ? producto : pluralizar(producto)}`;
  }
  if (cantidad === 0.5) {
    const femenina = /(a|ad)$/.test(unidad);
    return `${femenina ? "media" : "medio"} ${unidad} de ${producto}`;
  }
  const u = cantidad === 1 ? unidad : pluralizar(unidad);
  return `${formatearNumero(cantidad)} ${u} de ${producto}`;
}

/**
 * Resumen en una línea, con lo que haya:
 * "Compra · 20 kilos de pollo · Bs 200"
 */
export function resumirMovimiento(m: Partial<Omit<Movimiento, "id" | "fecha">>): string {
  const partes: string[] = [];
  if (m.tipo) partes.push(etiquetaTipo[m.tipo]);
  if (m.producto && m.cantidad !== undefined && m.unidad) {
    partes.push(describirCantidad(m.cantidad, m.unidad, m.producto));
  } else if (m.producto) {
    partes.push(m.producto);
  }
  if (m.total !== undefined) partes.push(formatearBs(m.total));
  if (m.cliente) partes.push(m.cliente);
  return partes.join(" · ");
}

/** "1 movimiento", "2 movimientos", "0 pagos". */
export function contar(n: number, singular: string, plural = pluralizar(singular)): string {
  return `${formatearNumero(n)} ${n === 1 ? singular : plural}`;
}

/** "1 movimiento", "2 movimientos y 1 pago", "1 pago". */
export function contarRegistros(movimientos: number, pagos: number): string {
  const partes: string[] = [];
  if (movimientos > 0 || pagos === 0) partes.push(contar(movimientos, "movimiento"));
  if (pagos > 0) partes.push(contar(pagos, "pago"));
  return partes.join(" y ");
}
