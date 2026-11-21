import type { FormaPago, Movimiento, TipoMovimiento } from "@/types/movimiento";
import type { MovimientoEscenarioJson } from "@/types/datosReales";
import { escenarioDelJson } from "@/lib/datosReales";

/**
 * Escenario del "Modo demo": dos semanas en un puesto de pollo y verduras.
 *
 * El pollo sale de "escenario_demo_alerta_margen" de
 * /data/caserita-datos-reales.json: la semana 1 se compra a Bs 200 los 20 kg
 * (Bs 10/kg) y la semana 2 a Bs 340 (Bs 17/kg), y se sigue vendiendo a
 * Bs 39 los 3 kg (Bs 13/kg): pierde Bs 4 por kilo. Como dice el JSON, los
 * precios de compra son simulados.
 *
 * Tomate, papa, queso y pollo entero son relleno para que la pantalla se vea
 * con vida. Ningún apunte es de doña Rosa: el guion del pitch arranca con
 * ella en cero ("se llevó apuntado un pollo entero a 41" → paga 20 → debe 21).
 */

interface EventoDemo {
  semana: 1 | 2;
  /** 0 = lunes … 6 = domingo */
  dia: number;
  /** "09:30" */
  hora: string;
  tipo: TipoMovimiento;
  producto: string;
  cantidad: number;
  unidad: string;
  total: number;
  cliente?: string;
  pago?: FormaPago;
}

const DIAS_DE_VENTA = [0, 1, 2, 3, 4, 5]; // lunes a sábado

const delJson = (n: 1 | 2, dia: number, hora: string, e: MovimientoEscenarioJson): EventoDemo => ({
  semana: n,
  dia,
  hora,
  tipo: e.tipo,
  producto: e.producto,
  cantidad: e.cantidad,
  unidad: e.unidad,
  total: e.total,
});

/** La compra y la venta de pollo de esa semana, tal como están en el JSON. */
function polloDelJson(n: 1 | 2) {
  const { semana1, semana2 } = escenarioDelJson();
  const eventos = n === 1 ? semana1 : semana2;
  const compra = eventos.find((e) => e.tipo === "compra");
  const venta = eventos.find((e) => e.tipo === "venta");
  if (!compra || !venta) throw new Error(`Al escenario del JSON le falta la compra o la venta de la semana ${n}`);
  return { compra, venta };
}

function semana(n: 1 | 2): EventoDemo[] {
  const pollo = polloDelJson(n);
  const compras: EventoDemo[] = [
    // Una sola compra de pollo el lunes: así el costo de cada semana es el del JSON.
    delJson(n, 0, "06:00", pollo.compra),
    { semana: n, dia: 0, hora: "06:10", tipo: "compra", producto: "tomate", cantidad: 30, unidad: "kilo", total: 150 },
    { semana: n, dia: 0, hora: "06:20", tipo: "compra", producto: "papa", cantidad: 4, unidad: "arroba", total: 200 },
    { semana: n, dia: 0, hora: "06:30", tipo: "compra", producto: "queso", cantidad: 10, unidad: "kilo", total: 100 },
  ];
  const ventas: EventoDemo[] = DIAS_DE_VENTA.flatMap((dia) => [
    delJson(n, dia, "09:00", pollo.venta),
    { semana: n, dia, hora: "10:00", tipo: "venta", producto: "tomate", cantidad: 4, unidad: "kilo", total: 28, pago: "qr" },
    { semana: n, dia, hora: "11:00", tipo: "venta", producto: "papa", cantidad: 5, unidad: "kilo", total: 30 },
    ...(dia % 2 === 0
      ? [{ semana: n, dia, hora: "12:00", tipo: "venta", producto: "queso", cantidad: 2, unidad: "kilo", total: 26 } as EventoDemo]
      : []),
  ]);
  return [...compras, ...ventas];
}

