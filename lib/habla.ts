/**
 * Respuestas habladas con speechSynthesis.
 * Prefiere voces de Bolivia o Latinoamérica antes que la de España.
 */

const CLAVE_SILENCIO = "caserita:silencio";
const PREFERIDAS = ["es-bo", "es-419", "es-mx", "es-us"];

export function hablaSoportada(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// --- Elegir voz ------------------------------------------------------------

interface VozMinima {
  lang: string;
}

const idioma = (v: VozMinima) => v.lang.replace("_", "-").toLowerCase();

/** es-BO → es-419 → es-MX → es-US → otra latinoamericana → cualquier español. */
export function elegirVoz<T extends VozMinima>(voces: readonly T[]): T | undefined {
  for (const p of PREFERIDAS) {
    const voz = voces.find((v) => idioma(v) === p);
    if (voz) return voz;
  }
  return (
    voces.find((v) => idioma(v).startsWith("es-") && idioma(v) !== "es-es") ??
    voces.find((v) => idioma(v).startsWith("es"))
  );
}

// Chrome carga las voces de forma asíncrona: pedirlas temprano las "despierta".
if (hablaSoportada()) {
  window.speechSynthesis.getVoices();
}

// --- Silencio (se recuerda en este celular) ---------------------------------

let silenciado: boolean | null = null;
const oyentes = new Set<() => void>();

export function estaSilenciado(): boolean {
  if (silenciado === null) {
    try {
      silenciado = window.localStorage.getItem(CLAVE_SILENCIO) === "1";
    } catch {
      silenciado = false;
    }
  }
  return silenciado;
}

export function silenciar(valor: boolean): void {
  silenciado = valor;
  try {
    window.localStorage.setItem(CLAVE_SILENCIO, valor ? "1" : "0");
  } catch {
    // Sin storage igual funciona mientras la página esté abierta.
  }
  if (valor) callar();
  oyentes.forEach((f) => f());
}

export function suscribirSilencio(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  return () => oyentes.delete(alCambiar);
}

// --- Hablar -----------------------------------------------------------------

export function hablar(texto: string): void {
  if (!texto || !hablaSoportada() || estaSilenciado()) return;
  const s = window.speechSynthesis;
  s.cancel(); // no encimar respuestas
  const frase = new SpeechSynthesisUtterance(texto);
  const voz = elegirVoz(s.getVoices());
  if (voz) {
    frase.voice = voz;
    frase.lang = voz.lang;
  } else {
    frase.lang = "es-419";
  }
  frase.rate = 1;
  s.speak(frase);
}

export function callar(): void {
  if (hablaSoportada()) window.speechSynthesis.cancel();
}
