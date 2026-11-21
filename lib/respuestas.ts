/**
 * Textos que la app dice en voz alta y muestra en pantalla,
 * en tono cercano de mercado.
 */
import {
  deudas,
  gananciaDeLaSemana,
  gananciaDelDia,
  gananciaPorProducto,
  type AlertaMargen,
  type Ganancia,
  type OpcionesCalculo,
} from "@/lib/calculos";
import { formatearBs } from "@/lib/formato";
import type { Pregunta } from "@/lib/preguntas";
import type { PrecioReferencia } from "@/types/datosMercado";

// --- Precio de referencia en pantalla ------------------------------------------

const fechaReferencia = new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "En el mercado ya está a Bs 20,50 el kilo" */
export function textoReferencia(ref: PrecioReferencia): string {
  return `En el mercado ya está a ${formatearBs(ref.precio)} ${conArticulo(ref.unidad)}`;
}

/** "Fuente: El Deber / eju.tv · Abasto Minorista · 28 de julio de 2026" */
export function fuenteReferencia(ref: PrecioReferencia): string {
  const partes = [`Fuente: ${ref.fuente}`];
  if (ref.mercado) partes.push(ref.mercado);
  if (ref.fecha) partes.push(fechaReferencia.format(new Date(`${ref.fecha}T00:00:00Z`)));
  return partes.join(" · ");
}

export interface Respuesta {
  titulo: string;
  lineas: string[];
  nota?: string;
  /** Lo que se dice en voz alta. */
  hablado: string;
}

// --- Montos para decir en voz alta ---------------------------------------------

// Nunca "1,20": la voz lo lee "uno coma veinte". Se dice como en el mercado.

/** Separa un monto en pesos y centavos enteros (con redondeo a centavos). */
function partes(n: number): { pesos: number; centavos: number } {
  const totalCentavos = Math.round(Math.abs(n) * 100);
  return { pesos: Math.floor(totalCentavos / 100), centavos: totalCentavos % 100 };
}

const centavosTexto = (c: number) => `${c} ${c === 1 ? "centavo" : "centavos"}`;

/**
 * Monto suelto, como se dice un precio en el mercado:
 * 13 → "13", 20.5 → "20 con 50", 1.2 → "1 con 20", 0.83 → "83 centavos".
 */
export function montoHablado(n: number): string {
  const { pesos, centavos } = partes(n);
  if (centavos === 0) return String(pesos);
  if (pesos === 0) return centavosTexto(centavos);
  // "6 con 8" se entendería como 6,80: con menos de 10 centavos se dice completo.
  if (centavos < 10) return pesosHablados(n);
  return `${pesos} con ${centavos}`;
}

/**
 * Monto con la palabra pesos:
 * 21 → "21 pesos", 1 → "1 peso", 1.2 → "1 peso con 20 centavos", 0.4 → "40 centavos".
 */
export function pesosHablados(n: number): string {
  const { pesos, centavos } = partes(n);
  const textoPesos = `${pesos} ${pesos === 1 ? "peso" : "pesos"}`;
  if (centavos === 0) return textoPesos;
  if (pesos === 0) return centavosTexto(centavos);
  return `${textoPesos} con ${centavosTexto(centavos)}`;
}

/** "el kilo", "la docena", "la arroba", "la unidad" */
export function conArticulo(unidad: string): string {
  return `${/(a|ad)$/.test(unidad) ? "la" : "el"} ${unidad}`;
}

// --- Alerta de margen ---------------------------------------------------------

/**
 * "Ojo, caserita: el kilo de pollo te sale a 17 pesos y lo vendes a 13.
 *  Estás perdiendo 4 pesos por kilo. En el mercado ya está a 20,50."
 */
export function fraseAlerta(a: AlertaMargen): string {
  const partes = [
    `Ojo, caserita: ${conArticulo(a.unidad)} de ${a.producto} te sale a ${pesosHablados(a.costo)} y lo vendes a ${montoHablado(a.precio)}.`,
  ];
  if (a.diferenciaPorUnidad < 0) {
    partes.push(`Estás perdiendo ${pesosHablados(a.diferenciaPorUnidad)} por ${a.unidad}.`);
  } else if (a.diferenciaPorUnidad === 0) {
    partes.push(`No le estás ganando nada.`);
  } else {
    partes.push(`Apenas ganas ${pesosHablados(a.diferenciaPorUnidad)} por ${a.unidad}.`);
  }
  if (a.referencia) {
    partes.push(`En el mercado ya está a ${montoHablado(a.referencia.precio)}.`);
  }
  return partes.join(" ");
}

// --- Preguntas ------------------------------------------------------------------

