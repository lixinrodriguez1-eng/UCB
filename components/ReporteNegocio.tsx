"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { generarReporte } from "@/lib/reporte";
import { hayDatosDemo } from "@/lib/demo";
import { formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";

// --- Nombre y puesto (se recuerdan en este celular) -------------------------

const CLAVE_PERFIL = "caserita:perfil";
const EVENTO_PERFIL = "caserita:perfil-cambio";
type Perfil = { nombre: string; puesto: string };
const PERFIL_VACIO: Perfil = { nombre: "", puesto: "" };

let crudoPerfil: string | null | undefined;
let perfilCache: Perfil = PERFIL_VACIO;
function leerPerfil(): Perfil {
  try {
    const crudo = window.localStorage.getItem(CLAVE_PERFIL);
    if (crudo !== crudoPerfil) {
      crudoPerfil = crudo;
      perfilCache = crudo ? { ...PERFIL_VACIO, ...(JSON.parse(crudo) as Partial<Perfil>) } : PERFIL_VACIO;
    }
  } catch {
    // sin storage
  }
  return perfilCache;
}
function guardarPerfil(perfil: Perfil) {
  try {
    window.localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
    window.dispatchEvent(new Event(EVENTO_PERFIL));
  } catch {
    // sin storage
  }
}
function suscribirPerfil(alCambiar: () => void) {
  window.addEventListener(EVENTO_PERFIL, alCambiar);
  return () => window.removeEventListener(EVENTO_PERFIL, alCambiar);
}
const perfilEnServidor = () => PERFIL_VACIO;

// --- Formatos -------------------------------------------------------------------

const fechaLarga = new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "long", year: "numeric" });
const fechaCorta = new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "numeric", month: "short" });

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border-2 border-tinta p-4 print:break-inside-avoid print:rounded-lg print:p-3">
      <p className="text-base font-bold text-tinta-suave print:text-sm">{etiqueta}</p>
      <p className="mt-1 text-3xl font-black leading-tight print:text-2xl">{valor}</p>
      {detalle && <p className="mt-1 text-sm text-tinta-suave">{detalle}</p>}
    </div>
  );
}

const campo =
  "w-full rounded-xl border-2 border-tinta/40 bg-white px-3 py-2 text-xl font-bold print:border-0 print:border-b print:border-tinta print:rounded-none print:px-0 print:placeholder:text-transparent";

