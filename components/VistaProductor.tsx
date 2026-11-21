"use client";

import { useState } from "react";
import type { Pedido } from "@/types/roles";
import { almacenPedidos } from "@/lib/pedidos";
import { MERCADO_EJEMPLO, PRODUCTORES_EJEMPLO, pedidosOtrosMercados, pedidosSimulados } from "@/lib/ejemplos";
import { describirCantidad, formatearBs, formatearNumero, pluralizar } from "@/lib/formato";
import { useAlmacen } from "@/lib/useAlmacen";
import { useAhora } from "@/lib/useMovimientos";
import { CambiarRol } from "@/components/SelectorRol";

const ESTADO = {
  pendiente: { texto: "Pendiente", clase: "bg-amarillo-claro" },
  entregado: { texto: "Entregado", clase: "bg-naranja-claro" },
  cobrado: { texto: "Cobrado", clase: "bg-verde-claro" },
} as const;

export default function VistaProductor() {
  const [productorId, setProductorId] = useState(PRODUCTORES_EJEMPLO[0].id);
  const pedidosReales = useAlmacen(almacenPedidos);
  const ahora = useAhora();
  const productor = PRODUCTORES_EJEMPLO.find((p) => p.id === productorId)!;

  // Cálculo barato: se hace en cada render.
  const porMercado = (() => {
    if (!ahora) return [];
    const suyos = pedidosReales.filter((p) => p.productorId === productorId);
    // Pedidos de otras caseritas del mismo mercado (ejemplo), una vez por mercado.
    const base = suyos[0] ?? { productorId, mercado: MERCADO_EJEMPLO, fecha: ahora.toISOString() };
    const todos: Pedido[] = [...suyos, ...pedidosSimulados(base), ...pedidosOtrosMercados(productorId, ahora)];
    const grupos = new Map<string, Pedido[]>();
    for (const p of todos) grupos.set(p.mercado, [...(grupos.get(p.mercado) ?? []), p]);
    return [...grupos.entries()].map(([mercado, pedidos]) => {
      const totales = new Map<string, { producto: string; unidad: string; cantidad: number }>();
      for (const p of pedidos.filter((x) => x.estado === "pendiente"))
        for (const i of p.items) {
          const fila = totales.get(i.producto) ?? { producto: i.producto, unidad: i.unidad, cantidad: 0 };
          fila.cantidad += i.cantidad;
          totales.set(i.producto, fila);
        }
      return { mercado, pedidos, porEntregar: [...totales.values()], total: pedidos.reduce((s, p) => s + p.total, 0) };
    });
  })();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-naranja sm:text-5xl">🌾 Soy productor</h1>
          <p className="text-lg font-semibold text-tinta-suave">Pedidos de las caseritas, agrupados por mercado</p>
        </div>
        <CambiarRol />
      </header>

      <p className="mb-4 rounded-2xl border-2 border-tinta bg-amarillo-claro px-4 py-2 text-base font-bold">
        ⚠️ Productores, precios y pedidos de otras caseritas son datos de ejemplo.
      </p>

      <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="¿Qué productor eres?">
        {PRODUCTORES_EJEMPLO.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === productorId}
            onClick={() => setProductorId(p.id)}
            className={`rounded-full border-4 px-4 py-2 text-lg font-extrabold ${
              p.id === productorId ? "border-tinta bg-tinta text-crema" : "border-tinta/30 bg-white"
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-3xl border-4 border-tinta bg-white p-5" aria-labelledby="titulo-catalogo">
        <h2 id="titulo-catalogo" className="text-2xl font-extrabold">
          Mis productos <span className="text-base font-semibold text-tinta-suave">· {productor.lugar}</span>
        </h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {productor.productos.map((o) => (
            <li key={o.producto} className="rounded-2xl bg-crema p-3 text-lg">
              <strong>{o.producto}</strong>
              <span className="block">
                {formatearBs(o.precio)} por {o.unidad}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-6">
        {porMercado.map((g) => (
          <section key={g.mercado} className="rounded-3xl border-4 border-tinta bg-white" aria-label={g.mercado}>
            <div className="border-b-4 border-tinta bg-verde-claro px-5 py-4">
              <h2 className="text-2xl font-extrabold">📍 {g.mercado}</h2>
              {g.porEntregar.length > 0 && (
                <p className="text-lg font-bold">
                  Por entregar:{" "}
                  {g.porEntregar
                    .map((t) => `${formatearNumero(t.cantidad)} ${t.cantidad === 1 ? t.unidad : pluralizar(t.unidad)} de ${t.producto}`)
                    .join(" · ")}
                </p>
              )}
            </div>
            <ul className="divide-y-2 divide-crema-oscura">
              {g.pedidos.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold">
                      {p.caserita}
                      {!p.ejemplo && <span className="ml-2 rounded-md bg-azul-claro px-1.5 py-0.5 text-xs font-bold">desde la app</span>}
                    </p>
                    <p className="text-base text-tinta-suave">{p.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-xl font-black">{formatearBs(p.total)}</span>
                    <span className={`inline-block rounded-full border-2 border-tinta px-2 py-0.5 text-sm font-bold ${ESTADO[p.estado].clase}`}>
                      {ESTADO[p.estado].texto}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
