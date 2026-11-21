"use client";

import { almacenCalificaciones, promedioEstrellas, PUESTO_PROPIO } from "@/lib/familia";
import { useAlmacen } from "@/lib/useAlmacen";
import { formatearNumero } from "@/lib/formato";

/** "⭐ 4,7 (3)": promedio de estrellas que le dieron las familias. */
export default function EstrellasCaserita() {
  const calificaciones = useAlmacen(almacenCalificaciones);
  const e = promedioEstrellas(PUESTO_PROPIO, calificaciones);
  if (!e) return null;
  return (
    <span
      className="whitespace-nowrap rounded-full border-4 border-tinta bg-amarillo-claro px-3 py-1.5 text-base font-extrabold"
      title={`Promedio de ${e.cantidad} calificaciones de familias`}
    >
      ⭐ {formatearNumero(e.promedio)} <span className="font-semibold text-tinta-suave">({e.cantidad})</span>
    </span>
  );
}
