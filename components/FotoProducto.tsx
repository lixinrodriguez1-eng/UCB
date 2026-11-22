import { categoriaPorId, imagenCategoria, imagenProducto, resolverCategoria } from "@/lib/catalogo";

interface Props {
  /** Nombre del producto (usa su foto, o la de su categoría). */
  producto?: string;
  /** O directamente una categoría. */
  categoria?: string;
  /** Lado en px (la foto es cuadrada). */
  tamano?: number;
  className?: string;
}

/**
 * Foto real del producto (Pexels, guardada en /public/productos: funciona sin
 * internet). Si no hay foto, muestra el ícono de la categoría.
 * Es decorativa: el nombre del producto siempre está escrito al lado.
 */
export default function FotoProducto({ producto, categoria, tamano = 48, className = "" }: Props) {
  const cat = categoria ?? (producto ? resolverCategoria(producto).categoria : undefined);
  const src = producto ? imagenProducto(producto)?.src : cat ? imagenCategoria(cat) : undefined;
  const estilo = { width: tamano, height: tamano };
  const marco = `shrink-0 rounded-xl border-2 border-tinta/30 ${className}`;

  if (!src) {
    return (
      <span aria-hidden="true" style={{ ...estilo, fontSize: tamano * 0.55 }} className={`${marco} flex items-center justify-center bg-crema`}>
        {categoriaPorId(cat).icono}
      </span>
    );
  }
  return (
    // Fotos ya optimizadas (300×300 webp) y guardadas en el proyecto: no hace
    // falta next/image, y así el service worker las guarda sin servidor.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" width={tamano} height={tamano} loading="lazy" decoding="async" style={estilo} className={`${marco} bg-crema object-cover`} />
  );
}