export default function ReporteNegocio() {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();
  const perfil = useSyncExternalStore(suscribirPerfil, leerPerfil, perfilEnServidor);

  const r = useMemo(
    () => (movimientos && pagos && ahora ? generarReporte({ movimientos, pagos, ahora }) : null),
    [movimientos, pagos, ahora],
  );

  const esDemo = movimientos ? hayDatosDemo(movimientos) : false;
  const sinCosto = r ? [...new Set(r.semanas.flatMap((s) => s.productosSinCosto))] : [];
  const maxVentas = r ? Math.max(1, ...r.semanas.map((s) => s.ventas)) : 1;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      {/* Barra de acciones: no sale en el papel */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/" className="rounded-xl px-2 py-1 text-lg font-bold underline">
          ← Volver
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!r || r.cantidadMovimientos === 0}
          className="rounded-2xl border-4 border-tinta bg-azul px-5 py-3 text-xl font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          🖨️ Imprimir o guardar PDF
        </button>
      </div>

      {esDemo && (
        // Marca de agua: fija, así se repite en cada hoja impresa.
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden [print-color-adjust:exact]"
        >
          {/* Tamaño según la pantalla u hoja, para que entre completa en diagonal. */}
          <span className="-rotate-[30deg] whitespace-nowrap text-[min(6.5vw,11vh)] font-black uppercase tracking-wider text-rojo/15 print:text-rojo/20">
            Datos de demostración
          </span>
        </div>
      )}

      <article className="relative rounded-3xl border-4 border-tinta bg-white p-6 sm:p-8 print:rounded-none print:border-0 print:p-0">
        {esDemo && (
          <p
            role="note"
            className="mb-5 rounded-xl border-4 border-rojo bg-[repeating-linear-gradient(-45deg,var(--amarillo)_0_14px,var(--amarillo-claro)_14px_28px)] px-4 py-3 text-center text-lg font-black uppercase tracking-wide text-tinta [print-color-adjust:exact] print:mb-4 print:text-base"
          >
            ⚠️ Datos de demostración
            <span className="block text-sm font-bold normal-case tracking-normal">
              Este reporte incluye datos de ejemplo del modo demo: no es un historial real del negocio.
            </span>
          </p>
        )}
        <header className="border-b-4 border-naranja pb-4">
          <p className="text-base font-extrabold uppercase tracking-wide text-naranja">Caserita · Mi historial para el crédito</p>
          <h1 className="mt-1 text-4xl font-black print:text-3xl">Reporte de mi negocio</h1>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            <label className="block">
              <span className="text-base font-bold text-tinta-suave">Nombre</span>
              <input
                className={campo}
                value={perfil.nombre}
                onChange={(e) => guardarPerfil({ ...perfil, nombre: e.target.value })}
                placeholder="Tu nombre completo"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="text-base font-bold text-tinta-suave">Puesto y mercado</span>
              <input
                className={campo}
                value={perfil.puesto}
                onChange={(e) => guardarPerfil({ ...perfil, puesto: e.target.value })}
                placeholder="ej. Pollo y verduras, Mercado Los Pozos"
              />
            </label>
          </div>

          {r && r.desde && (
            <p className="mt-3 text-base text-tinta-suave">
              Período: del {fechaLarga.format(r.desde)} al {fechaLarga.format(r.hasta)} · Generado el{" "}
              {fechaLarga.format(r.hasta)}
            </p>
          )}
        </header>

        {!r ? null : r.cantidadMovimientos === 0 ? (
          <p className="mt-8 rounded-2xl bg-crema p-8 text-center text-xl text-tinta-suave">
            Todavía no hay datos. Registra tus ventas y compras unos días y vuelve aquí.
          </p>
        ) : (
          <>
            <section className="mt-6" aria-labelledby="titulo-resumen-reporte">
              <h2 id="titulo-resumen-reporte" className="text-2xl font-extrabold">
                Resumen
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
                <Dato etiqueta="Ventas totales" valor={formatearBs(r.ventasTotales)} detalle={`${r.semanas.length} ${r.semanas.length === 1 ? "semana" : "semanas"}`} />
                <Dato etiqueta="Ganancia promedio" valor={formatearBs(r.gananciaPromedioSemanal)} detalle="por semana" />
                <Dato etiqueta="Días trabajados" valor={String(r.diasTrabajados)} detalle="días con ventas" />
                <Dato
                  etiqueta="Producto principal"
                  valor={r.productoPrincipal?.producto ?? "—"}
                  detalle={r.productoPrincipal ? `${r.productoPrincipal.porcentaje}% de las ventas` : undefined}
                />
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1 text-lg sm:grid-cols-2 print:grid-cols-2 print:text-base">
                <div className="flex justify-between border-b border-crema-oscura py-1">
                  <dt>Venta promedio por día trabajado</dt>
                  <dd className="whitespace-nowrap font-bold">{formatearBs(r.ventaPromedioDiaria)}</dd>
                </div>
                <div className="flex justify-between border-b border-crema-oscura py-1">
                  <dt>Ganancia promedio por día trabajado</dt>
                  <dd className="whitespace-nowrap font-bold">{formatearBs(r.gananciaPromedioDiaria)}</dd>
                </div>
                <div className="flex justify-between border-b border-crema-oscura py-1">
                  <dt>Ganancia total del período</dt>
                  <dd className="whitespace-nowrap font-bold">{formatearBs(r.gananciaTotal)}</dd>
                </div>
                <div className="flex justify-between border-b border-crema-oscura py-1">
                  <dt>Compras de mercadería</dt>
                  <dd className="whitespace-nowrap font-bold">{formatearBs(r.comprasTotales)}</dd>
                </div>
                <div className="flex justify-between border-b border-crema-oscura py-1">
                  <dt>Por cobrar (ventas apuntadas)</dt>
                  <dd className="whitespace-nowrap font-bold">{formatearBs(r.porCobrar)}</dd>
                </div>
              </dl>
            </section>

            <section className="mt-8 print:break-inside-avoid" aria-labelledby="titulo-semanas">
              <h2 id="titulo-semanas" className="text-2xl font-extrabold">
                Ventas por semana
              </h2>
              {/* Celular: una tarjeta por semana, todo a la vista. */}
              <ul className="mt-3 space-y-3 sm:hidden print:hidden">
                {r.semanas.map((s) => (
                  <li key={s.inicio.toISOString()} className="rounded-2xl border-2 border-tinta p-4">
                    <p className="text-lg font-extrabold">
                      {fechaCorta.format(s.inicio)} – {fechaCorta.format(s.fin)}
                    </p>
                    <span
                      className="mt-2 block h-3 rounded-r bg-naranja"
                      style={{ width: `${(s.ventas / maxVentas) * 100}%` }}
                      aria-hidden="true"
                    />
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-base">
                      <dt>Ventas</dt>
                      <dd className="whitespace-nowrap text-right font-bold">{formatearBs(s.ventas)}</dd>
                      <dt>Compras</dt>
                      <dd className="whitespace-nowrap text-right">{formatearBs(s.compras)}</dd>
                      <dt>Ganancia</dt>
                      <dd className={`whitespace-nowrap text-right font-bold ${s.ganancia < 0 ? "text-rojo" : ""}`}>
                        {s.ganancia < 0 ? "−" : ""}
                        {formatearBs(Math.abs(s.ganancia))}
                      </dd>
                      <dt>Días trabajados</dt>
                      <dd className="text-right">{s.diasTrabajados}</dd>
                    </dl>
                  </li>
                ))}
                <li className="rounded-2xl border-4 border-tinta bg-crema p-4">
                  <p className="text-lg font-black">Total</p>
                  <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-base font-bold">
                    <dt>Ventas</dt>
                    <dd className="whitespace-nowrap text-right">{formatearBs(r.ventasTotales)}</dd>
                    <dt>Compras</dt>
                    <dd className="whitespace-nowrap text-right">{formatearBs(r.comprasTotales)}</dd>
                    <dt>Ganancia</dt>
                    <dd className="whitespace-nowrap text-right">
                      {r.gananciaTotal < 0 ? "−" : ""}
                      {formatearBs(Math.abs(r.gananciaTotal))}
                    </dd>
                    <dt>Días trabajados</dt>
                    <dd className="text-right">{r.diasTrabajados}</dd>
                  </dl>
                </li>
              </ul>

              {/* Pantalla ancha e impresión: tabla. */}
              <div className="mt-3 hidden overflow-x-auto sm:block print:block">
                <table className="w-full border-collapse text-left text-lg print:text-sm">
                  <thead>
                    <tr className="border-b-4 border-tinta">
                      <th scope="col" className="py-2 pr-3">Semana</th>
                      <th scope="col" className="py-2 pr-3 text-right">Días</th>
                      <th scope="col" className="py-2 pr-3 text-right">Ventas</th>
                      <th scope="col" className="hidden w-1/4 py-2 pr-3 sm:table-cell print:table-cell">
                        <span className="sr-only">Gráfico de ventas</span>
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right">Compras</th>
                      <th scope="col" className="py-2 text-right">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {r.semanas.map((s) => (
                      <tr key={s.inicio.toISOString()} className="border-b border-crema-oscura">
                        <th scope="row" className="py-2 pr-3 font-semibold">
                          {fechaCorta.format(s.inicio)} – {fechaCorta.format(s.fin)}
                        </th>
                        <td className="py-2 pr-3 text-right">{s.diasTrabajados}</td>
                        <td className="py-2 pr-3 text-right font-bold">{formatearBs(s.ventas)}</td>
                        <td className="hidden py-2 pr-3 sm:table-cell print:table-cell" aria-hidden="true">
                          <span
                            className="block h-3 rounded-r bg-naranja [print-color-adjust:exact]"
                            style={{ width: `${(s.ventas / maxVentas) * 100}%` }}
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">{formatearBs(s.compras)}</td>
                        <td className={`py-2 text-right font-bold ${s.ganancia < 0 ? "text-rojo" : ""}`}>
                          {s.ganancia < 0 ? "−" : ""}
                          {formatearBs(Math.abs(s.ganancia))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-4 border-tinta font-black">
                      <th scope="row" className="py-2 pr-3">Total</th>
                      <td className="py-2 pr-3 text-right">{r.diasTrabajados}</td>
                      <td className="py-2 pr-3 text-right">{formatearBs(r.ventasTotales)}</td>
                      <td className="hidden sm:table-cell print:table-cell" />
                      <td className="py-2 pr-3 text-right">{formatearBs(r.comprasTotales)}</td>
                      <td className="py-2 text-right">
                        {r.gananciaTotal < 0 ? "−" : ""}
                        {formatearBs(Math.abs(r.gananciaTotal))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="mt-8 text-sm text-tinta-suave print:break-inside-avoid">
              <h2 className="text-base font-extrabold text-tinta">Cómo se calculó</h2>
              <p className="mt-1">
                Datos anotados por la vendedora en la app Caserita ({r.cantidadMovimientos} registros). Las ventas
                incluyen las apuntadas (fiadas). La ganancia es lo vendido menos lo que costó esa mercadería, con el
                costo promedio de las compras de los 7 días anteriores a cada venta.
                {sinCosto.length > 0 &&
                  ` No se cuenta la ganancia de: ${sinCosto.join(", ")} (no hay compra registrada).`}
              </p>
            </section>

            <div className="mt-12 grid grid-cols-2 gap-10 text-center text-base print:mt-16">
              <div>
                <div className="border-t-2 border-tinta pt-1">Firma</div>
              </div>
              <div>
                <div className="border-t-2 border-tinta pt-1">Carnet de identidad</div>
              </div>
            </div>
          </>
        )}
      </article>
    </main>
  );
}
