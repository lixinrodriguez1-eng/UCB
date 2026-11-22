import type { Metadata } from "next";
import Link from "next/link";
import creditos from "@/data/creditos-fotos.json";
import { categoriaPorId } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Créditos de fotos · Caserita",
  description: "Fotos de productos (licencia libre) y sus autores.",
};

interface Foto {
  id: string;
  producto: string;
  categoria: string;
  archivo: string;
  fotografo: string;
  fotografo_url: string;
  url: string;
}

function Tarjeta({ foto, titulo, fuente }: { foto: Foto; titulo: string; fuente: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-tinta/20 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.archivo} alt={titulo} width={72} height={72} loading="lazy" className="h-18 w-18 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 text-base">
        <p className="text-lg font-extrabold">{titulo}</p>
        <p>
          Foto de{" "}
          <a href={foto.fotografo_url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
            {foto.fotografo}
          </a>
        </p>
        <a href={foto.url} target="_blank" rel="noopener noreferrer" className="text-sm text-tinta-suave underline">
          Ver en {fuente}
        </a>
      </div>
    </li>
  );
}

export default function CreditosFotos() {
  const productos = creditos.productos as Foto[];
  const categorias = creditos.categorias as Foto[];
  const sinFoto = creditos.sin_foto as { id: string; producto: string; categoria: string }[];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <Link href="/" className="text-lg font-bold underline">
        ← Volver
      </Link>
      <h1 className="mt-4 text-4xl font-black text-naranja">Créditos de fotos</h1>
      <p className="mt-2 text-xl">
        <strong>Fotos de {creditos.fuente}</strong>, usadas con la{" "}
        <a href={creditos.licencia} target="_blank" rel="noopener noreferrer" className="underline">
          licencia de {creditos.fuente}
        </a>
        . Gracias a cada autor.
      </p>

      {productos.length === 0 && categorias.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-crema-oscura p-6 text-lg">Todavía no se descargaron fotos.</p>
      ) : (
        <>
          <h2 className="mt-8 text-2xl font-extrabold">Productos ({productos.length})</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((f) => (
              <Tarjeta key={f.id} foto={f} titulo={f.producto} fuente={creditos.fuente} />
            ))}
          </ul>

          <h2 className="mt-8 text-2xl font-extrabold">Categorías ({categorias.length})</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((f) => (
              <Tarjeta key={f.id} foto={f} titulo={`${categoriaPorId(f.producto).icono} ${categoriaPorId(f.producto).nombre}`} fuente={creditos.fuente} />
            ))}
          </ul>

          {sinFoto.length > 0 && (
            <>
              <h2 className="mt-8 text-2xl font-extrabold">Sin foto propia ({sinFoto.length})</h2>
              <p className="mt-1 text-base text-tinta-suave">No había una foto clara: se muestra la de su categoría.</p>
              <p className="mt-2 text-lg">{sinFoto.map((s) => s.producto).join(", ")}</p>
            </>
          )}
        </>
      )}
    </main>
  );
}
