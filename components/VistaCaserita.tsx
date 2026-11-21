import AccionesDemo from "@/components/AccionesDemo";
import BotonMicrofono from "@/components/BotonMicrofono";
import BotonSilencio from "@/components/BotonSilencio";
import FechaHoy from "@/components/FechaHoy";
import Link from "next/link";
import GraficoSemana from "@/components/GraficoSemana";
import MeDeben from "@/components/MeDeben";
import ListaMovimientos from "@/components/ListaMovimientos";
import Resumen from "@/components/Resumen";
import VentasPorCategoria from "@/components/VentasPorCategoria";
import EstrellasCaserita from "@/components/EstrellasCaserita";
import MisPedidos from "@/components/MisPedidos";
import PreciosPublicados from "@/components/PreciosPublicados";
import ReservasHoy from "@/components/ReservasHoy";
import { CambiarRol } from "@/components/SelectorRol";

/** Vista "Soy caserita": todo lo de siempre, más pedidos a productores y reservas de familias. */
export default function VistaCaserita() {
  return (
    <>
      {/* pb grande para que el botón del micrófono no tape el contenido */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-72 pt-6 sm:px-6 lg:pb-48">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-naranja sm:text-5xl">Caserita</h1>
            <p className="text-lg font-semibold text-tinta-suave">
              <FechaHoy />
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <EstrellasCaserita />
            <BotonSilencio />
            <CambiarRol />
          </div>
        </header>

        <Resumen />

        {/*
          Celular: una columna (gráfico, me deben, crédito, movimientos).
          Pantalla grande: arriba gráfico | me deben, abajo movimientos | crédito,
          para que "Me deben" quede a la vista sin bajar.
        */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
          <div className="lg:col-start-1 lg:row-start-1">
            <GraficoSemana />
          </div>
          <div className="lg:col-start-2 lg:row-start-1 space-y-4">
            <MeDeben />
            <VentasPorCategoria />
          </div>
          <div className="lg:col-start-2 lg:row-start-2">
            <section
              aria-labelledby="titulo-credito"
              className="rounded-3xl border-4 border-tinta bg-azul-claro p-5"
            >
              <h2 id="titulo-credito" className="text-2xl font-extrabold">
                📄 Mi historial para el crédito
              </h2>
              <p className="mt-1 text-lg">
                Tus ventas por semana, ganancia promedio y días trabajados, listo para imprimir o guardar en PDF
                y mostrar en el banco o la cooperativa.
              </p>
              <Link
                href="/reporte"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border-4 border-tinta bg-azul px-5 py-3 text-xl font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none"
              >
                Ver mi reporte →
              </Link>
            </section>
          </div>
          <section aria-labelledby="titulo-movimientos" className="lg:col-start-1 lg:row-start-2">
            <h2 id="titulo-movimientos" className="mb-3 text-2xl font-extrabold">
              Movimientos
            </h2>
            <ListaMovimientos />
          </section>
        </div>

        {/* Productor → Caserita → Familia */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
          <MisPedidos />
          <ReservasHoy />
          <div className="lg:col-span-2">
            <PreciosPublicados />
          </div>
        </div>

        <AccionesDemo />
      </main>
      <BotonMicrofono />
    </>
  );
}
