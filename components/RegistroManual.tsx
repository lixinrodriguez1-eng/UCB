"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CATEGORIAS, etiquetaCategoria, productosPorCategoria, resolverCategoria, establecerCategoriaProducto } from "@/lib/catalogo";
import { obtenerMovimientosEnCache, suscribirMovimientos } from "@/lib/storage";

interface Props {
  onElegir: (producto: string, categoria: string) => void;
  onCerrar: () => void;
}

const SIN_MOVIMIENTOS: [] = Object.freeze([]) as [];
const servidor = () => SIN_MOVIMIENTOS;

function masUsados(movs: { producto: string }[], limite = 6): string[] {
  const c = new Map<string, { nombre: string; n: number }>();
  for (const m of movs) {
    const k = m.producto.trim().toLowerCase();
    if (!k) continue;
    const prev = c.get(k);
    if (prev) prev.n++; else c.set(k, { nombre: m.producto, n: 1 });
  }
  return [...c.values()].sort((a, b) => b.n - a.n).slice(0, limite).map((x) => x.nombre);
}

export default function RegistroManual({ onElegir, onCerrar }: Props) {
  const movimientos = useSyncExternalStore(suscribirMovimientos, obtenerMovimientosEnCache, servidor);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState("");

  const usados = useMemo(() => masUsados(movimientos), [movimientos]);
  const productos = useMemo(() => {
    const base = categoria ? productosPorCategoria(categoria) : [];
    const conteo = new Map<string, number>();
    for (const m of movimientos) conteo.set(m.producto.trim().toLowerCase(), (conteo.get(m.producto.trim().toLowerCase()) ?? 0) + 1);
    const ordenados = [...base].sort((a, b) => (conteo.get(b.toLowerCase()) ?? 0) - (conteo.get(a.toLowerCase()) ?? 0));
    const b = busqueda.trim().toLowerCase();
    return b ? ordenados.filter((p) => p.toLowerCase().includes(b)) : ordenados;
  }, [categoria, busqueda, movimientos]);

  const elegir = (nombre: string, cat?: string) => {
    const c = cat ?? resolverCategoria(nombre).categoria;
    establecerCategoriaProducto(nombre, c);
    onElegir(nombre, c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-t-4 border-tinta bg-crema p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl font-black">Elegir producto</h2>
          <button type="button" onClick={onCerrar} className="rounded-xl border-2 border-tinta px-3 py-2 text-lg font-bold">Cerrar</button>
        </div>

        {!categoria ? (
          <>
            <p className="mb-2 text-lg font-bold">Mis productos</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {usados.map((p) => (
                <button key={p} type="button" onClick={() => elegir(p)} className="rounded-2xl border-4 border-tinta/20 bg-white px-3 py-4 text-left text-xl font-bold active:scale-95">
                  {p}
                  <div className="text-sm font-semibold text-tinta-suave">{etiquetaCategoria(resolverCategoria(p).categoria)}</div>
                </button>
              ))}
            </div>
            <p className="mb-2 text-lg font-bold">Categorías</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoria(c.id)} className="rounded-2xl border-4 border-tinta/20 bg-white px-3 py-4 text-left text-xl font-extrabold active:scale-95">
                  <span className="text-3xl">{c.icono}</span> <span className="block">{c.nombre}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setCategoria(null)} className="mb-3 text-lg font-bold underline">← Categorías</button>
            <h3 className="mb-3 text-2xl font-extrabold">{etiquetaCategoria(categoria)}</h3>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto" className="mb-3 w-full rounded-2xl border-4 border-tinta bg-white px-4 py-3 text-xl" />
            <div className="grid grid-cols-2 gap-2">
              {productos.map((p) => (
                <button key={p} type="button" onClick={() => elegir(p, categoria)} className="rounded-2xl border-2 border-tinta/20 bg-white px-3 py-3 text-left text-lg font-bold active:scale-95">
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-tinta/30 p-3">
              <p className="mb-2 font-bold">+ Agregar producto nuevo</p>
              <div className="flex gap-2">
                <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre del producto" className="flex-1 rounded-xl border-2 border-tinta/30 px-3 py-2 text-lg" />
                <button type="button" onClick={() => { if (nuevo.trim()) elegir(nuevo.trim(), categoria); }} className="rounded-xl bg-verde px-4 py-2 font-bold text-white">Agregar</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
