/**
 * Fotos del perfil de Doña Rosa, tomadas del mockup de referencia:
 * el puesto, su retrato y las cuatro canastas.
 */

const FOTOS: Record<string, string> = {
  tomate: "/perfil/canasta-tomate.jpg",
  zanahoria: "/perfil/canasta-zanahoria.jpg",
  lechuga: "/perfil/canasta-lechuga.jpg",
  papa: "/perfil/canasta-papa.jpg",
};

function tipoDe(nombre: string): keyof typeof FOTOS | null {
  const n = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (n.includes("tomate")) return "tomate";
  if (n.includes("zanahoria")) return "zanahoria";
  if (n.includes("lechuga")) return "lechuga";
  if (n.includes("papa") && !n.includes("papaya") && !n.includes("papalisa")) return "papa";
  return null;
}

export function tieneCanasta(nombre: string): boolean {
  return tipoDe(nombre) !== null;
}

export function AvatarDonaRosa() {
  return (
    // Foto propia del perfil, servida desde /public. No hace falta next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/perfil/dona-rosa.jpg" alt="" className="h-full w-full object-cover object-[center_18%]" />
  );
}

export function BannerMercado() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/perfil/banner-mercado.jpg" alt="" className="h-40 w-full object-cover object-[center_45%]" />
  );
}

/** Foto de la canasta para los cuatro productos del puesto. Null si no es uno de esos. */
export function CanastaProducto({ nombre }: { nombre: string }) {
  const tipo = tipoDe(nombre);
  if (!tipo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={FOTOS[tipo]} alt="" className="h-full w-full object-cover" />
  );
}
