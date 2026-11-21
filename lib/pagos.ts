/**
 * Pagos de lo apuntado: entender frases como "doña Rosa me pagó 20",
 * "la Rosa ya me pagó todo" o "me pagó 20 la doña Rosa por QR",
 * encontrar al cliente entre los que deben y registrar el pago.
 */
import type { FormaPago, Pago } from "@/types/movimiento";
import { claveCliente, deudas, nombreCliente, type Deuda, type OpcionesCalculo } from "@/lib/calculos";
import { esPalabraNumero, leerNumero } from "@/lib/numeros";
import { normalizar, TITULOS } from "@/lib/parser";
import { agregarPago } from "@/lib/storage";

export interface PagoDetectado {
  /** Nombre como se dijo ("doña Rosa", "Rosa"). */
  nombre?: string;
  monto?: number;
  /** "me pagó todo", "me canceló" */
  todo: boolean;
  pago: FormaPago;
}

/** Verbos de "me pagaron". "Canceló" en Bolivia también es pagar. */
const VERBOS_PAGO = new Set([
  "pago", "pagaron", "pagado", "pagada", "cancelo", "cancelaron", "abono", "abonaron",
]);
const VERBOS_CANCELAR = new Set(["cancelo", "cancelaron"]);
/** Si aparecen, la frase es un registro de venta/compra, no un pago. */
const VERBOS_REGISTRO = new Set([
  "vendi", "vendo", "vendimos", "compre", "compro", "compramos", "fie", "llevo",
]);
const PREGUNTAS = new Set(["quien", "quienes", "cuanto", "cuantos", "cuando", "que"]);
const TODO = new Set(["todo", "toda", "todito", "toditito", "completo", "completa", "total", "entero"]);
const PAGO_QR = new Set(["qr", "transferencia", "deposito"]);
/** Palabras que no son parte del nombre. */
const RELLENO = new Set([
  "la", "el", "los", "las", "ya", "me", "nos", "le", "lo", "que", "de", "del", "su", "sus", "mi", "mis",
  "a", "al", "por", "con", "en", "y", "hoy", "ayer", "nomas", "deuda", "debia", "debe", "cuenta",
  "pesos", "peso", "bs", "bolivianos", "boliviano", "plata", "efectivo", "contado", "parte",
  ...VERBOS_PAGO, ...TODO, ...PAGO_QR,
]);

function tokenizar(texto: string) {
  return (texto.match(/\d+(?:[.,]\d+)?|\p{L}+/gu) ?? []).map((orig) => ({ orig, norm: normalizar(orig) }));
}

/**
 * ¿La frase es un pago de lo apuntado? Devuelve lo entendido o null.
 * El nombre y el monto pueden faltar: la tarjeta de confirmación los pide.
 */
export function detectarPago(texto: string): PagoDetectado | null {
  const tokens = tokenizar(texto);
  const n = tokens.map((t) => t.norm);
  if (!n.some((t) => VERBOS_PAGO.has(t))) return null;
  if (n.some((t) => VERBOS_REGISTRO.has(t))) return null;
  // "¿Quién me pagó?", "¿cuánto me pagaron?" son preguntas, no pagos.
  if (n.some((t) => PREGUNTAS.has(t))) return null;

  // Monto: el primer número de la frase.
  let monto: number | undefined;
  const usados = new Set<number>();
  for (let i = 0; i < n.length && monto === undefined; i++) {
    const num = leerNumero(n, i);
    if (num && !(n[i] === "un" || n[i] === "una")) {
      monto = num.valor;
      for (let k = i; k < num.fin; k++) usados.add(k);
    }
  }

  // Nombre: lo que queda después de quitar verbos, números y relleno.
  const nombre = tokens
    .filter((t, i) => !usados.has(i) && !RELLENO.has(t.norm) && !esPalabraNumero(t.norm))
    .map((t) => t.orig)
    .join(" ");

  const todo = n.some((t) => TODO.has(t)) || (monto === undefined && n.some((t) => VERBOS_CANCELAR.has(t)));

  return {
    nombre: nombre ? nombreCliente(nombre) : undefined,
    monto: todo ? undefined : monto,
    todo,
    pago: n.some((t) => PAGO_QR.has(t)) ? "qr" : "efectivo",
  };
}

/** Palabras del nombre sin títulos: "doña Rosa" → ["rosa"]. */
function nucleo(nombre: string): string[] {
  return claveCliente(nombre)
    .split(" ")
    .filter((p) => p && !(p in TITULOS));
}

/**
 * Busca a quién se refiere el nombre dicho entre los que deben.
 * "Rosa" o "la Rosa" encuentran a "doña Rosa". Si hay más de una Rosa,
 * devuelve las candidatas para que la caserita elija.
 */
export function buscarDeudor(
  nombre: string | undefined,
  lista: Deuda[],
): { deudor?: Deuda; candidatos: Deuda[] } {
  if (!nombre) return { candidatos: lista };

  const exacto = lista.find((d) => claveCliente(d.cliente) === claveCliente(nombre));
  if (exacto) return { deudor: exacto, candidatos: [exacto] };

  const buscado = nucleo(nombre);
  const titulo = claveCliente(nombre).split(" ").find((p) => p in TITULOS);
  const candidatos = lista.filter((d) => {
    const suyo = nucleo(d.cliente);
    if (buscado.length === 0) return titulo ? claveCliente(d.cliente).startsWith(titulo + " ") : false;
    return buscado.every((p) => suyo.includes(p));
  });
  return candidatos.length === 1 ? { deudor: candidatos[0], candidatos } : { candidatos };
}

/** Cuánto registrar: "todo" = lo que debe; nunca más de lo que debe. */
export function montoAPagar(detectado: Pick<PagoDetectado, "monto" | "todo">, deuda: Deuda): number | undefined {
  if (detectado.todo) return deuda.total;
  if (detectado.monto === undefined || detectado.monto <= 0) return undefined;
  return Math.min(detectado.monto, deuda.total);
}

/** Guarda el pago y devuelve cuánto sigue debiendo el cliente. */
export function registrarPago(
  cliente: string,
  monto: number,
  pago: FormaPago,
  op: OpcionesCalculo = {},
): { registro: Pago; saldo: number } {
  const registro = agregarPago({ cliente, monto, pago });
  const despues = deudas(op).find((d) => claveCliente(d.cliente) === claveCliente(cliente));
  return { registro, saldo: despues?.total ?? 0 };
}
