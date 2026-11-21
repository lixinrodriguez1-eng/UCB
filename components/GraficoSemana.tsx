"use client";

import { useMemo, useState } from "react";
import { gananciaPorDia, type GananciaDia } from "@/lib/calculos";
import { formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos } from "@/lib/useMovimientos";

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Alto del área de barras, en px. */
const ALTO = 200;

function conSigno(n: number): string {
  if (n === 0) return formatearBs(0);
  return `${n > 0 ? "+" : "−"}${formatearBs(Math.abs(n))}`;
}

/** Versión corta para columnas angostas (celular): "+1,20", "−17,75". */
function conSignoCorto(n: number): string {
  return conSigno(n).replace("Bs ", "");
}

function textoDia(d: GananciaDia): string {
  const nombre = d.esHoy ? "Hoy" : `${DIAS_LARGOS[d.indice]} ${d.fecha.getDate()}`;
  if (d.futuro) return `${nombre}: todavía no llega`;
  if (!d.hayVentas) return `${nombre}: sin ventas`;
  const verbo = d.ganancia < 0 ? "perdiste" : "ganaste";
  let texto = `${nombre}: vendiste ${formatearBs(d.ingresos)} y ${verbo} ${formatearBs(Math.abs(d.ganancia))}`;
  if (d.productosSinCosto.length) texto += ` (sin contar ${d.productosSinCosto.join(", ")})`;
  return texto;
}

/**
 * Barras de ganancia por día (lunes a domingo). Arriba de la línea se ganó,
 * abajo se perdió; el color lo repite (verde / rojo) y las etiquetas llevan signo.
 */
export default function GraficoSemana() {
  const movimientos = useMovimientos();
  const ahora = useAhora();
  const [activo, setActivo] = useState<number | null>(null);

  const dias = useMemo(
    () => (movimientos && ahora ? gananciaPorDia({ movimientos, ahora }) : null),
    [movimientos, ahora],
  );

  if (!dias) return <div className="min-h-80" aria-hidden="true" />;

  const conDatos = dias.filter((d) => d.hayVentas && !d.futuro);
  const totalSemana = dias.reduce((s, d) => s + d.ganancia, 0);
  const maxPos = Math.max(0, ...dias.map((d) => d.ganancia));
  const maxNeg = Math.max(0, ...dias.map((d) => -d.ganancia));
  const rango = maxPos + maxNeg || 1;
  const altoPositivo = (ALTO * maxPos) / rango;

  // Etiquetas selectivas: hoy, el mejor día y el peor día.
  const mejor = conDatos.reduce<GananciaDia | null>((m, d) => (!m || d.ganancia > m.ganancia ? d : m), null);
  const peor = conDatos.reduce<GananciaDia | null>((m, d) => (!m || d.ganancia < m.ganancia ? d : m), null);
  const conEtiqueta = new Set([mejor?.indice, peor?.indice, ...dias.filter((d) => d.esHoy).map((d) => d.indice)]);

  return (
    <section className="rounded-3xl border-4 border-tinta bg-white p-5" aria-labelledby="titulo-grafico">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-grafico" className="text-2xl font-extrabold">
          Ganancia de esta semana
        </h2>
        <p className="text-xl font-black">{conSigno(Math.round(totalSemana * 100) / 100)}</p>
      </div>
      <div className="mt-1 flex gap-4 text-base font-semibold text-tinta-suave">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-verde" aria-hidden="true" /> Ganaste
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-rojo" aria-hidden="true" /> Perdiste
        </span>
      </div>

      {conDatos.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-crema p-6 text-center text-lg text-tinta-suave">
          Cuando registres ventas, aquí vas a ver cuánto ganas cada día.
        </p>
      ) : (
        <>
          {/* Texto del día tocado / señalado */}
          <p className="mt-3 min-h-7 text-lg font-bold" aria-live="polite">
            {activo !== null ? textoDia(dias[activo]) : "Toca un día para ver el detalle"}
          </p>

          <div className="relative mt-6" style={{ height: ALTO + 48 }}>
            {/* Línea de cero */}
            <div
              className="absolute inset-x-0 h-px bg-tinta/40"
              style={{ top: 24 + altoPositivo }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
              {dias.map((d) => {
                const alto = (Math.abs(d.ganancia) / rango) * ALTO;
                const positivo = d.ganancia >= 0;
                const etiqueta = conEtiqueta.has(d.indice) && d.hayVentas && !d.futuro;
                return (
                  <button
                    key={d.indice}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setActivo(activo === d.indice ? null : d.indice)}
                    onMouseEnter={() => setActivo(d.indice)}
                    onMouseLeave={() => setActivo(null)}
                    className={`relative h-full rounded-xl ${activo === d.indice ? "bg-crema-oscura/60" : ""}`}
                  >
                    {d.hayVentas && !d.futuro && alto > 0 && (
                      <span
                        className={`absolute left-1/2 w-6 -translate-x-1/2 ${
                          positivo ? "rounded-t bg-verde" : "rounded-b bg-rojo"
                        }`}
                        style={{
                          height: Math.max(alto, 3),
                          top: positivo ? 24 + altoPositivo - Math.max(alto, 3) : 24 + altoPositivo,
                        }}
                      />
                    )}
                    {etiqueta && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-extrabold sm:text-sm"
                        style={
                          positivo
                            ? { top: 24 + altoPositivo - Math.max(alto, 3) - 22 }
                            : { top: 24 + altoPositivo + Math.max(alto, 3) + 2 }
                        }
                      >
                        {/* En celular la columna es angosta: sin "Bs" para que no se monte sobre la de al lado. */}
                        <span className="sm:hidden">{conSignoCorto(d.ganancia)}</span>
                        <span className="hidden sm:inline">{conSigno(d.ganancia)}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombres de los días */}
          <div className="grid grid-cols-7 text-center text-base" aria-hidden="true">
            {dias.map((d) => (
              <span
                key={d.indice}
                className={d.esHoy ? "font-black text-naranja" : d.futuro ? "text-tinta-suave/60" : "font-semibold"}
              >
                {d.esHoy ? "Hoy" : DIAS_CORTOS[d.indice]}
              </span>
            ))}
          </div>

          {/* Vista de tabla para lectores de pantalla */}
          <table className="sr-only">
            <caption>Ganancia por día de esta semana</caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Vendiste</th>
                <th scope="col">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.indice}>
                  <th scope="row">{d.esHoy ? "Hoy" : DIAS_LARGOS[d.indice]}</th>
                  <td>{d.futuro ? "—" : formatearBs(d.ingresos)}</td>
                  <td>{d.futuro || !d.hayVentas ? "—" : conSigno(d.ganancia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
