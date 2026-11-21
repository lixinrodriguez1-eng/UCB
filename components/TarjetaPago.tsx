"use client";

import { useMemo, useState } from "react";
import type { FormaPago } from "@/types/movimiento";
import { deudas, type Deuda } from "@/lib/calculos";
import { buscarDeudor, montoAPagar, type PagoDetectado } from "@/lib/pagos";
import { formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";

interface Props {
  texto: string;
  detectado: PagoDetectado;
  onConfirmar: (cliente: string, monto: number, pago: FormaPago) => void;
  onCancelar: () => void;
}

function aNumero(valor: string): number | undefined {
  const n = Number(valor.replace(",", ".").trim());
  return valor.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** "¿Registro el pago? doña Rosa te pagó Bs 20 · Le quedan Bs 21" */
export default function TarjetaPago({ texto, detectado, onConfirmar, onCancelar }: Props) {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();
  const lista = useMemo(
    () => (movimientos && pagos && ahora ? deudas({ movimientos, pagos, ahora }) : []),
    [movimientos, pagos, ahora],
  );
  const busqueda = useMemo(() => buscarDeudor(detectado.nombre, lista), [detectado.nombre, lista]);

  const [elegido, setElegido] = useState<string | null>(null);
  const [montoTexto, setMontoTexto] = useState("");
  const [todo, setTodo] = useState(detectado.todo);
  const [forma, setForma] = useState<FormaPago>(detectado.pago);

  const deudor: Deuda | undefined = elegido
    ? lista.find((d) => d.cliente === elegido)
    : busqueda.deudor;

  // Monto: lo dicho (con tope en lo que debe) o lo que escriban.
  const montoDicho = deudor ? montoAPagar({ ...detectado, todo }, deudor) : undefined;
  const montoEscrito = aNumero(montoTexto);
  const monto = deudor
    ? todo
      ? deudor.total
      : montoEscrito !== undefined
        ? Math.min(montoEscrito, deudor.total)
        : montoDicho
    : undefined;
  const pidioDeMas =
    deudor && !todo && (montoEscrito ?? detectado.monto ?? 0) > deudor.total;
  const quedan = deudor && monto !== undefined ? Math.round((deudor.total - monto) * 100) / 100 : undefined;
  const pedirMonto = deudor && !todo && detectado.monto === undefined;

  const opciones = busqueda.candidatos.length > 0 ? busqueda.candidatos : lista;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-pago"
    >
      <form
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-t-4 border-tinta bg-crema p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (deudor && monto !== undefined) onConfirmar(deudor.cliente, monto, forma);
        }}
      >
        <p className="mb-1 text-base italic text-tinta-suave">Escuché: “{texto}”</p>
        <h2 id="titulo-pago" className="text-3xl font-black">
          💵 ¿Registro el pago?
        </h2>

        {lista.length === 0 ? (
          <p className="mt-3 text-xl">Ahora nadie te debe, así que no hay pago que registrar.</p>
        ) : (
          <>
            {deudor && (
              <p className="mt-2 text-2xl leading-snug" aria-live="polite">
                <strong>{deudor.cliente}</strong> te pagó{" "}
                <strong>{monto !== undefined ? formatearBs(monto) : "…"}</strong>
                {quedan !== undefined && (
                  <>
                    {" · "}
                    {quedan <= 0 ? "ya no te debe nada 🎉" : `le quedan ${formatearBs(quedan)}`}
                  </>
                )}
              </p>
            )}
            {deudor && (
              <p className="mt-1 text-base text-tinta-suave">Te debía {formatearBs(deudor.total)}.</p>
            )}
            {pidioDeMas && (
              <p className="mt-2 rounded-xl bg-amarillo-claro px-3 py-2 text-base font-semibold">
                Es más de lo que te debe: registro solo {formatearBs(deudor!.total)}.
              </p>
            )}

            {/* ¿Quién? Si no se entendió el nombre o hay varias personas parecidas. */}
            {!deudor && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-lg font-bold">
                  {detectado.nombre && busqueda.candidatos.length === 0
                    ? `No encuentro a “${detectado.nombre}” entre los que te deben. ¿Quién te pagó?`
                    : "¿Quién te pagó?"}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {opciones.map((d) => (
                    <button
                      key={d.cliente}
                      type="button"
                      onClick={() => setElegido(d.cliente)}
                      className="flex justify-between rounded-2xl border-4 border-tinta bg-white px-4 py-3 text-left text-lg font-bold active:scale-95"
                    >
                      <span>{d.cliente}</span>
                      <span>{formatearBs(d.total)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* ¿Cuánto? Si no se dijo el monto. */}
            {pedirMonto && (
              <div className="mt-4">
                <span className="mb-2 block text-lg font-bold">¿Cuánto te pagó?</span>
                <div className="flex gap-2">
                  <input
                    value={montoTexto}
                    onChange={(e) => setMontoTexto(e.target.value)}
                    inputMode="decimal"
                    placeholder="ej. 20"
                    aria-label="Monto pagado en bolivianos"
                    autoFocus
                    className="w-1/2 rounded-2xl border-4 border-tinta bg-white px-4 py-3 text-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => setTodo(true)}
                    className="flex-1 rounded-2xl border-4 border-tinta bg-verde-claro px-3 text-lg font-extrabold"
                  >
                    Todo ({formatearBs(deudor!.total)})
                  </button>
                </div>
              </div>
            )}

            {deudor && (
              <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Forma de pago">
                {(["efectivo", "qr"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={forma === f}
                    onClick={() => setForma(f)}
                    className={`rounded-full border-4 px-4 py-1.5 text-base font-bold ${
                      forma === f ? "border-tinta bg-tinta text-crema" : "border-tinta/30 bg-white"
                    }`}
                  >
                    {f === "qr" ? "QR" : "Efectivo"}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={!deudor || monto === undefined}
            className="rounded-2xl border-4 border-tinta bg-verde py-5 text-2xl font-extrabold text-white active:scale-95 disabled:border-tinta/20 disabled:bg-crema-oscura disabled:text-tinta-suave"
          >
            ✅ Sí
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-2xl border-4 border-tinta bg-rojo-claro py-5 text-2xl font-extrabold text-tinta active:scale-95"
          >
            ❌ No
          </button>
        </div>
      </form>
    </div>
  );
}
