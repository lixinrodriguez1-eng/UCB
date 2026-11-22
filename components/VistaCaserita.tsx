"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import AccionesDemo from "@/components/AccionesDemo";
import BotonMicrofono from "@/components/BotonMicrofono";
import BotonSilencio from "@/components/BotonSilencio";
import FechaHoy from "@/components/FechaHoy";
import GraficoSemana from "@/components/GraficoSemana";
import ListaMovimientos from "@/components/ListaMovimientos";
import MeDeben from "@/components/MeDeben";
import MisPedidos from "@/components/MisPedidos";
import PerfilVendedora from "@/components/PerfilVendedora";
import ReservasHoy from "@/components/ReservasHoy";
import { CambiarRol } from "@/components/SelectorRol";
import VentasPorCategoria from "@/components/VentasPorCategoria";

type Seccion = "inicio" | "ventas" | "perfil" | "mensajes";

const SECCIONES: { id: Seccion; etiqueta: string }[] = [
  { id: "inicio", etiqueta: "Inicio" },
  { id: "ventas", etiqueta: "Ventas" },
  { id: "perfil", etiqueta: "Mi Perfil" },
  { id: "mensajes", etiqueta: "Mensajes" },
];

function IconoNav({ id, activo }: { id: Seccion; activo: boolean }) {
  const clase = "h-6 w-6";
  if (id === "inicio") {
    return (
      <svg viewBox="0 0 24 24" className={clase} fill={activo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "ventas") {
    return (
      <svg viewBox="0 0 24 24" className={clase} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 19V10M10 19V6M15 19v-7M20 19V8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "perfil") {
    return (
      <svg viewBox="0 0 24 24" className={clase} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" fill={activo ? "currentColor" : "none"} stroke={activo ? "none" : "currentColor"} />
        <circle cx="12" cy="10" r="2.2" fill={activo ? "#fff" : "none"} />
        <path d="M8.2 16.2c.8-1.6 2.1-2.4 3.8-2.4s3 .8 3.8 2.4" fill="none" stroke={activo ? "#fff" : "currentColor"} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={clase} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M9 12h.01M12 12h.01M15 12h.01" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

/** Vista "Soy caserita": perfil del puesto, voz, ventas y mensajes. */
export default function VistaCaserita() {
  const [seccion, setSeccion] = useState<Seccion>("perfil");
  const mainRef = useRef<HTMLElement>(null);

  const ir = (siguiente: Seccion) => {
    setSeccion(siguiente);
    mainRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="flex h-dvh justify-center bg-[#efe6d4]">
      <div className="flex h-full w-full max-w-[430px] flex-col bg-[#fffaf3] sm:shadow-[0_0_0_1px_rgba(80,50,20,0.08),0_20px_50px_rgba(80,40,10,0.12)]">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4">
          <div>
            <h1 className="text-[1.65rem] font-black leading-none tracking-tight text-[#f26b1d]">Caserita</h1>
            <p className="mt-1 text-sm font-semibold text-[#8d7358]">
              <FechaHoy />
            </p>
            <p className="mt-0.5">
              <CambiarRol discreto />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BotonSilencio compacto />
            <BotonMicrofono variante="pastilla" />
          </div>
        </header>

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          {seccion === "perfil" && <PerfilVendedora onVentas={() => ir("ventas")} onDeudas={() => ir("mensajes")} />}

          {seccion === "inicio" && (
            <div className="space-y-6 px-4 py-4">
              <GraficoSemana />
              <MisPedidos />
              <section aria-labelledby="titulo-credito" className="rounded-3xl border-4 border-tinta bg-azul-claro p-5">
                <h2 id="titulo-credito" className="text-2xl font-extrabold">
                  📄 Mi historial para el crédito
                </h2>
                <p className="mt-1 text-lg">
                  Tus ventas por semana, ganancia promedio y días trabajados, listo para imprimir o guardar en PDF y
                  mostrar en el banco o la cooperativa.
                </p>
                <Link
                  href="/reporte"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border-4 border-tinta bg-azul px-5 py-3 text-xl font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none"
                >
                  Ver mi reporte →
                </Link>
              </section>
              <AccionesDemo />
            </div>
          )}

          {seccion === "ventas" && (
            <div className="space-y-6 px-4 py-4">
              <h2 className="text-2xl font-extrabold">Ventas</h2>
              <VentasPorCategoria />
              <section aria-labelledby="titulo-movimientos">
                <h3 id="titulo-movimientos" className="mb-3 text-xl font-extrabold">
                  Movimientos
                </h3>
                <ListaMovimientos />
              </section>
            </div>
          )}

          {seccion === "mensajes" && (
            <div className="space-y-6 px-4 py-4">
              <div>
                <h2 className="text-2xl font-extrabold">Mensajes</h2>
                <p className="text-base text-tinta-suave">Reservas de las familias y fiados por cobrar.</p>
              </div>
              <ReservasHoy />
              <MeDeben />
            </div>
          )}
        </main>

        <div id="caserita-voz" className="shrink-0" />

        <nav
          className="grid shrink-0 grid-cols-4 border-t border-[#eadfce] bg-white px-1 pt-2 pb-[max(0.55rem,env(safe-area-inset-bottom))]"
          aria-label="Secciones"
        >
          {SECCIONES.map((s) => {
            const activo = seccion === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={activo ? "page" : undefined}
                onClick={() => ir(s.id)}
                className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-bold ${activo ? "text-[#3aaa4a]" : "text-[#9a8b7a]"}`}
              >
                <IconoNav id={s.id} activo={activo} />
                {s.etiqueta}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
