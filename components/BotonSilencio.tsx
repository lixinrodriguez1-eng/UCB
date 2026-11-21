"use client";

import { useSyncExternalStore } from "react";
import { estaSilenciado, hablaSoportada, silenciar, suscribirSilencio } from "@/lib/habla";

const sinSuscripcion = () => () => {};
const enServidor = () => null;

/** Prende o apaga las respuestas habladas. Se recuerda en este celular. */
export default function BotonSilencio() {
  const soportada = useSyncExternalStore(sinSuscripcion, hablaSoportada, enServidor);
  const silenciado = useSyncExternalStore(suscribirSilencio, estaSilenciado, enServidor);

  if (!soportada || silenciado === null) return null;

  return (
    <button
      type="button"
      onClick={() => silenciar(!silenciado)}
      aria-pressed={silenciado}
      aria-label={silenciado ? "Activar la voz" : "Silenciar la voz"}
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-4 px-4 py-2 text-base font-extrabold active:scale-95 sm:text-lg ${
        silenciado ? "border-tinta/30 bg-crema-oscura text-tinta-suave" : "border-tinta bg-verde-claro text-tinta"
      }`}
    >
      <span aria-hidden="true">{silenciado ? "🔇" : "🔊"}</span>
      {silenciado ? "Sin voz" : "Con voz"}
    </button>
  );
}
