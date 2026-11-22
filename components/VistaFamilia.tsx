"use client";

import { useMemo, useState } from "react";
import type { PagoReserva, Puesto, Reserva } from "@/types/roles";
import {
  ahorroEstimado,
  almacenCalificaciones,
  almacenPublicados,
  almacenReservas,
  buscarProducto,
  calificar,
  promedioEstrellas,
  puestos as armarPuestos,
  reservar,
  totalBolsita,
  type Estrellas,
  type ItemBolsita,
} from "@/lib/familia";
import { describirCantidad, formatearBs, formatearNumero } from "@/lib/formato";
import { useAlmacen } from "@/lib/useAlmacen";
import Link from "next/link";
import { CambiarRol } from "@/components/SelectorRol";
import QrEjemplo from "@/components/QrEjemplo";
import FotoProducto from "@/components/FotoProducto";

const Ejemplo = () => <span className="ml-1 rounded-md bg-amarillo-claro px-1.5 py-0.5 text-xs font-bold align-middle">ejemplo</span>;

function MostrarEstrellas({ e }: { e: Estrellas | null }) {
  if (!e) return <span className="text-base font-semibold text-tinta-suave">Sin calificaciones todavía</span>;
  return (
    <span className="whitespace-nowrap text-base font-extrabold" aria-label={`${formatearNumero(e.promedio)} de 5 estrellas`}>
      ⭐ {formatearNumero(e.promedio)} <span className="font-semibold text-tinta-suave">({e.cantidad})</span>
    </span>
  );
}

const porUnidad = (unidad: string) => (unidad === "unidad" ? "c/u" : `el ${unidad}`);

