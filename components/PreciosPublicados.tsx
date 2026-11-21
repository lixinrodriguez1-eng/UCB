"use client";

import { useMemo } from "react";
import { almacenPublicados, cambiarPublicado, productosPublicables } from "@/lib/familia";
import { formatearBs } from "@/lib/formato";
import { useAlmacen } from "@/lib/useAlmacen";
import { useAhora, useMovimientos } from "@/lib/useMovimientos";

/** "Mis precios para familias": interruptor "Publicar precio" por producto. */
export default function PreciosPublicados() {
  const movimientos = useMovimientos();
  const publicados = useAlmacen(almacenPublicados);
  const ahora = useAhora();
  const lista = useMemo(
    () => (movimientos && ahora ? productosPublicables(movimientos, publicados, { ahora }) : []),
    [movimientos, publicados, ahora],
  );

  return (
    <section aria-labelledby="titulo-publicar" className="rounded-3xl border-4 border-tinta bg-white">
      <div className="border-b-4 border-tinta bg-amarillo-claro px-5 py-4">
        <h2 id="titulo-publicar" className="text-2xl font-extrabold">
          🏷️ Mis precios para familias
        </h2>
        <p className="text-base">Lo que publicas lo ven las familias en “Soy familia”.</p>
      </div>
      {lista.length === 0 ? (
        <p className="p-5 text-lg text-tinta-suave">Cuando registres ventas, aquí aparecen tus productos con su precio.</p>
      ) : (
        <ul className="divide-y-2 divide-crema-oscura">
          {lista.map((p) => (
            <li key={p.producto} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0 text-lg">
                <strong>{p.producto}</strong> · {formatearBs(p.precio)} {p.unidad === "unidad" ? "c/u" : `el ${p.unidad}`}
              </span>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-base font-bold">
                <span>Publicar precio</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.publicado}
                  onChange={(e) => cambiarPublicado(p, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-7 w-12 rounded-full border-2 border-tinta bg-crema-oscura transition peer-checked:bg-verde peer-focus-visible:ring-4 peer-focus-visible:ring-azul/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border-2 after:border-tinta after:bg-white after:transition peer-checked:after:translate-x-5"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
