/**
 * Envoltorio mínimo sobre la Web Speech API (SpeechRecognition).
 * Chrome/Edge/Safari la exponen como `SpeechRecognition` o `webkitSpeechRecognition`.
 */

interface AlternativaVoz {
  transcript: string;
}
interface ResultadoVoz {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [indice: number]: AlternativaVoz;
}
interface EventoResultadoVoz {
  readonly results: ArrayLike<ResultadoVoz>;
}
interface EventoErrorVoz {
  readonly error: string;
}
interface ReconocedorVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoResultadoVoz) => void) | null;
  onerror: ((e: EventoErrorVoz) => void) | null;
  onend: (() => void) | null;
}
type ConstructorReconocedor = new () => ReconocedorVoz;

const IDIOMA_PRINCIPAL = "es-BO";
const IDIOMA_RESPALDO = "es-419";

/** Si es-BO no está disponible, las siguientes veces se usa directo es-419. */
let idiomaActual = IDIOMA_PRINCIPAL;

function obtenerConstructor(): ConstructorReconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocedor;
    webkitSpeechRecognition?: ConstructorReconocedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function vozSoportada(): boolean {
  return obtenerConstructor() !== null;
}

export interface OpcionesEscucha {
  /** Texto reconocido hasta ahora (va cambiando mientras habla). */
  onTexto: (texto: string) => void;
  /** Terminó de escuchar; `texto` puede venir vacío. */
  onFin: (texto: string) => void;
  /** Código de error de la API ("no-speech", "not-allowed", "network"...). */
  onError: (codigo: string) => void;
}

export interface ControlEscucha {
  /** Deja de escuchar y procesa lo que se dijo. */
  detener(): void;
  /** Corta sin avisar nada (por ejemplo al desmontar el componente). */
  cancelar(): void;
}

export function escuchar(opciones: OpcionesEscucha): ControlEscucha {
  const Constructor = obtenerConstructor();
  if (!Constructor) {
    opciones.onError("no-soportado");
    return { detener() {}, cancelar() {} };
  }

  let reconocedor: ReconocedorVoz | null = null;
  let cancelado = false;

  const iniciar = (idioma: string) => {
    const r = new Constructor();
    reconocedor = r;
    r.lang = idioma;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    let texto = "";
    let error: string | null = null;
    let reintentar = false;

    r.onresult = (e) => {
      texto = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cancelado) opciones.onTexto(texto);
    };

    r.onerror = (e) => {
      if (e.error === "language-not-supported" && idioma !== IDIOMA_RESPALDO) {
        idiomaActual = IDIOMA_RESPALDO;
        reintentar = true;
        return;
      }
      if (e.error !== "aborted") error = e.error;
    };

    r.onend = () => {
      if (cancelado) return;
      if (reintentar) {
        iniciar(IDIOMA_RESPALDO);
        return;
      }
      if (error && !texto) opciones.onError(error);
      else opciones.onFin(texto);
    };

    try {
      r.start();
    } catch {
      opciones.onError("no-inicio");
    }
  };

  iniciar(idiomaActual);

  return {
    detener: () => reconocedor?.stop(),
    cancelar: () => {
      cancelado = true;
      reconocedor?.abort();
    },
  };
}

/** Mensaje para la caserita según el error de la API. */
export function mensajeErrorVoz(codigo: string): string {
  switch (codigo) {
    case "no-speech":
      return "No te escuché. Toca el botón y habla de nuevo.";
    case "not-allowed":
    case "service-not-allowed":
      return "No tengo permiso para usar el micrófono. Puedes escribirlo aquí.";
    case "audio-capture":
      return "No encuentro el micrófono. Puedes escribirlo aquí.";
    case "network":
      return "Se necesita internet para entender la voz. Puedes escribirlo aquí.";
    default:
      return "Algo falló con el micrófono. Intenta de nuevo o escríbelo.";
  }
}

/** Errores en los que conviene pasar a escribir en vez de hablar. */
export function errorPideTexto(codigo: string): boolean {
  return ["not-allowed", "service-not-allowed", "audio-capture", "network", "no-soportado", "no-inicio"].includes(codigo);
}
