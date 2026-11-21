"use client";

import { useState } from "react";
import { almacenReservas, entregarReserva, reservasDeHoy } from "@/lib/familia";
import { describirCantidad, formatearBs } from "@/lib/formato";
import { hablar } from "@/lib/habla";
import { pesosHablados } from "@/lib/respuestas";
import { useAlmacen } from "@/lib/useAlmacen";
import { useAhora } from "@/lib/useMovimientos";
import EstrellasCaserita from "@/components/EstrellasCaserita";

const PAGO = { qr: "QR", efectivo: "Efectivo", fiado: "Fiado (apuntado)" } as const;

/** "Reservas de hoy": lo que las familias reservaron en el puesto de la caserita. */
export default function ReservasHoy() {
  const reservas = useAlmacen(almacenReservas);
  const ahora = useAhora();
  const [aviso, setAviso] = useState<string | null>(null);
  const hoy = ahora ? reservasDeHoy(reservas, ahora) : [];

  const entregar = (id: string) => {
    const r = reservas.find((x) => x.id === id);
    entregarReserva(id);
    if (!r) return;
    const fiado = r.pago === "fiado";
    setAviso(
      fiado
        ? `✅ Entregado. ${r.familia} te debe ${formatearBs(r.total)}: está en Me deben.`
        : `✅ Venta registrada: ${formatearBs(r.total)} de ${r.familia}.`,
    );
    hablar(
      fiado
        ? `Listo, entregado. ${r.familia} te debe ${pesosHablados(r.total)}.`
        : `Listo, venta registrada: ${pesosHablados(r.total)}.`,
    );
  };

  return (
    <section aria-labelledby="titulo-reservas" className="rounded-3xl border-4 border-tinta bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-tinta bg-azul-claro px-5 py-4">
        <h2 id="titulo-reservas" className="text-2xl font-extrabold">
          🛍️ Reservas de hoy
        </h2>
        <EstrellasCaserita />
      </div>
      {aviso && (
        <p className="border-b-2 border-crema-oscura bg-verde-claro px-5 py-3 text-lg font-bold" aria-live="polite">
          {aviso}
        </p>
      )}
      {hoy.length === 0 ? (
        <p className="p-5 text-lg text-tinta-suave">Todavía no hay reservas. Las familias ven los precios que publicas.</p>
      ) : (
        <ul className="divide-y-2 divide-crema-oscura">
          {hoy.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-extrabold">{r.familia}</p>
                  <p className="text-base text-tinta-suave">{r.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")}</p>
                  <p className="text-sm font-bold">
                    Paga al recoger: {PAGO[r.pago]}
                    {r.calificacion ? ` · ${"⭐".repeat(r.calificacion)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-2xl font-black">{formatearBs(r.total)}</span>
              </div>
              {r.estado === "reservada" ? (
                <button
                  type="button"
                  onClick={() => entregar(r.id)}
                  className="mt-3 rounded-2xl border-4 border-tinta bg-verde px-4 py-2 text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none"
                >
                  ✅ Entregado
                </button>
              ) : (
                <p className="mt-2 inline-block rounded-full border-2 border-tinta bg-verde-claro px-3 py-0.5 text-sm font-bold">
                  Entregado · venta registrada
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
