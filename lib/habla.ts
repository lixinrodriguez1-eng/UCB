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

/**
 * Chrome a veces no suena si se llama a cancel() y a speak() en el mismo
 * instante, o si el motor quedó en pausa. Esta espera lo evita.
 */
const ESPERA_TRAS_CALLAR = 80;

function armarFrase(texto: string, conVoz: boolean): SpeechSynthesisUtterance {
  const s = window.speechSynthesis;
  const frase = new SpeechSynthesisUtterance(texto);
  const voz = conVoz ? elegirVoz(s.getVoices()) : undefined;
  if (voz) {
    frase.voice = voz;
    frase.lang = voz.lang;
  } else {
    frase.lang = "es";
  }
  frase.rate = 1;
  return frase;
}

function pronunciar(texto: string): void {
  const s = window.speechSynthesis;
  const frase = armarFrase(texto, true);
  frase.volume = 1;
  // Si la voz elegida no existe en este equipo, reintenta con español genérico.
  frase.onerror = (evento) => {
    const codigo = evento.error;
    if (codigo === "canceled" || codigo === "interrupted") return;
    if (codigo !== "voice-unavailable" && codigo !== "language-unavailable" && codigo !== "synthesis-failed") return;
    const otra = armarFrase(texto, false);
    otra.volume = 1;
    s.resume();
    s.speak(otra);
  };
  if (s.paused) s.resume();
  s.resume();
  s.speak(frase);
}

let espera: number | null = null;

function lanzar(texto: string): void {
  const s = window.speechSynthesis;
  if (espera !== null) window.clearTimeout(espera);
  s.cancel();
  espera = window.setTimeout(() => {
    espera = null;
    if (!estaSilenciado()) pronunciar(texto);
  }, ESPERA_TRAS_CALLAR);
}

/** Despierta el motor de voz en el clic, sin pronunciar nada (un volumen 0 deja el altavoz mudo). */
export function prepararAudio(): void {
  if (!hablaSoportada()) return;
  const s = window.speechSynthesis;
  s.getVoices();
  s.resume();
}

export function hablar(texto: string): void {
  if (!texto || !hablaSoportada() || estaSilenciado()) return;
  const s = window.speechSynthesis;
  if (s.getVoices().length > 0) {
    lanzar(texto);
    return;
  }
  let hecho = false;
  const unaVez = () => {
    if (hecho) return;
    hecho = true;
    s.removeEventListener("voiceschanged", unaVez);
    lanzar(texto);
  };
  s.addEventListener("voiceschanged", unaVez);
  s.getVoices();
  window.setTimeout(unaVez, 400);
}

export function callar(): void {
  if (!hablaSoportada()) return;
  if (espera !== null) {
    window.clearTimeout(espera);
    espera = null;
  }
  window.speechSynthesis.cancel();
}