function Bolsita({ puesto, onReservado }: { puesto: Puesto; onReservado: (r: Reserva) => void }) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [familia, setFamilia] = useState("Familia Gómez");
  const [pago, setPago] = useState<PagoReserva>("qr");
  const items: ItemBolsita[] = puesto.productos.map((p) => ({ ...p, cantidad: cantidades[p.producto] ?? 0 }));
  const elegidos = items.filter((i) => i.cantidad > 0);
  const total = totalBolsita(elegidos);
  const ahorro = ahorroEstimado(elegidos);
  const cambiar = (producto: string, delta: number) =>
    setCantidades((c) => ({ ...c, [producto]: Math.max(0, Math.round(((c[producto] ?? 0) + delta) * 2) / 2) }));

  return (
    <section aria-labelledby="titulo-bolsita" className="rounded-3xl border-4 border-tinta bg-white p-5">
      <h2 id="titulo-bolsita" className="text-2xl font-extrabold">
        🛍️ Mi bolsita en {puesto.nombre}
      </h2>
      <ul className="mt-3 divide-y-2 divide-crema-oscura">
        {items.map((i) => (
          <li key={i.producto} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-3 text-lg">
              <FotoProducto producto={i.producto} tamano={52} />
              <span className="min-w-0">
                <strong>{i.producto}</strong>
                <span className="block">
                  {formatearBs(i.precio)} {porUnidad(i.unidad)}
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => cambiar(i.producto, i.unidad === "unidad" ? -1 : -0.5)} aria-label={`Quitar ${i.producto}`} className="h-10 w-10 rounded-full border-4 border-tinta bg-white text-xl font-black">
                −
              </button>
              <span className="min-w-24 whitespace-nowrap text-center text-lg font-bold">{i.cantidad > 0 ? describirCantidad(i.cantidad, i.unidad, i.unidad === "unidad" ? i.producto : "").replace(/ de $/, "") : "0"}</span>
              <button type="button" onClick={() => cambiar(i.producto, i.unidad === "unidad" ? 1 : 0.5)} aria-label={`Agregar ${i.producto}`} className="h-10 w-10 rounded-full border-4 border-tinta bg-verde text-xl font-black text-white">
                +
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-crema p-4">
        <p className="flex justify-between text-2xl font-black">
          <span>Total</span>
          <span>{formatearBs(total)}</span>
        </p>
        {ahorro.ahorro > 0 && (
          <p className="mt-1 text-lg font-extrabold text-verde">
            Ahorras {formatearBs(ahorro.ahorro)} (−{ahorro.porcentaje}%) frente al supermercado
            <span className="block text-sm font-semibold text-tinta-suave">
              Estimado: precios de supermercado de ejemplo ({formatearBs(ahorro.supermercado)}).
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-base font-bold">Tu nombre</span>
          <input value={familia} onChange={(e) => setFamilia(e.target.value)} className="mt-1 w-full rounded-xl border-4 border-tinta bg-white px-3 py-2 text-lg" />
        </label>
        <fieldset>
          <legend className="text-base font-bold">Pagas al recoger con</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["qr", "efectivo", "fiado"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={pago === f}
                onClick={() => setPago(f)}
                className={`rounded-full border-4 px-3 py-1.5 text-base font-bold ${pago === f ? "border-tinta bg-tinta text-crema" : "border-tinta/30 bg-white"}`}
              >
                {f === "qr" ? "QR" : f === "efectivo" ? "Efectivo" : "Fiado"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        type="button"
        disabled={elegidos.length === 0}
        onClick={() => onReservado(reservar({ puestoId: puesto.id, familia, items: elegidos, pago }))}
        className="mt-5 w-full rounded-2xl border-4 border-tinta bg-verde py-4 text-2xl font-extrabold text-white shadow-[0_5px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none disabled:border-tinta/20 disabled:bg-crema-oscura disabled:text-tinta-suave disabled:shadow-none"
      >
        Reservar y pagar al recoger
      </button>
    </section>
  );
}

export default function VistaFamilia() {
  const publicados = useAlmacen(almacenPublicados);
  const calificaciones = useAlmacen(almacenCalificaciones);
  const reservas = useAlmacen(almacenReservas);
  const lista = useMemo(() => armarPuestos(publicados), [publicados]);
  const [busqueda, setBusqueda] = useState("");
  const [puestoId, setPuestoId] = useState<string | null>(null);
  const [recien, setRecien] = useState<Reserva | null>(null);
  const resultados = useMemo(() => buscarProducto(busqueda, lista, calificaciones), [busqueda, lista, calificaciones]);
  const puesto = lista.find((p) => p.id === puestoId) ?? null;
  const nombrePuesto = (id: string) => lista.find((p) => p.id === id)?.nombre ?? "el puesto";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-naranja sm:text-5xl">👨‍👩‍👧 Soy familia</h1>
          <p className="text-lg font-semibold text-tinta-suave">Precios por unidad en los puestos del mercado</p>
        </div>
        <CambiarRol />
      </header>

      <p className="mb-4 rounded-2xl border-2 border-tinta bg-amarillo-claro px-4 py-2 text-base font-bold">
        ⚠️ Los puestos de Doña Carmen y Don Pedro, sus estrellas y los precios de supermercado son de ejemplo.
      </p>

      {recien && (
        <section className="mb-6 rounded-3xl border-4 border-tinta bg-verde-claro p-5" aria-live="polite">
          <h2 className="text-2xl font-black">✅ ¡Reservado en {nombrePuesto(recien.puestoId)}!</h2>
          <p className="text-lg">
            {recien.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")} · <strong>{formatearBs(recien.total)}</strong>
          </p>
          {ahorroEstimado(recien.items).ahorro > 0 && (
            <p className="text-xl font-extrabold text-verde">
              Ahorraste {formatearBs(ahorroEstimado(recien.items).ahorro)} <span className="text-sm font-semibold text-tinta-suave">(estimado)</span>
            </p>
          )}
          <p className="mt-1 text-base">Pasa a recoger: revisas la calidad y pagas ahí ({recien.pago === "qr" ? "QR" : recien.pago === "efectivo" ? "efectivo" : "fiado"}).</p>
          {recien.pago === "qr" && (
            <div className="mt-3">
              <QrEjemplo para={nombrePuesto(recien.puestoId)} monto={recien.total} semilla={recien.id} />
            </div>
          )}
        </section>
      )}

      <section className="mb-6 rounded-3xl border-4 border-tinta bg-white p-5" aria-labelledby="titulo-buscar">
        <h2 id="titulo-buscar" className="text-2xl font-extrabold">
          🔎 ¿Qué buscas?
        </h2>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="tomate, lechuga, papa…"
          aria-label="Buscar producto"
          className="mt-2 w-full rounded-2xl border-4 border-tinta bg-white px-4 py-3 text-xl"
        />
        {busqueda.trim() && (
          <ul className="mt-3 divide-y-2 divide-crema-oscura">
            {resultados.length === 0 && <li className="py-2 text-lg text-tinta-suave">Nadie publicó “{busqueda}” todavía.</li>}
            {resultados.map((r, i) => (
              <li key={`${r.puesto.id}-${r.precio.producto}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex items-center gap-3 text-lg">
                  <FotoProducto producto={r.precio.producto} tamano={44} />
                  <span>
                  {i === 0 && "🥇 "}
                  <strong>{r.puesto.nombre}</strong>
                  {r.puesto.ejemplo && <Ejemplo />} · {r.precio.producto} {formatearBs(r.precio.precio)} {porUnidad(r.precio.unidad)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <MostrarEstrellas e={r.estrellas} />
                  <button type="button" onClick={() => setPuestoId(r.puesto.id)} className="rounded-xl border-4 border-tinta bg-amarillo-claro px-3 py-1 text-base font-extrabold">
                    Armar bolsita
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="titulo-puestos" className="space-y-4">
          <h2 id="titulo-puestos" className="text-2xl font-extrabold">
            Puestos
          </h2>
          {lista.map((p) => (
            <article key={p.id} className={`rounded-3xl border-4 border-tinta p-4 ${p.id === puestoId ? "bg-amarillo-claro" : "bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black">
                    {p.nombre}
                    {p.ejemplo && <Ejemplo />}
                  </h3>
                  <p className="text-base text-tinta-suave">{p.mercado}</p>
                </div>
                <MostrarEstrellas e={promedioEstrellas(p.id, calificaciones)} />
              </div>
              {p.productos.length === 0 ? (
                <p className="mt-2 text-base text-tinta-suave">Todavía no publicó precios.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {p.productos.map((x) => (
                    <li key={x.producto} className="flex items-center gap-2 rounded-2xl bg-crema p-2 text-base">
                      <FotoProducto producto={x.producto} tamano={44} />
                      <span className="min-w-0 leading-tight">
                        <strong>{x.producto}</strong>
                        <span className="block whitespace-nowrap">
                          {formatearBs(x.precio)} {porUnidad(x.unidad)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {p.productos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPuestoId(p.id)}
                  className="mt-3 rounded-2xl border-4 border-tinta bg-verde px-4 py-2 text-lg font-extrabold text-white"
                >
                  Armar mi bolsita aquí
                </button>
              )}
            </article>
          ))}
        </section>

        <div className="space-y-6">
          {puesto ? (
            <Bolsita
              key={puesto.id}
              puesto={puesto}
              onReservado={(r) => {
                setRecien(r);
                setPuestoId(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : (
            <p className="rounded-3xl border-4 border-dashed border-tinta/30 p-6 text-center text-lg text-tinta-suave">
              Elige un puesto para armar tu bolsita por unidades.
            </p>
          )}

          <section aria-labelledby="titulo-mis-reservas" className="rounded-3xl border-4 border-tinta bg-white">
            <h2 id="titulo-mis-reservas" className="border-b-4 border-tinta bg-azul-claro px-5 py-4 text-2xl font-extrabold">
              Mis reservas
            </h2>
            {reservas.length === 0 ? (
              <p className="p-5 text-lg text-tinta-suave">Todavía no reservaste nada.</p>
            ) : (
              <ul className="divide-y-2 divide-crema-oscura">
                {reservas.map((r) => (
                  <li key={r.id} className="p-4">
                    <p className="flex justify-between gap-3 text-lg">
                      <span>
                        <strong>{nombrePuesto(r.puestoId)}</strong>
                        {lista.find((p) => p.id === r.puestoId)?.ejemplo && <Ejemplo />} · {r.familia}
                      </span>
                      <strong className="whitespace-nowrap">{formatearBs(r.total)}</strong>
                    </p>
                    <p className="text-base text-tinta-suave">{r.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")}</p>
                    {r.estado === "reservada" ? (
                      <p className="mt-1 text-sm font-bold">Reservada · pasa a recoger</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="Califica tu compra">
                        <span className="mr-1 text-base font-bold">Califica:</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => calificar(r.id, n)}
                            aria-label={`${n} estrellas`}
                            aria-pressed={r.calificacion === n}
                            className={`text-2xl ${r.calificacion && n <= r.calificacion ? "" : "opacity-30 grayscale"}`}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="mt-10 text-center">
        <Link href="/creditos" className="text-sm text-tinta-suave underline">
          Créditos de fotos
        </Link>
      </p>
    </main>
  );
}
