"use client";

import { useState } from "react";
import type { Movimiento, Pago } from "@/types/movimiento";
import { describirCantidad, formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";
import FotoProducto from "@/components/FotoProducto";

const ESTILO_TIPO: Record<Movimiento["tipo"], { icono: string; etiqueta: string }> = {
  venta: { icono: "🟢", etiqueta: "Venta" },
  compra: { icono: "🔵", etiqueta: "Compra" },
  fiado: { icono: "🟡", etiqueta: "Apuntado" },
};

const formatoHora = new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit" });
const formatoDia = new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long" });

function nombreDelDia(fecha: Date, ahora: Date): string {
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diferencia = Math.round((dia(ahora) - dia(fecha)) / 86_400_000);
  const largo = formatoDia.format(fecha);
  if (diferencia === 0) return `Hoy · ${largo}`;
  if (diferencia === 1) return `Ayer · ${largo}`;
  return largo.charAt(0).toUpperCase() + largo.slice(1);
}

/** Cuántos movimientos mostrar antes de "Ver más". */
const POR_PAGINA = 15;

/** Un renglón de la lista: un movimiento o un pago de apuntado. */
type Renglon = { clase: "movimiento"; m: Movimiento } | { clase: "pago"; p: Pago };
const fechaDe = (r: Renglon) => (r.clase === "movimiento" ? r.m.fecha : r.p.fecha);

function FilaMovimiento({ m }: { m: Movimiento }) {
  const estilo = ESTILO_TIPO[m.tipo];
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {/* Foto del producto con el color del tipo (🟢 venta, 🔵 compra, 🟡 apuntado) en la esquina */}
      <span className="relative shrink-0" aria-hidden="true">
        {m.producto === "deuda" ? (
          <span className="flex h-12 w-12 items-center justify-center text-3xl">{estilo.icono}</span>
        ) : (
          <>
            <FotoProducto producto={m.producto} tamano={48} />
            <span className="absolute -bottom-1.5 -right-1.5 text-base leading-none">{estilo.icono}</span>
          </>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold leading-snug">
          <span className="sr-only">{estilo.etiqueta}: </span>
          {describirCantidad(m.cantidad, m.unidad, m.producto)}
        </p>
        <p className="text-base text-tinta-suave">
          {estilo.etiqueta} · {formatoHora.format(new Date(m.fecha))}
          {m.cliente ? ` · ${m.cliente}` : ""}
          {m.pago === "qr" ? " · QR" : ""}
        </p>
      </div>
      <span className="shrink-0 text-xl font-black">{formatearBs(m.total)}</span>
    </li>
  );
}

function FilaPago({ p }: { p: Pago }) {
  return (
    <li className="flex items-center gap-3 bg-verde-claro/50 px-4 py-3">
      <span className="text-3xl leading-none" aria-hidden="true">
        💵
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold leading-snug">Pagó {p.cliente}</p>
        <p className="text-base text-tinta-suave">
          Pago de apuntado · {formatoHora.format(new Date(p.fecha))}
          {p.pago === "qr" ? " · QR" : ""}
        </p>
      </div>
      <span className="shrink-0 text-xl font-black">{formatearBs(p.monto)}</span>
    </li>
  );
}

export default function ListaMovimientos() {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();
  const [visibles, setVisibles] = useState(POR_PAGINA);

  if (movimientos === null || pagos === null || ahora === null) return null;

  const renglones: Renglon[] = [
    ...movimientos.map((m) => ({ clase: "movimiento" as const, m })),
    ...pagos.map((p) => ({ clase: "pago" as const, p })),
  ].sort((a, b) => fechaDe(b).localeCompare(fechaDe(a)));

  if (renglones.length === 0) {
    return (
      <p className="rounded-3xl border-4 border-dashed border-tinta/30 p-8 text-center text-xl text-tinta-suave">
        Todavía no hay movimientos.
        <br />
        Toca el micrófono y dime qué vendiste o compraste.
      </p>
    );
  }

  // Agrupar por día, del más reciente al más antiguo.
  const grupos: { titulo: string; items: Renglon[] }[] = [];
  for (const r of renglones.slice(0, visibles)) {
    const titulo = nombreDelDia(new Date(fechaDe(r)), ahora);
    const ultimo = grupos.at(-1);
    if (ultimo?.titulo === titulo) ultimo.items.push(r);
    else grupos.push({ titulo, items: [r] });
  }

  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <section key={g.titulo} aria-label={g.titulo}>
          <h3 className="mb-2 text-lg font-extrabold text-tinta-suave">{g.titulo}</h3>
          <ul className="divide-y-2 divide-crema-oscura overflow-hidden rounded-3xl border-4 border-tinta bg-white">
            {g.items.map((r) =>
              r.clase === "movimiento" ? <FilaMovimiento key={r.m.id} m={r.m} /> : <FilaPago key={r.p.id} p={r.p} />,
            )}
          </ul>
        </section>
      ))}

      {renglones.length > visibles && (
        <button
          type="button"
          onClick={() => setVisibles((v) => v + POR_PAGINA)}
          className="w-full rounded-2xl border-4 border-tinta bg-white py-3 text-lg font-bold active:scale-95"
        >
          Ver más ({renglones.length - visibles} restantes)
        </button>
      )}
    </div>
  );
}
