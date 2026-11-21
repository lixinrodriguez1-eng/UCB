import { normalizar, parsearFrase } from "@/lib/parser";

export type Pregunta = "ganancia-hoy" | "ganancia-semana" | "mas-rentable" | "deudores";

const DEUDORES = [
  "quien me debe", "quienes me deben", "quien me esta debiendo", "quienes me estan debiendo",
  "cuanto me deben", "quien debe", "quienes deben", "a quien le fie", "a quienes les fie",
];
const MAS_RENTABLE = [
  "que me deja mas", "que mas me deja", "me deja mas", "mas me deja", "me deja mas plata",
  "mas ganancia", "mas rentable", "que me conviene", "me rinde mas", "mas me rinde",
];
const GANANCIA = ["gane", "ganado", "ganancia", "ganancias", "ganando", "ganamos"];

/**
 * ¿La frase es una pregunta y no un registro?
 * "¿cuánto gané hoy?", "¿cuánto gané esta semana?", "¿qué me deja más?", "¿quién me debe?"
 */
export function detectarPregunta(texto: string): Pregunta | null {
  const t = ` ${normalizar(texto).replace(/[^\p{L}\d\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
  if (t.trim() === "") return null;
  const tiene = (frases: string[]) => frases.some((f) => t.includes(` ${f} `));

  // Si trae cantidad y total, es un registro ("vendí 3 kilos a 21 y gané...").
  const registro = parsearFrase(texto);
  if (registro.cantidad !== undefined && registro.total !== undefined) return null;

  if (tiene(DEUDORES)) return "deudores";
  if (tiene(MAS_RENTABLE)) return "mas-rentable";
  if (tiene(GANANCIA)) return t.includes(" semana ") ? "ganancia-semana" : "ganancia-hoy";
  return null;
}
