"use client";

import type { ReactNode } from "react";
import type { Rol } from "@/types/roles";
import { elegirRol, useRol } from "@/lib/roles";

const OPCIONES: { rol: Rol; icono: string; titulo: string; texto: string; clase: string }[] = [
  {
    rol: "caserita",
    icono: "🧺",
    titulo: "Soy caserita",
    texto: "Registro mis ventas por voz, veo cuánto gano, cobro fiados y pido a productores.",
    clase: "bg-amarillo-claro",
  },
  {
    rol: "productor",
    icono: "🌾",
    titulo: "Soy productor",
    texto: "Veo los pedidos de las caseritas agrupados por mercado.",
    clase: "bg-verde-claro",
  },
  {
    rol: "familia",
    icono: "👨‍👩‍👧",
    titulo: "Soy familia",
    texto: "Comparo precios por unidad, armo mi bolsita y la recojo en el puesto.",
    clase: "bg-azul-claro",
  },
];

/** Elige qué vista mostrar según el rol guardado; si no hay, muestra el selector. */
export default function SelectorRol({ caserita, productor, familia }: Record<Rol, ReactNode>) {
  const rol = useRol();
  if (rol === null) return <main className="flex-1" aria-busy="true" />;
  if (rol === "caserita") return <>{caserita}</>;
  if (rol === "productor") return <>{productor}</>;
  if (rol === "familia") return <>{familia}</>;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
      <h1 className="text-center text-5xl font-black tracking-tight text-naranja">Caserita</h1>
      <p className="mt-2 text-center text-xl font-semibold text-tinta-suave">Productor → Caserita → Familia</p>
      <p className="mt-8 text-center text-2xl font-extrabold">¿Quién eres?</p>
      <div className="mt-4 grid gap-4">
        {OPCIONES.map((o) => (
          <button
            key={o.rol}
            type="button"
            onClick={() => elegirRol(o.rol)}
            className={`flex items-center gap-4 rounded-3xl border-4 border-tinta p-5 text-left shadow-[0_6px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none ${o.clase}`}
          >
            <span className="text-5xl" aria-hidden="true">
              {o.icono}
            </span>
            <span>
              <span className="block text-2xl font-black">{o.titulo}</span>
              <span className="block text-lg">{o.texto}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

/** Botón chico para volver al selector de rol. */
export function CambiarRol() {
  return (
    <button
      type="button"
      onClick={() => elegirRol("")}
      className="whitespace-nowrap rounded-full border-2 border-tinta/40 px-3 py-1.5 text-sm font-bold text-tinta-suave hover:bg-crema-oscura"
    >
      ↩ Cambiar rol
    </button>
  );
}
