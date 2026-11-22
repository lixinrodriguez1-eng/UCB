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

/** es-BO primero (la demo es de Bolivia); si este Chrome no lo tiene, México y España. */
const IDIOMAS = ["es-BO", "es-MX", "es-ES"];

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
  let indiceIdioma = 0;
  let reintentosRed = 0;

  const iniciar = () => {
    const r = new Constructor();
    reconocedor = r;
    r.lang = IDIOMAS[indiceIdioma] ?? IDIOMAS[0];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    let texto = "";
    let error: string | null = null;
    let seguir = false;

    r.onresult = (e) => {
      texto = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cancelado) opciones.onTexto(texto);
    };

    r.onerror = (e) => {
      if (e.error === "aborted") return;
      if (e.error === "language-not-supported" && indiceIdioma < IDIOMAS.length - 1) {
        indiceIdioma += 1;
        seguir = true;
        return;
      }
      // El primer intento a veces falla aunque haya internet.
      if (e.error === "network" && reintentosRed < 1) {
        reintentosRed += 1;
        seguir = true;
        return;
      }
      error = e.error;
    };

    r.onend = () => {
      if (cancelado) return;
      if (seguir) {
        seguir = false;
        iniciar();
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

  iniciar();

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
      return "No pude oírte: Chrome necesita internet para entender la voz. Escríbelo aquí.";
    default:
      return "Algo falló con el micrófono. Intenta de nuevo o escríbelo.";
  }
}

/** Errores en los que conviene pasar a escribir en vez de hablar. */
export function errorPideTexto(codigo: string): boolean {
  return ["not-allowed", "service-not-allowed", "audio-capture", "network", "no-soportado", "no-inicio"].includes(codigo);
}