/** Prefijo de los ids de los movimientos del modo demo. */
export const PREFIJO_DEMO = "demo-";

/** ¿Hay datos del modo demo entre estos movimientos? */
export function hayDatosDemo(movimientos: Pick<Movimiento, "id">[]): boolean {
  return movimientos.some((m) => m.id.startsWith(PREFIJO_DEMO));
}

export const escenarioDemo: EventoDemo[] = [
  ...semana(1),
  { semana: 1, dia: 2, hora: "15:00", tipo: "fiado", producto: "pollo", cantidad: 2, unidad: "kilo", total: 26, cliente: "doña Juana" },
  { semana: 1, dia: 4, hora: "16:00", tipo: "fiado", producto: "queso", cantidad: 1, unidad: "kilo", total: 13, cliente: "don Pedro" },

  ...semana(2),
  // Pollos enteros para vender por unidad (compra simulada a Bs 30 cada uno).
  { semana: 2, dia: 0, hora: "06:05", tipo: "compra", producto: "pollo entero", cantidad: 10, unidad: "unidad", total: 300 },
  // El miércoles vende el doble de pollo por kilo: el día sale en rojo.
  { ...delJson(2, 2, "13:00", polloDelJson(2).venta) },
  { semana: 2, dia: 1, hora: "15:00", tipo: "fiado", producto: "pollo", cantidad: 3, unidad: "kilo", total: 39, cliente: "doña Juana" },
  { semana: 2, dia: 3, hora: "15:30", tipo: "fiado", producto: "tomate", cantidad: 2, unidad: "kilo", total: 14, cliente: "don Pedro" },
  { semana: 2, dia: 5, hora: "16:00", tipo: "fiado", producto: "papa", cantidad: 3, unidad: "kilo", total: 18, cliente: "doña Carmen" },
];

function lunesDeEstaSemana(ahora: Date): Date {
  const diasDesdeLunes = (ahora.getDay() + 6) % 7;
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diasDesdeLunes);
}

/**
 * Convierte el escenario en movimientos con fechas reales:
 * semana 1 = la semana pasada, semana 2 = esta semana hasta ahora.
 * Lo de hoy que todavía "no pasó" se corre a unos minutos antes de ahora,
 * para que la pantalla de hoy no quede vacía. Los días que vienen no se cargan.
 */
export function generarMovimientosDemo(
  ahora: Date = new Date(),
  eventos: EventoDemo[] = escenarioDemo,
): Movimiento[] {
  const lunes = lunesDeEstaSemana(ahora);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

  const conFecha = eventos.map((e) => {
    const [h, min] = e.hora.split(":").map(Number);
    const offset = (e.semana === 1 ? -7 : 0) + e.dia;
    const fecha = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + offset, h, min);
    return { e, fecha };
  });

  const pasados = conFecha.filter(({ fecha }) => fecha.getTime() <= ahora.getTime());
  // Lo de hoy que cae más tarde que "ahora", en el mismo orden, minutos antes de ahora.
  const deHoyMasTarde = conFecha
    .filter(({ fecha }) => fecha.getTime() > ahora.getTime() && fecha.getTime() < inicioHoy + 86_400_000)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const corridos = deHoyMasTarde.map(({ e }, i) => {
    const minutosAntes = (deHoyMasTarde.length - i) * 5;
    const t = Math.max(inicioHoy + i * 1000, ahora.getTime() - minutosAntes * 60_000);
    return { e, fecha: new Date(t) };
  });

  return [...pasados, ...corridos].map(({ e, fecha }, i) => ({
    id: `${PREFIJO_DEMO}${i}`,
    fecha: fecha.toISOString(),
    tipo: e.tipo,
    producto: e.producto,
    cantidad: e.cantidad,
    unidad: e.unidad,
    total: e.total,
    pago: e.pago ?? "efectivo",
    ...(e.cliente ? { cliente: e.cliente } : {}),
  }));
}
