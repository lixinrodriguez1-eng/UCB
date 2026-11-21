"use client";

import { useSyncExternalStore } from "react";
import type { Respuesta } from "@/lib/respuestas";
import { estaSilenciado, hablaSoportada, suscribirSilencio } from "@/lib/habla";

interface Props {
  pregunta: string;
  respuesta: Respuesta;
  onRepetir: () => void;
  onCerrar: () => void;
}

const SILENCIO_EN_SERVIDOR = true;
const silencioEnServidor = () => SILENCIO_EN_SERVIDOR;

export default function TarjetaRespuesta({ pregunta, respuesta, onRepetir, onCerrar }: Props) {
  const silenciado = useSyncExternalStore(suscribirSilencio, estaSilenciado, silencioEnServidor);
  const puedeHablar = hablaSoportada() && !silenciado;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-respuesta"
    >
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-sky-50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <p className="text-base italic text-zinc-500">Preguntaste: “{pregunta}”</p>
        <h2 id="titulo-respuesta" className="mt-2 text-3xl font-bold leading-tight text-sky-950">
          {respuesta.titulo}
        </h2>

        {respuesta.lineas.length > 0 && (
          <ul className="mt-4 space-y-2 text-xl">
            {respuesta.lineas.map((linea) => (
              <li key={linea} className="rounded-2xl bg-white px-4 py-3">
                {linea}
              </li>
            ))}
          </ul>
        )}

        {respuesta.nota && <p className="mt-3 text-base text-zinc-600">{respuesta.nota}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            autoFocus
            className="flex-1 rounded-2xl bg-sky-700 py-5 text-2xl font-bold text-white active:scale-95"
          >
            Listo
          </button>
          {puedeHablar && (
            <button
              type="button"
              onClick={onRepetir}
              className="rounded-2xl border-2 border-sky-700 px-5 text-xl font-semibold text-sky-800 active:scale-95"
            >
              🔊 Repetir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
