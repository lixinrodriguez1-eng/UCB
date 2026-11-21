"use client";

import { useAhora } from "@/lib/useMovimientos";

const formato = new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long" });

export default function FechaHoy() {
  const ahora = useAhora();
  if (!ahora) return <span className="invisible">.</span>;
  const texto = formato.format(ahora);
  return <span>{texto.charAt(0).toUpperCase() + texto.slice(1)}</span>;
}
