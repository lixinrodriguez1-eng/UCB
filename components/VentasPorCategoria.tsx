"use client";

import { Suspense, useSyncExternalStore } from "react";
import { ventasPorCategoria } from "@/lib/calculos";
import { obtenerMovimientosEnCache, obtenerPagosEnCache, suscribirMovimientos } from "@/lib/storage";
import { formatearBs } from "@/lib/formato";

const vacioM: [] = [];
const vacioP: [] = [];
const servidorM = () => vacioM;
const servidorP = () => vacioP;

function ContenidoVentasPorCategoria() {
  const movimientos = useSyncExternalStore(suscribirMovimientos, obtenerMovimientosEnCache, servidorM);
  const pagos = useSyncExternalStore(suscribirMovimientos, obtenerPagosEnCache, servidorP);
  const categorias = ventasPorCategoria({ movimientos, pagos, ahora: new Date() });

  if (categorias.length === 0) return null;

  return (
    <section aria-labelledby="titulo-cat" className="rounded-3xl border-4 border-tinta bg-white p-4">
      <h2 id="titulo-cat" className="text-xl font-extrabold">Ventas por categoría</h2>
      <div className="mt-3 space-y-2">
        {categorias.map((c) => (
          <div key={c.categoria} className="flex items-center justify-between text-base font-semibold">
            <span>{c.icono} {c.nombre}</span>
            <span>{formatearBs(c.total)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function VentasPorCategoria() {
  return (
    <Suspense fallback={null}>
      <ContenidoVentasPorCategoria />
    </Suspense>
  );
}
