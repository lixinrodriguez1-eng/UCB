"use client";

import type { AlertaMargen } from "@/lib/calculos";
import { fuenteReferencia, textoReferencia } from "@/lib/respuestas";
import { formatearBs } from "@/lib/formato";

/** El texto de referencia con el monto en una sola línea ("Bs 20,50" no se parte). */
function TextoReferencia({ texto, monto }: { texto: string; monto: string }) {
  const [antes, despues] = texto.split(monto);
  if (despues === undefined) return <>{texto}</>;
  return (
    <>
      {antes}
      <span className="whitespace-nowrap">{monto}</span>
      {despues}
    </>
  );
}

interface Props {
  alerta: AlertaMargen;
  onCerrar: () => void;
}

const estilos = {
  perdida: {
    fondo: "bg-rose-600 text-white",
    icono: "🚨",
    etiqueta: "¡Estás perdiendo plata!",
    boton: "bg-white text-rose-700",
    caja: "bg-rose-700/60",
  },
  "margen-bajo": {
    fondo: "bg-amber-300 text-amber-950",
    icono: "⚠️",
    etiqueta: "Cuidado: casi no ganas",
    boton: "bg-amber-950 text-white",
    caja: "bg-amber-200",
  },
} as const;

export default function TarjetaAlerta({ alerta, onCerrar }: Props) {
  const e = estilos[alerta.nivel];
  const ref = alerta.referencia;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-alerta"
      aria-describedby="detalle-alerta"
    >
      <div
        className={`w-full max-w-xl rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl ${e.fondo}`}
      >
        <p className="text-lg font-semibold uppercase tracking-wide">
          {e.icono} {e.etiqueta}
        </p>
        <h2 id="titulo-alerta" className="mt-2 text-3xl font-bold leading-tight">
          {alerta.titulo}
        </h2>
        <p id="detalle-alerta" className="mt-3 text-xl">
          {alerta.detalle}
        </p>

        {ref && (
          <div className={`mt-4 rounded-2xl p-4 text-lg ${e.caja}`}>
            <strong>
              <TextoReferencia texto={textoReferencia(ref)} monto={formatearBs(ref.precio)} />
            </strong>
            <span className="mt-1 block text-base opacity-90">
              {fuenteReferencia(ref)}
              {ref.url && (
                <>
                  {" · "}
                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="underline">
                    ver nota
                  </a>
                </>
              )}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onCerrar}
          autoFocus
          className={`mt-6 w-full rounded-2xl py-5 text-2xl font-bold active:scale-95 ${e.boton}`}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
