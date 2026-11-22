"use client";

import { useEffect, useMemo, useState } from "react";
import AccionesDemo from "@/components/AccionesDemo";
import { AvatarDonaRosa, BannerMercado, CanastaProducto, tieneCanasta } from "@/components/ArteCaserita";
import EstrellasCaserita from "@/components/EstrellasCaserita";
import FotoProducto from "@/components/FotoProducto";
import Resumen from "@/components/Resumen";
import { NOMBRE_CASERITA } from "@/lib/ejemplos";
import { almacenPublicados, cambiarPublicado, productosPublicables } from "@/lib/familia";
import { useAlmacen } from "@/lib/useAlmacen";
import { useAhora, useMovimientos } from "@/lib/useMovimientos";
import type { PrecioPuesto } from "@/types/roles";

const CLAVE_FOTO = "caserita:foto-perfil";

/** Precios del afiche cuando el puesto todavía no tiene productos propios. */
const VITRINA: PrecioPuesto[] = [
  { producto: "tomate", unidad: "kilo", precio: 8 },
  { producto: "zanahoria", unidad: "kilo", precio: 6 },
  { producto: "lechuga", unidad: "unidad", precio: 5 },
  { producto: "papa", unidad: "kilo", precio: 4.5 },
];

const ORDEN = ["tomate", "zanahoria", "lechuga", "papa"];
const MONEDA = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item extends PrecioPuesto {
  publicado: boolean;
  /** true si es la vitrina de muestra y todavía no está guardada. */
  sugerido: boolean;
}

function presentar(nombre: string): string {
  if (!nombre) return nombre;
  return nombre.charAt(0).toLocaleUpperCase("es-BO") + nombre.slice(1);
}

function unidadCorta(unidad: string): string {
  if (unidad === "kilo") return "kg";
  return unidad;
}

function lineaPrecio(precio: number, unidad: string): string {
  return `Bs\u00a0${MONEDA.format(precio)} / ${unidadCorta(unidad)}`;
}

function ordenDe(nombre: string): number {
  const i = ORDEN.indexOf(nombre.toLowerCase());
  return i === -1 ? 100 : i;
}

type Formulario =
  | { modo: "nuevo"; nombre: string; precio: string; unidad: string }
  | { modo: "editar"; nombre: string; precio: string; unidad: string; publicado: boolean; sugerido: boolean };

