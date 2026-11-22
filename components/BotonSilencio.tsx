"use client";

import { useSyncExternalStore } from "react";
import { estaSilenciado, hablaSoportada, hablar, silenciar, suscribirSilencio } from "@/lib/habla";

const sinSuscripcion = () => () => {};
const EN_SERVIDOR = null;
const enServidor = () => EN_SERVIDOR;

/** Prende o apaga las respuestas habladas. Se recuerda en este celular. */
export default function BotonSilencio({ compacto = false }: { compacto?: boolean }) {
  const soportada = useSyncExternalStore(sinSuscripcion, hablaSoportada, enServidor);
  const silenciado = useSyncExternalStore(suscribirSilencio, estaSilenciado, enServidor);

  if (!soportada || silenciado === null) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (silenciado) {
          silenciar(false);
          hablar("Listo. El sonido ya está.");
        } else {
          silenciar(true);
        }
      }}
      aria-pressed={silenciado}
      aria-label={silenciado ? "Activar el sonido" : "Silenciar las respuestas"}
      className={
        compacto
          ? `inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1.5 text-xs font-bold shadow-sm ${
              silenciado ? "border-rojo text-rojo" : "border-[#eadfce] text-[#3d2b1f]"
            }`
          : `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-4 px-4 py-2 text-base font-extrabold active:scale-95 sm:text-lg ${
              silenciado ? "border-tinta/30 bg-crema-oscura text-tinta-suave" : "border-tinta bg-verde-claro text-tinta"
            }`
      }
    >
      <span aria-hidden="true">{silenciado ? "🔇" : "🔊"}</span>
      {silenciado ? "Activar sonido" : "Sonido"}
    </button>
  );
}
