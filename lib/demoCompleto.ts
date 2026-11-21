/**
 * "Modo demo completo": el mismo demo de siempre (movimientos de la caserita,
 * sin cambios) MÁS precios publicados, estrellas y reservas de ejemplo para
 * los roles Familia y Productor. Los productores y puestos de ejemplo son
 * fijos (lib/ejemplos.ts), no hace falta cargarlos.
 */
import type { Movimiento } from "@/types/movimiento";
import type { Calificacion, Pedido, Publicado, Reserva } from "@/types/roles";
import { generarMovimientosDemo } from "@/lib/demo";
import { calificacionesDemo, comprasDemoCompleto, PUBLICADOS_DEMO, reservasDemo } from "@/lib/ejemplos";
import { almacenCalificaciones, almacenPublicados, almacenReservas } from "@/lib/familia";
import { almacenPedidos } from "@/lib/pedidos";
import { reemplazarMovimientos, reemplazarPagos } from "@/lib/storage";

export interface DatosDemoCompleto {
  movimientos: Movimiento[];
  publicados: Publicado[];
  calificaciones: Calificacion[];
  reservas: Reserva[];
  pedidos: Pedido[];
}

export function datosDemoCompleto(ahora: Date = new Date()): DatosDemoCompleto {
  return {
    // El demo de siempre (los 6 pasos del guion dan lo mismo) + compras de
    // lechuga y zanahoria, que el demo de siempre no vende.
    movimientos: [...generarMovimientosDemo(ahora), ...comprasDemoCompleto(ahora)],
    publicados: PUBLICADOS_DEMO,
    calificaciones: calificacionesDemo(ahora),
    reservas: reservasDemo(ahora),
    pedidos: [],
  };
}

export function cargarDemoCompleto(ahora: Date = new Date()): DatosDemoCompleto {
  const datos = datosDemoCompleto(ahora);
  reemplazarMovimientos(datos.movimientos);
  reemplazarPagos([]);
  almacenPublicados.guardar(datos.publicados);
  almacenCalificaciones.guardar(datos.calificaciones);
  almacenReservas.guardar(datos.reservas);
  almacenPedidos.guardar(datos.pedidos);
  return datos;
}
