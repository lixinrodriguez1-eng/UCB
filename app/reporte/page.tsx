import type { Metadata } from "next";
import ReporteNegocio from "@/components/ReporteNegocio";

// El título también es el nombre del PDF al guardarlo desde el navegador.
export const metadata: Metadata = {
  title: "Reporte de mi negocio · Caserita",
  description: "Historial de ventas y ganancias para presentar al pedir un crédito.",
};

export default function PaginaReporte() {
  return <ReporteNegocio />;
}
