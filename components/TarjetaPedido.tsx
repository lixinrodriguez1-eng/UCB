"use client";

import { useMemo, useState } from "react";
import type { Pedido } from "@/types/roles";
import { compararOfertas, crearPedidos, pedidoGrupal, type ItemPedidoDicho } from "@/lib/pedidos";
import { productorPorId } from "@/lib/ejemplos";
import { describirCantidad, formatearBs, formatearNumero, pluralizar } from "@/lib/formato";
import { hablar } from "@/lib/habla";
import { useAhora, useMovimientos } from "@/lib/useMovimientos";

interface Props {
  texto: string;
  items: ItemPedidoDicho[];
  onCerrar: () => void;
}

const Ejemplo = () => (
  <span className="ml-1 rounded-md bg-amarillo-claro px-1.5 py-0.5 text-xs font-bold align-middle">ejemplo</span>
);

/** Resumen del pedido grupal del mercado (su pedido + otras caseritas de ejemplo). */
export function ResumenGrupal({ pedido }: { pedido: Pedido }) {
  const g = pedidoGrupal(pedido);
  return (
    <div className="rounded-2xl border-4 border-tinta bg-verde-claro p-4">
      <p className="text-lg font-black">🤝 Pedido grupal del {pedido.mercado}</p>
      <p className="text-sm text-tinta-suave">a {productorPorId(pedido.productorId)?.nombre}</p>
      <ul className="mt-2 space-y-1 text-base">
        {g.pedidos.map((p) => (
          <li key={p.id} className="flex justify-between gap-2">
            <span>
              {p.ejemplo ? p.caserita : <strong>{p.caserita} (tú)</strong>}:{" "}
              {p.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")}
            </span>
            <span className="whitespace-nowrap font-bold">{formatearBs(p.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t-2 border-tinta/20 pt-2 text-lg font-extrabold">
        Total del grupo: {g.totales.map((t) => `${formatearNumero(t.cantidad)} ${t.cantidad === 1 ? t.unidad : pluralizar(t.unidad)} de ${t.producto}`).join(" · ")}
      </p>
      {g.ahorroGrupo > 0 && (
        <p className="text-lg font-extrabold text-verde">
          El grupo se ahorra {formatearBs(g.ahorroGrupo)} frente al mayorista
        </p>
      )}
      <p className="mt-1 text-xs text-tinta-suave">Los pedidos de otras caseritas son de ejemplo.</p>
    </div>
  );
}

export default function TarjetaPedido({ texto, items, onCerrar }: Props) {
  const movimientos = useMovimientos();
  const ahora = useAhora();
  const comparaciones = useMemo(
    () => items.map((item) => ({ item, ofertas: compararOfertas(item, { movimientos: movimientos ?? [], ahora: ahora ?? new Date() }) })),
    [items, movimientos, ahora],
  );
  // Por defecto, el más barato de cada producto.
  const [elegidos, setElegidos] = useState<string[]>(() => comparaciones.map((c) => c.ofertas[0]?.productor.id ?? ""));
  const [creados, setCreados] = useState<Pedido[] | null>(null);

  const hacerPedido = () => {
    const elecciones = comparaciones
      .map((c, i) => ({ productorId: elegidos[i], item: c.item }))
      .filter((e) => e.productorId);
    const nuevos = crearPedidos(elecciones);
    setCreados(nuevos);
    const nombres = nuevos.map((p) => productorPorId(p.productorId)?.nombre).join(" y ");
    hablar(`Listo, caserita. Tu pedido a ${nombres} quedó pendiente y se sumó al pedido grupal del mercado.`);
  };

  const hayAlgo = elegidos.some(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="titulo-pedido">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t-4 border-tinta bg-crema p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <p className="mb-1 text-base italic text-tinta-suave">Escuché: “{texto}”</p>
        <h2 id="titulo-pedido" className="text-3xl font-black">
          🌾 {creados ? "Pedido hecho" : "Pedido a productores"}
        </h2>

        {creados ? (
          <div className="mt-4 space-y-4">
            {creados.map((p) => (
              <ResumenGrupal key={p.id} pedido={p} />
            ))}
            <p className="text-base text-tinta-suave">
              Cuando llegue, toca “Recibí la mercadería” en <strong>Mis pedidos</strong>: la compra se registra sola con este costo.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {comparaciones.map(({ item, ofertas }, i) => (
              <fieldset key={`${item.producto}-${i}`}>
                <legend className="mb-2 text-xl font-extrabold">{describirCantidad(item.cantidad, item.unidad, item.producto)}</legend>
                {ofertas.length === 0 ? (
                  <p className="rounded-xl bg-white p-3 text-base">Ningún productor de ejemplo tiene {item.producto}.</p>
                ) : (
                  <div className="space-y-2">
                    {ofertas.map((o, j) => {
                      const activo = elegidos[i] === o.productor.id;
                      return (
                        <button
                          key={o.productor.id}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => setElegidos((e) => e.map((x, k) => (k === i ? o.productor.id : x)))}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border-4 p-3 text-left ${
                            activo ? "border-tinta bg-white shadow-[0_4px_0_0_var(--tinta)]" : "border-tinta/25 bg-white/60"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-lg font-extrabold">
                              {j === 0 && "🥇 "}
                              {o.productor.nombre}
                              <Ejemplo />
                            </span>
                            <span className="block text-base text-tinta-suave">
                              {formatearBs(o.oferta.precio)} por {o.oferta.unidad}
                              {o.oferta.equivale && ` (≈ ${formatearNumero(o.oferta.equivale.cantidad)} ${o.oferta.equivale.unidad}s)`}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xl font-black">{formatearBs(o.costo)}</span>
                            {o.teDeja !== null && (
                              <span className={`block text-base font-extrabold ${o.teDeja >= 0 ? "text-verde" : "text-rojo"}`}>
                                {o.teDeja >= 0 ? `te deja ${formatearBs(o.teDeja)}` : `pierdes ${formatearBs(-o.teDeja)}`}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                    {ofertas[0]?.precioVenta && (
                      <p className="text-sm text-tinta-suave">
                        “Te deja” = vendiendo a {formatearBs(ofertas[0].precioVenta.valor)} el {ofertas[0].precioVenta.unidad} (
                        {ofertas[0].precioVenta.fuente}).
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          {creados ? (
            <button
              type="button"
              onClick={onCerrar}
              className="col-span-2 rounded-2xl border-4 border-tinta bg-verde py-5 text-2xl font-extrabold text-white active:scale-95"
            >
              Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={hacerPedido}
                disabled={!hayAlgo}
                className="rounded-2xl border-4 border-tinta bg-verde py-5 text-2xl font-extrabold text-white active:scale-95 disabled:border-tinta/20 disabled:bg-crema-oscura disabled:text-tinta-suave"
              >
                ✅ Pedir
              </button>
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-2xl border-4 border-tinta bg-rojo-claro py-5 text-2xl font-extrabold text-tinta active:scale-95"
              >
                ❌ No
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