function listaHablada(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function responderGanancia(g: Ganancia, cuando: "Hoy" | "Esta semana"): Respuesta {
  const sinCosto = g.productosSinCosto;

  if (g.ingresos === 0 && sinCosto.length === 0) {
    return {
      titulo: `${cuando} todavía no hay ventas`,
      lineas: [],
      hablado: `${cuando} todavía no registraste ventas, caserita.`,
    };
  }

  if (g.ingresos === 0) {
    const lista = listaHablada(sinCosto);
    return {
      titulo: "No puedo calcular la ganancia",
      lineas: [`Vendiste ${lista}, pero no registraste a cuánto lo compraste.`],
      hablado: `${cuando} vendiste ${lista}, pero no sé a cuánto lo compraste, así que no puedo sacar tu ganancia.`,
    };
  }

  const pierde = g.ganancia < 0;
  const titulo = pierde
    ? `${cuando} vas perdiendo ${formatearBs(-g.ganancia)}`
    : `${cuando} ganaste ${formatearBs(g.ganancia)}`;
  let hablado = pierde
    ? `${cuando} vas perdiendo ${pesosHablados(g.ganancia)}, caserita.`
    : `${cuando} ganaste ${pesosHablados(g.ganancia)}, caserita.`;
  hablado += ` Vendiste ${montoHablado(g.ingresos)} y la mercadería te costó ${montoHablado(g.costo)}.`;

  const respuesta: Respuesta = {
    titulo,
    lineas: [`Vendiste ${formatearBs(g.ingresos)}`, `La mercadería te costó ${formatearBs(g.costo)}`],
    hablado,
  };
  if (sinCosto.length) {
    const lista = listaHablada(sinCosto);
    respuesta.nota = `No cuento ${lista}: no registraste a cuánto lo compraste.`;
    respuesta.hablado += ` No estoy contando ${lista} porque no sé a cuánto lo compraste.`;
  }
  return respuesta;
}

function responderMasRentable(op: OpcionesCalculo): Respuesta {
  const lista = gananciaPorProducto(op);
  if (lista.length === 0) {
    return {
      titulo: "Todavía no puedo comparar",
      lineas: ["Esta semana no hay ventas de productos con compra registrada."],
      hablado: "Esta semana todavía no tengo ventas con su compra registrada para comparar, caserita.",
    };
  }

  const [primero, segundo] = lista;
  const lineas = lista.slice(0, 5).map(
    (p) => `${p.producto}: ${p.ganancia < 0 ? "pierdes" : "ganas"} ${formatearBs(Math.abs(p.ganancia))}`,
  );

  if (primero.ganancia <= 0) {
    return {
      titulo: "Ningún producto te deja ganancia",
      lineas,
      hablado: `Esta semana ningún producto te está dejando ganancia, caserita. El que mejor va es ${primero.producto}.`,
    };
  }

  let hablado = `Lo que más te deja esta semana es ${primero.producto}: ${pesosHablados(primero.ganancia)} de ganancia.`;
  if (segundo && segundo.ganancia > 0) {
    hablado += ` Le sigue ${segundo.producto} con ${pesosHablados(segundo.ganancia)}.`;
  }
  return { titulo: `Lo que más te deja: ${primero.producto}`, lineas, hablado };
}

function responderDeudores(op: OpcionesCalculo): Respuesta {
  const lista = deudas(op);
  const nota = "Ya descuenta los pagos que registraste.";
  if (lista.length === 0) {
    return {
      titulo: "Nadie te debe",
      lineas: [],
      hablado: "Nadie te debe, caserita. No hay fiados registrados.",
    };
  }

  const total = lista.reduce((s, d) => s + d.total, 0);
  if (lista.length === 1) {
    const [unica] = lista;
    const nombre = unica.cliente.charAt(0).toUpperCase() + unica.cliente.slice(1);
    return {
      titulo: `${nombre} te debe ${formatearBs(unica.total)}`,
      lineas: [`${unica.cliente}: ${formatearBs(unica.total)}`],
      nota,
      hablado: `${nombre} te debe ${pesosHablados(unica.total)}, caserita.`,
    };
  }
  const principales = lista.slice(0, 3).map((d) => `${d.cliente}, ${pesosHablados(d.total)}`);
  let hablado = `Te deben ${pesosHablados(total)} en total. ${listaHablada(principales)}.`;
  if (lista.length > 3) {
    const resto = lista.length - 3;
    hablado += ` Y ${resto} ${resto === 1 ? "persona" : "personas"} más.`;
  }

  return {
    titulo: `Te deben ${formatearBs(total)}`,
    lineas: lista.map((d) => `${d.cliente}: ${formatearBs(d.total)}`),
    nota,
    hablado,
  };
}

export function responderPregunta(pregunta: Pregunta, op: OpcionesCalculo = {}): Respuesta {
  switch (pregunta) {
    case "ganancia-hoy":
      return responderGanancia(gananciaDelDia(op), "Hoy");
    case "ganancia-semana":
      return responderGanancia(gananciaDeLaSemana(op), "Esta semana");
    case "mas-rentable":
      return responderMasRentable(op);
    case "deudores":
      return responderDeudores(op);
  }
}

// --- Pagos de apuntados ---------------------------------------------------------

/** "Listo, doña Rosa ahora te debe 21 pesos." / "Listo, doña Rosa ya no te debe nada." */
export function fraseSaldo(cliente: string, saldo: number): string {
  return saldo <= 0
    ? `Listo, ${cliente} ya no te debe nada.`
    : `Listo, ${cliente} ahora te debe ${pesosHablados(saldo)}.`;
}