function aPrecio(texto: string): number | null {
  const n = Number(texto.replace(",", ".").trim());
  return texto.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function PerfilVendedora({ onVentas, onDeudas }: { onVentas?: () => void; onDeudas?: () => void }) {
  const movimientos = useMovimientos();
  const publicados = useAlmacen(almacenPublicados);
  const ahora = useAhora();
  const [foto, setFoto] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);

  useEffect(() => {
    try {
      setFoto(localStorage.getItem(CLAVE_FOTO));
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const lista = useMemo<Item[]>(() => {
    if (!movimientos || !ahora) {
      return VITRINA.map((v) => ({ ...v, publicado: true, sugerido: true }));
    }
    const reales = productosPublicables(movimientos, publicados, { ahora });
    if (reales.length === 0) return VITRINA.map((v) => ({ ...v, publicado: true, sugerido: true }));
    return [...reales]
      .map((r) => ({ ...r, sugerido: false }))
      .sort((a, b) => ordenDe(a.producto) - ordenDe(b.producto) || a.producto.localeCompare(b.producto, "es"));
  }, [movimientos, publicados, ahora]);

  const hayMuestra = lista.some((p) => p.sugerido);

  const guardarFoto = (archivo: File | undefined) => {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const datos = typeof lector.result === "string" ? lector.result : null;
      setFoto(datos);
      try {
        if (datos) localStorage.setItem(CLAVE_FOTO, datos);
      } catch {
        /* la foto se ve igual en esta visita */
      }
    };
    lector.readAsDataURL(archivo);
  };

  const publicarLista = (editado: PrecioPuesto | null, enVenta: boolean) => {
    if (hayMuestra) {
      for (const p of lista) {
        const esEste = editado && p.producto.toLowerCase() === editado.producto.toLowerCase();
        if (esEste) {
          if (enVenta) cambiarPublicado(editado, true);
        } else {
          cambiarPublicado({ producto: p.producto, unidad: p.unidad, precio: p.precio }, true);
        }
      }
      return;
    }
    if (editado) cambiarPublicado(editado, enVenta);
  };

  const guardarForm = () => {
    if (!form) return;
    const precio = aPrecio(form.precio);
    const nombre = form.nombre.trim();
    if (!nombre || precio === null) return;
    const item = { producto: nombre, unidad: form.unidad, precio };
    if (form.modo === "nuevo") {
      if (hayMuestra) {
        for (const p of lista) cambiarPublicado({ producto: p.producto, unidad: p.unidad, precio: p.precio }, true);
      }
      cambiarPublicado(item, true);
    } else {
      publicarLista(item, form.publicado);
    }
    setForm(null);
  };

  const precioInvalido = form ? aPrecio(form.precio) === null || !form.nombre.trim() : true;

  return (
    <div>
      <div className="relative">
        <BannerMercado />
        <div className="absolute bottom-0 left-1/2 translate-x-[-50%] translate-y-1/2">
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-[#f6e2b8] shadow-md ring-[5px] ring-[#8ed14a]">
            {foto ? (
              // Foto elegida en este celular. No pasa por el optimizador: es un data URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <AvatarDonaRosa />
            )}
            <label className="absolute bottom-0.5 right-0.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-[#5c3d22] shadow">
              <span className="sr-only">Cambiar foto de perfil</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 8h3l2-2h6l2 2h3v11H4V8z" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  guardarFoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-16 px-4 pb-8 text-center">
        <h2 className="text-2xl font-black tracking-tight">{NOMBRE_CASERITA}</h2>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#8a6a4a]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 10.5 12 4l8 6.5V20H4v-9.5z" strokeLinejoin="round" />
            <path d="M9 20v-6h6v6" />
          </svg>
          Vendedora
        </p>
        <div className="mt-2 flex justify-center">
          <EstrellasCaserita suave />
        </div>

        <div className="mt-4 text-left">
          <Resumen onVendiste={onVentas} onDeben={onDeudas} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-left">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <span aria-hidden="true">🧺</span> Mis productos
          </h3>
          <button
            type="button"
            onClick={() => setForm({ modo: "nuevo", nombre: "", precio: "", unidad: "kilo" })}
            className="rounded-full bg-[#3aaa4a] px-3 py-1.5 text-sm font-bold text-white shadow-sm active:scale-95"
          >
            + Agregar producto
          </button>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-3 text-left">
          {lista.map((p) => (
            <li key={p.producto} className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(80,50,20,0.08)]">
              <div className="relative aspect-[4/3] bg-[#f6ead6]">
                {tieneCanasta(p.producto) ? (
                  <CanastaProducto nombre={p.producto} />
                ) : (
                  <span className="grid h-full place-items-center">
                    <FotoProducto producto={p.producto} tamano={72} />
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-extrabold leading-tight">{presentar(p.producto)}</p>
                <p className="mt-0.5 text-sm font-semibold text-[#8a6a4a]">{lineaPrecio(p.precio, p.unidad)}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      p.publicado ? "bg-[#e5f6df] text-[#2f7d32]" : "bg-[#f3efe6] text-[#8a6a4a]"
                    }`}
                  >
                    {p.publicado ? "En venta" : "Oculto"}
                    {p.sugerido && <span className="sr-only">, precio de muestra</span>}
                  </span>
                  <button
                    type="button"
                    aria-label={`Editar ${presentar(p.producto)}`}
                    onClick={() =>
                      setForm({
                        modo: "editar",
                        nombre: p.producto,
                        precio: String(p.precio).replace(".", ","),
                        unidad: p.unidad,
                        publicado: p.publicado,
                        sugerido: p.sugerido,
                      })
                    }
                    className="grid h-8 w-8 place-items-center rounded-full text-[#8a6a4a] active:bg-[#f6ead6]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
                      <path d="m12.5 7.5 4 4" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {hayMuestra && (
          <p className="mt-3 text-center text-xs font-semibold text-[#a08972]">
            Precios de muestra del puesto. Al editarlos o agregar uno, quedan publicados para las familias.
          </p>
        )}

        <AccionesDemo />
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="titulo-producto">
          <form
            className="w-full max-w-[430px] rounded-t-3xl bg-[#fffaf3] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              guardarForm();
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="titulo-producto" className="text-xl font-black">
                {form.modo === "nuevo" ? "Agregar producto" : presentar(form.nombre)}
              </h2>
              <button type="button" onClick={() => setForm(null)} className="text-sm font-bold text-[#8a6a4a] underline">
                Cerrar
              </button>
            </div>
            {form.modo === "nuevo" && (
              <label className="mb-3 block text-sm font-bold">
                Nombre
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-base font-semibold"
                  placeholder="Tomate"
                  autoFocus
                />
              </label>
            )}
            <label className="mb-3 block text-sm font-bold">
              Precio en Bs
              <input
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-base font-semibold"
                placeholder="8,00"
              />
            </label>
            <label className="mb-3 block text-sm font-bold">
              Se vende por
              <select
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-base font-semibold"
              >
                <option value="kilo">Kilo</option>
                <option value="unidad">Unidad</option>
                <option value="libra">Libra</option>
              </select>
            </label>
            {form.modo === "editar" && (
              <label className="mb-4 flex items-center gap-2 text-base font-bold">
                <input
                  type="checkbox"
                  checked={form.publicado}
                  onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
                />
                En venta para las familias
              </label>
            )}
            <button
              type="submit"
              disabled={precioInvalido}
              className="w-full rounded-2xl bg-[#3aaa4a] py-3 text-lg font-extrabold text-white disabled:bg-[#eadfce] disabled:text-[#8a6a4a]"
            >
              Guardar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
