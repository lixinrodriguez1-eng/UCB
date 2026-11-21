"use client";

import { useState } from "react";
import type { TipoMovimiento } from "@/types/movimiento";
import type { CampoParseado, NombreCampo, ResultadoParseo } from "@/lib/parser";
import { etiquetaTipo, resumirMovimiento } from "@/lib/formato";
import { vocabularioPorDefecto } from "@/lib/vocabulario";

interface Props {
  /** Lo que se escuchó o escribió. */
  texto: string;
  resultado: ResultadoParseo;
  onConfirmar: (datos: CampoParseado) => void;
  onCancelar: () => void;
}

const TIPOS: TipoMovimiento[] = ["venta", "compra", "fiado"];

function aNumero(valor: string): number | undefined {
  const n = Number(valor.replace(",", ".").trim());
  return valor.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

const claseInput =
  "w-full rounded-2xl border-4 border-tinta bg-white px-4 py-3 text-2xl placeholder:text-tinta-suave/60 focus:border-verde focus:outline-none";

export default function TarjetaConfirmacion({ texto, resultado, onConfirmar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento | undefined>(resultado.tipo);
  const [producto, setProducto] = useState(resultado.producto ?? "");
  const [cantidad, setCantidad] = useState(resultado.cantidad?.toString() ?? "");
  const [unidad, setUnidad] = useState(resultado.unidad ?? "kilo");
  const [total, setTotal] = useState(resultado.total?.toString() ?? "");
  const [cliente, setCliente] = useState(resultado.cliente ?? "");

  // Solo se piden los campos que faltaron. El cliente aparece también si
  // recién eligen "fiado" y la frase no traía nombre.
  const falta = (campo: NombreCampo) => resultado.faltantes.includes(campo);
  const pedirCliente = falta("cliente") || (tipo === "fiado" && !resultado.cliente);
  const pidiendoAlgo =
    falta("tipo") || falta("producto") || falta("cantidad") || falta("unidad") ||
    falta("total") || pedirCliente;

  const datos: Partial<CampoParseado> = {
    tipo,
    producto: producto.trim() || undefined,
    cantidad: aNumero(cantidad),
    unidad: unidad || undefined,
    total: aNumero(total),
    cliente: cliente.trim() || undefined,
    pago: resultado.pago ?? "efectivo",
  };

  const completo =
    datos.tipo !== undefined &&
    datos.producto !== undefined &&
    datos.cantidad !== undefined &&
    datos.unidad !== undefined &&
    datos.total !== undefined &&
    (datos.tipo !== "fiado" || datos.cliente !== undefined);

  const confirmar = () => {
    if (completo) onConfirmar(datos as CampoParseado);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-confirmacion"
    >
      <form
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-t-4 border-tinta bg-crema p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          confirmar();
        }}
      >
        <p className="mb-1 text-base italic text-tinta-suave">Escuché: “{texto}”</p>
        <h2 id="titulo-confirmacion" className="text-3xl font-black">
          ¿Registro?
        </h2>
        <p className="mt-2 text-2xl font-semibold leading-snug" aria-live="polite">
          {resumirMovimiento(datos) || "No entendí bien, ayúdame con los datos"}
        </p>

        {pidiendoAlgo && (
          <div className="mt-6 space-y-5">
            <p className="inline-block rounded-xl bg-amarillo-claro px-3 py-1 text-lg font-extrabold">Me falta saber:</p>

            {falta("tipo") && (
              <fieldset>
                <legend className="mb-2 text-lg font-bold">¿Qué fue?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      aria-pressed={tipo === t}
                      className={`rounded-2xl border-4 py-4 text-xl font-extrabold active:scale-95 ${
                        tipo === t ? "border-tinta bg-tinta text-crema" : "border-tinta/30 bg-white"
                      }`}
                    >
                      {etiquetaTipo[t]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {falta("producto") && (
              <label className="block">
                <span className="mb-2 block text-lg font-bold">¿Qué producto?</span>
                <input
                  className={claseInput}
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  placeholder="ej. pollo"
                  list="lista-productos"
                />
                <datalist id="lista-productos">
                  {vocabularioPorDefecto.productos.map((p) => (
                    <option key={p.nombre} value={p.nombre} />
                  ))}
                </datalist>
              </label>
            )}

            {(falta("cantidad") || falta("unidad")) && (
              <div>
                <span className="mb-2 block text-lg font-bold">¿Cuánto?</span>
                <div className="flex gap-2">
                  {falta("cantidad") && (
                    <input
                      className={`${claseInput} w-1/2`}
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      inputMode="decimal"
                      placeholder="ej. 3"
                      aria-label="Cantidad"
                    />
                  )}
                  {falta("unidad") && (
                    <select
                      className={`${claseInput} w-1/2 bg-white`}
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                      aria-label="Unidad"
                    >
                      {vocabularioPorDefecto.unidades.map((u) => (
                        <option key={u.nombre} value={u.nombre}>
                          {u.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {falta("total") && (
              <label className="block">
                <span className="mb-2 block text-lg font-bold">¿Cuánto fue en total? (Bs)</span>
                <input
                  className={claseInput}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  inputMode="decimal"
                  placeholder="ej. 50"
                />
              </label>
            )}

            {pedirCliente && (
              <label className="block">
                <span className="mb-2 block text-lg font-bold">¿Quién se lo llevó?</span>
                <input
                  className={claseInput}
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="ej. doña Rosa"
                />
              </label>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={!completo}
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
