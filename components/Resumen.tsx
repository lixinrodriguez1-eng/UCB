"use client";

import { useMemo } from "react";
import { deudas, gananciaDelDia, ventasDelDia } from "@/lib/calculos";
import { formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  icono,
  clase,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: string;
  clase: string;
}) {
  return (
    // Celular: fila compacta (etiqueta a la izquierda, monto a la derecha).
    // Pantalla más ancha: tarjeta alta con el monto grande abajo.
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-3xl border-4 border-tinta p-4 shadow-[0_6px_0_0_var(--tinta)] sm:block sm:p-5 ${clase}`}
    >
      <p className="flex items-center gap-2 whitespace-nowrap text-lg font-extrabold sm:text-xl">
        <span aria-hidden="true" className="text-2xl">
          {icono}
        </span>
        {etiqueta}
      </p>
      <p className="row-span-2 text-right text-3xl font-black min-[400px]:text-4xl leading-none tracking-tight sm:mt-2 sm:text-left sm:text-5xl">
        {valor}
      </p>
      {detalle && <p className="text-sm font-semibold text-tinta-suave sm:mt-3 sm:text-base">{detalle}</p>}
    </div>
  );
}

/** Las tres tarjetas grandes de arriba. */
export default function Resumen() {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();

  const datos = useMemo(() => {
    if (!movimientos || !pagos || !ahora) return null;
    const op = { movimientos, pagos, ahora };
    const ventasHoy = movimientos.filter(
      (m) => (m.tipo === "venta" || m.tipo === "fiado") && new Date(m.fecha).toDateString() === ahora.toDateString(),
    ).length;
    const lista = deudas(op);
    return {
      vendido: ventasDelDia(op),
      ventasHoy,
      ganancia: gananciaDelDia(op),
      deuda: lista.reduce((s, d) => s + d.total, 0),
      deudores: lista.length,
    };
  }, [movimientos, pagos, ahora]);

  if (!datos) {
    // Mismo alto que las tarjetas para que la página no salte al cargar.
    return <div className="grid min-h-44 gap-4 sm:grid-cols-3" aria-hidden="true" />;
  }

  const { ganancia } = datos;
  const pierde = ganancia.ganancia < 0;
  const sinCosto = ganancia.productosSinCosto;

  return (
    <section aria-label="Resumen de hoy" className="grid gap-4 sm:grid-cols-3">
      <Tarjeta
        icono="🧺"
        etiqueta="Hoy vendiste"
        valor={formatearBs(datos.vendido)}
        detalle={
          datos.ventasHoy === 0
            ? "Todavía nada hoy"
            : `${datos.ventasHoy} ${datos.ventasHoy === 1 ? "venta" : "ventas"}`
        }
        clase="bg-amarillo-claro"
      />
      <Tarjeta
        icono={pierde ? "📉" : "💰"}
        etiqueta={pierde ? "Hoy perdiste" : "Hoy ganaste"}
        valor={formatearBs(Math.abs(ganancia.ganancia))}
        detalle={
          sinCosto.length
            ? `Sin contar ${sinCosto.join(", ")} (falta la compra)`
            : pierde
              ? "Revisa tus precios"
              : undefined
        }
        clase={pierde ? "bg-rojo-claro" : "bg-verde-claro"}
      />
      <Tarjeta
        icono="📒"
        etiqueta="Te deben"
        valor={formatearBs(datos.deuda)}
        detalle={
          datos.deudores === 0
            ? "Nadie tiene apuntado"
            : `${datos.deudores} ${datos.deudores === 1 ? "persona" : "personas"}`
        }
        clase="bg-naranja-claro"
      />
    </section>
  );
}
