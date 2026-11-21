"use client";

import { useState } from "react";
import { generarMovimientosDemo } from "@/lib/demo";
import { borrarTodo, reemplazarMovimientos, reemplazarPagos } from "@/lib/storage";
import { useMovimientos, usePagos } from "@/lib/useMovimientos";
import { contar, contarRegistros } from "@/lib/formato";

type Pendiente = "demo" | "borrar" | null;

/** Botones discretos para el pitch: cargar el demo y borrar todo. */
export default function AccionesDemo() {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const [pendiente, setPendiente] = useState<Pendiente>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (movimientos === null) return null;
  // Movimientos y pagos: todo lo que se reemplaza o se borra.
  const cantidadPagos = pagos?.length ?? 0;
  const cantidad = movimientos.length + cantidadPagos;
  const registros = contarRegistros(movimientos.length, cantidadPagos);

  const cargarDemo = () => {
    const demo = generarMovimientosDemo(new Date());
    reemplazarMovimientos(demo);
    reemplazarPagos([]); // el demo arranca sin pagos
    setPendiente(null);
    setAviso(`Demo cargada: ${contar(demo.length, "movimiento")} de la semana pasada y de esta semana.`);
  };

  const borrar = () => {
    borrarTodo();
    setPendiente(null);
    setAviso("Se borró todo.");
  };

  const botonDiscreto =
    "rounded-full px-3 py-1.5 text-sm font-semibold text-tinta-suave underline decoration-dotted underline-offset-4 hover:bg-crema-oscura";

  return (
    <footer className="mt-10 border-t-2 border-crema-oscura pt-4 text-center">
      {pendiente === null ? (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className={botonDiscreto}
            onClick={() => {
              setAviso(null);
              if (cantidad === 0) cargarDemo();
              else setPendiente("demo");
            }}
          >
            Modo demo
          </button>
          {cantidad > 0 && (
            <button
              type="button"
              className={botonDiscreto}
              onClick={() => {
                setAviso(null);
                setPendiente("borrar");
              }}
            >
              Borrar todo
            </button>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border-2 border-tinta bg-white p-4" role="group">
          <p className="text-lg font-bold">
            {pendiente === "demo"
              ? `Esto reemplaza lo que tienes (${registros}) por los datos del demo. ¿Seguimos?`
              : `¿Borrar ${registros}? No se puede deshacer.`}
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={pendiente === "demo" ? cargarDemo : borrar}
              className={`rounded-xl px-5 py-2 text-lg font-bold text-white ${pendiente === "demo" ? "bg-azul" : "bg-rojo"}`}
            >
              {pendiente === "demo" ? "Sí, cargar demo" : "Sí, borrar"}
            </button>
            <button
              type="button"
              onClick={() => setPendiente(null)}
              className="rounded-xl border-2 border-tinta px-5 py-2 text-lg font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {aviso && (
        <p className="mt-2 text-sm text-tinta-suave" aria-live="polite">
          {aviso}
        </p>
      )}
    </footer>
  );
}
