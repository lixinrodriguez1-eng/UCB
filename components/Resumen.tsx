"use client";

import { useMemo, type ReactNode } from "react";
import { deudas, gananciaDelDia, ventasDelDia } from "@/lib/calculos";
import { formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";

function Icono({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/80 text-[#6b4a2e]" aria-hidden="true">
      {children}
    </span>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  icono,
  clase,
  onClick,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: ReactNode;
  clase: string;
  onClick?: () => void;
}) {
  const cuerpo = (
    <>
      <Icono>{icono}</Icono>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold leading-tight">{etiqueta}</span>
        {detalle && <span className="mt-0.5 block text-sm font-semibold text-[#8a6a4a]">{detalle}</span>}
      </span>
      <span className="text-2xl font-black leading-none tracking-tight">{valor}</span>
    </>
  );
  const claseTarjeta = `flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(90,50,10,0.05)] ${clase}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${claseTarjeta} active:scale-[0.99]`}>
        {cuerpo}
      </button>
    );
  }
  return <div className={claseTarjeta}>{cuerpo}</div>;
}

/** Las tres tarjetas del día: vendido, ganancia y fiados. */
export default function Resumen({ onVendiste, onDeben }: { onVendiste?: () => void; onDeben?: () => void } = {}) {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();

  const datos = useMemo(() => {
    if (!movimientos || !pagos || !ahora) return null;
    const op = { movimientos, pagos, ahora };
    const ventasHoy = movimientos.filter(
      (m) => (m.tipo === "venta" || m.tipo === "fiado") && !m.soloDeuda && new Date(m.fecha).toDateString() === ahora.toDateString(),
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
    return <div className="grid min-h-52 gap-2.5" aria-hidden="true" />;
  }

  const { ganancia } = datos;
  const pierde = ganancia.ganancia < 0;
  const sinCosto = ganancia.productosSinCosto;

  return (
    <section aria-label="Resumen de hoy" className="grid gap-2.5">
      <Tarjeta
        icono={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 10h14l-1.4 9H6.4L5 10z" strokeLinejoin="round" />
            <path d="M8.5 10c0-2.8 1.6-5 3.5-5s3.5 2.2 3.5 5" strokeLinecap="round" />
            <path d="M9 14h6" strokeLinecap="round" />
          </svg>
        }
        etiqueta="Hoy vendiste"
        valor={formatearBs(datos.vendido)}
        detalle={
          datos.ventasHoy === 0
            ? "Todavía nada hoy"
            : `${datos.ventasHoy} ${datos.ventasHoy === 1 ? "venta" : "ventas"}`
        }
        clase="bg-[#fff3c9]"
        onClick={onVendiste}
      />
      <Tarjeta
        icono={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7.5v9M9.2 9.6c.6-.8 1.6-1.2 2.8-1.2 1.6 0 2.6.8 2.6 1.9 0 2.4-5.4 1.3-5.4 3.6 0 1.1 1 1.9 2.7 1.9 1.2 0 2.2-.5 2.8-1.3" strokeLinecap="round" />
          </svg>
        }
        etiqueta={pierde ? "Hoy perdiste" : "Hoy ganaste"}
        valor={formatearBs(Math.abs(ganancia.ganancia))}
        detalle={
          sinCosto.length
            ? `Sin contar ${sinCosto.join(", ")} (falta la compra)`
            : pierde
              ? "Revisa tus precios"
              : undefined
        }
        clase={pierde ? "bg-[#fcd9d3]" : "bg-[#e5f6d8]"}
      />
      <Tarjeta
        icono={
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 4.5h11.5V20H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
            <path d="M9 9h6M9 12.5h6M9 16h4" strokeLinecap="round" />
          </svg>
        }
        etiqueta="Te deben"
        valor={formatearBs(datos.deuda)}
        detalle={
          datos.deudores === 0
            ? "Nadie tiene apuntado"
            : `${datos.deudores} ${datos.deudores === 1 ? "persona" : "personas"}`
        }
        clase="bg-[#fde7d4]"
        onClick={onDeben}
      />
    </section>
  );
}
