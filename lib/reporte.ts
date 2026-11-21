/**
 * Datos del "Reporte de mi negocio": el historial que la caserita puede
 * mostrar en un banco o cooperativa para pedir un crédito.
 */
import type { Movimiento } from "@/types/movimiento";
import { deudas, gananciaEntreFechas, type OpcionesCalculo } from "@/lib/calculos";
import { normalizar } from "@/lib/parser";
import { obtenerMovimientos } from "@/lib/storage";

export interface SemanaReporte {
  /** Lunes 00:00 */
  inicio: Date;
  /** Domingo 23:59:59 (o "ahora" en la semana actual) */
  fin: Date;
  ventas: number;
  compras: number;
  ganancia: number;
  diasTrabajados: number;
  /** Productos vendidos sin compra registrada: su ganancia no se cuenta. */
  productosSinCosto: string[];
}

export interface ReporteNegocio {
  desde: Date | null;
  hasta: Date;
  semanas: SemanaReporte[];
  ventasTotales: number;
  comprasTotales: number;
  gananciaTotal: number;
  diasTrabajados: number;
  /** Ganancia total / semanas con ventas. */
  gananciaPromedioSemanal: number;
  /** Ganancia total / días trabajados. */
  gananciaPromedioDiaria: number;
  ventaPromedioDiaria: number;
  productoPrincipal: { producto: string; ventas: number; porcentaje: number } | null;
  porCobrar: number;
  cantidadMovimientos: number;
}

const redondear = (x: number) => Math.round(x * 100) / 100;
const esVenta = (m: Movimiento) => (m.tipo === "venta" || m.tipo === "fiado") && !m.soloDeuda;
const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function lunesDe(fecha: Date): Date {
  const diasDesdeLunes = (fecha.getDay() + 6) % 7;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - diasDesdeLunes);
}

export function generarReporte(op: OpcionesCalculo = {}): ReporteNegocio {
  const ahora = op.ahora ?? new Date();
  const movimientos = (op.movimientos ?? obtenerMovimientos()).filter(
    (m) => new Date(m.fecha).getTime() <= ahora.getTime(),
  );
  const base = { ...op, movimientos, ahora };

  const fechas = movimientos.map((m) => new Date(m.fecha).getTime());
  const desde = fechas.length ? new Date(Math.min(...fechas)) : null;

  // Semanas de lunes a domingo, desde la del primer movimiento hasta la actual.
  const semanas: SemanaReporte[] = [];
  if (desde) {
    for (let lunes = lunesDe(desde); lunes.getTime() <= ahora.getTime(); ) {
      const siguiente = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 7);
      const fin = new Date(Math.min(siguiente.getTime() - 1, ahora.getTime()));
      const deLaSemana = movimientos.filter((m) => {
        const t = new Date(m.fecha).getTime();
        return t >= lunes.getTime() && t <= fin.getTime();
      });
      const ventas = deLaSemana.filter(esVenta);
      const g = gananciaEntreFechas(lunes, fin, base);
      semanas.push({
        inicio: lunes,
        fin,
        ventas: redondear(ventas.reduce((s, m) => s + m.total, 0)),
        compras: redondear(deLaSemana.filter((m) => m.tipo === "compra").reduce((s, m) => s + m.total, 0)),
        ganancia: g.ganancia,
        diasTrabajados: new Set(ventas.map((m) => claveDia(new Date(m.fecha)))).size,
        productosSinCosto: g.productosSinCosto,
      });
      lunes = siguiente;
    }
  }

  const ventas = movimientos.filter(esVenta);
  const ventasTotales = redondear(ventas.reduce((s, m) => s + m.total, 0));
  const gananciaTotal = redondear(semanas.reduce((s, x) => s + x.ganancia, 0));
  const diasTrabajados = new Set(ventas.map((m) => claveDia(new Date(m.fecha)))).size;
  const semanasConVentas = semanas.filter((s) => s.ventas > 0).length;

  // Producto que más plata trae (por monto vendido).
  const porProducto = new Map<string, { producto: string; ventas: number }>();
  for (const m of ventas) {
    const clave = normalizar(m.producto).trim();
    const fila = porProducto.get(clave) ?? { producto: m.producto, ventas: 0 };
    fila.ventas += m.total;
    porProducto.set(clave, fila);
  }
  const principal = [...porProducto.values()].sort((a, b) => b.ventas - a.ventas)[0];

  return {
    desde,
    hasta: ahora,
    semanas,
    ventasTotales,
    comprasTotales: redondear(movimientos.filter((m) => m.tipo === "compra").reduce((s, m) => s + m.total, 0)),
    gananciaTotal,
    diasTrabajados,
    gananciaPromedioSemanal: semanasConVentas ? redondear(gananciaTotal / semanasConVentas) : 0,
    gananciaPromedioDiaria: diasTrabajados ? redondear(gananciaTotal / diasTrabajados) : 0,
    ventaPromedioDiaria: diasTrabajados ? redondear(ventasTotales / diasTrabajados) : 0,
    productoPrincipal: principal
      ? {
          producto: principal.producto,
          ventas: redondear(principal.ventas),
          porcentaje: ventasTotales ? Math.round((principal.ventas / ventasTotales) * 100) : 0,
        }
      : null,
    porCobrar: redondear(deudas(base).reduce((s, d) => s + d.total, 0)),
    cantidadMovimientos: movimientos.length,
  };
}
