import { beforeEach, describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import { costoPromedioPorUnidad, deudas, gananciaDelDia, revisarMargen, ventasDelDia } from "@/lib/calculos";
import { dividirFrase, parsearFrase } from "@/lib/parser";
import { agregarMovimiento, obtenerMovimientos } from "@/lib/storage";
import { compararOfertas, crearPedidos, detectarPedido, marcarCobrado, pedidoGrupal, recibirPedido, almacenPedidos } from "@/lib/pedidos";
import {
  ahorroEstimado,
  almacenCalificaciones,
  almacenPublicados,
  almacenReservas,
  buscarProducto,
  calificar,
  cambiarPublicado,
  entregarReserva,
  productosPublicables,
  promedioEstrellas,
  PUESTO_PROPIO,
  puestos,
  reservar,
  reservasDeHoy,
  totalBolsita,
} from "@/lib/familia";
import { PRODUCTORES_EJEMPLO, PUESTOS_EJEMPLO } from "@/lib/ejemplos";
import { generarMovimientosDemo } from "@/lib/demo";
import { cargarDemoCompleto, datosDemoCompleto } from "@/lib/demoCompleto";
import { describirCantidad, resumirMovimiento } from "@/lib/formato";

// --- Un "navegador" mínimo en memoria: localStorage + eventos -----------------
const memoria = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (k: string) => (memoria.has(k) ? memoria.get(k)! : null),
      setItem: (k: string, v: string) => void memoria.set(k, String(v)),
      removeItem: (k: string) => void memoria.delete(k),
      clear: () => memoria.clear(),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});
beforeEach(() => memoria.clear());

const ahora = new Date(2026, 10, 21, 10); // sábado
const venta = (producto: string, cantidad: number, unidad: string, total: number): Movimiento =>
  agregarMovimiento({ tipo: "venta", producto, cantidad, unidad, total, pago: "efectivo", fecha: new Date(2026, 10, 21, 8).toISOString() });

describe("pedido por voz al productor", () => {
  it.each([
    ["Para mañana necesito un quintal de papa y dos cajas de tomate", [["papa", 1, "quintal"], ["tomate", 2, "caja"]]],
    ["Quiero comprar 1 quintal de papa al mejor precio", [["papa", 1, "quintal"]]],
    ["necesito 3 arrobas de papa, una caja de tomate", [["papa", 3, "arroba"], ["tomate", 1, "caja"]]],
  ])("%s", (frase, esperado) => {
    expect(detectarPedido(frase)?.map((i) => [i.producto, i.cantidad, i.unidad])).toEqual(esperado);
  });

  it.each(["Compré veinte kilos de pollo a trescientos cuarenta pesos", "Vendí 3 kilos de tomate a 21", "¿Cuánto gané hoy?"])(
    "'%s' no es un pedido",
    (frase) => expect(detectarPedido(frase)).toBeNull(),
  );

  it("ordena productores por precio y dice cuánto te deja (con tus ventas)", () => {
    venta("papa", 5, "kilo", 30); // vende a Bs 6 el kilo
    const ofertas = compararOfertas({ producto: "papa", cantidad: 1, unidad: "quintal" }, { ahora });
    expect(ofertas.map((o) => [o.productor.nombre, o.costo, o.teDeja])).toEqual([
      ["Don Mateo", 145, 131], // 46 kg × 6 − 145
      ["Doña Elsa", 155, 121],
      ["Mayorista del Abasto (referencia)", 170, 106],
    ]);
    expect(ofertas[0].precioVenta).toEqual({ valor: 6, unidad: "kilo", fuente: "tus ventas" });
  });

  it("sin ventas propias usa el precio de referencia del JSON; la caja usa su equivalencia", () => {
    const ofertas = compararOfertas({ producto: "tomate", cantidad: 2, unidad: "caja" }, { ahora, movimientos: [] });
    expect(ofertas.map((o) => [o.productor.id, o.costo, o.teDeja])).toEqual([
      ["dona-elsa", 200, 80], // 2 cajas ≈ 40 kg × Bs 7 (referencia) − 200
      ["don-mateo", 230, 50],
      ["mayorista-abasto", 260, 20],
    ]);
    expect(ofertas[0].precioVenta?.fuente).toBe("precio del mercado");
  });
});

describe("pedido al productor → compra registrada con costo", () => {
  it("crea pedidos pendientes, al recibir registra las compras y el costo real", () => {
    const pedidos = crearPedidos(
      [
        { productorId: "don-mateo", item: { producto: "papa", cantidad: 1, unidad: "quintal" } },
        { productorId: "dona-elsa", item: { producto: "tomate", cantidad: 2, unidad: "caja" } },
      ],
      { ahora },
    );
    expect(pedidos.map((p) => [p.productorId, p.estado, p.total])).toEqual([
      ["don-mateo", "pendiente", 145],
      ["dona-elsa", "pendiente", 200],
    ]);
    expect(obtenerMovimientos()).toEqual([]); // todavía no hay compra

    const papa = recibirPedido(pedidos[0].id, ahora);
    const tomate = recibirPedido(pedidos[1].id, ahora);
    expect(papa.map((m) => [m.tipo, m.producto, m.cantidad, m.unidad, m.total, m.pago])).toEqual([["compra", "papa", 1, "quintal", 145, "qr"]]);
    // la caja no tiene medida fija: se registra en kilos (2 × 20)
    expect(tomate.map((m) => [m.tipo, m.producto, m.cantidad, m.unidad, m.total])).toEqual([["compra", "tomate", 40, "kilo", 200]]);

    const op = { ahora: new Date(2026, 10, 21, 12) };
    expect(costoPromedioPorUnidad("tomate", op)).toEqual({ valor: 5, unidad: "kilo" });
    expect(costoPromedioPorUnidad("papa", op)?.valor).toBe(3.15); // 145 / 46 kg

    expect(almacenPedidos.leer().map((p) => p.estado)).toEqual(["entregado", "entregado"]);
    expect(recibirPedido(pedidos[0].id)).toEqual([]); // no se registra dos veces
    expect(marcarCobrado(pedidos[0].id)?.estado).toBe("cobrado");
  });

  it("la alerta de margen usa el costo del pedido", () => {
    const [pedido] = crearPedidos([{ productorId: "dona-elsa", item: { producto: "tomate", cantidad: 2, unidad: "caja" } }], { ahora });
    recibirPedido(pedido.id, ahora); // Bs 5 el kilo
    agregarMovimiento({ tipo: "venta", producto: "tomate", cantidad: 2, unidad: "kilo", total: 9, pago: "efectivo", fecha: new Date(2026, 10, 21, 11).toISOString() });
    expect(revisarMargen("tomate", { ahora: new Date(2026, 10, 21, 12) })).toMatchObject({ nivel: "perdida", costo: 5, precio: 4.5 });
  });

  it("pedido grupal: suma otras caseritas (ejemplo) y el ahorro frente al mayorista", () => {
    const [pedido] = crearPedidos([{ productorId: "don-mateo", item: { producto: "papa", cantidad: 1, unidad: "quintal" } }], { ahora });
    const g = pedidoGrupal(pedido);
    expect(g.pedidos.slice(1).every((p) => p.ejemplo)).toBe(true);
    expect(g.totales.find((t) => t.producto === "papa")).toEqual({ producto: "papa", unidad: "quintal", cantidad: 5.5 });
    // papa (170−145)×5,5 + tomate (130−115)×3 + cebolla (150−120)×1
    expect(g.ahorroGrupo).toBe(212.5);
  });

  it("todos los productores están marcados como ejemplo", () => {
    expect(PRODUCTORES_EJEMPLO.every((p) => p.ejemplo)).toBe(true);
    expect(PRODUCTORES_EJEMPLO.find((p) => p.id === "don-mateo")?.productos[0]).toMatchObject({ producto: "papa", unidad: "quintal", precio: 145 });
  });
});

describe("familia: reserva → venta registrada", () => {
  const bolsita = [
    { producto: "tomate", unidad: "kilo", precio: 7, cantidad: 1 },
    { producto: "lechuga", unidad: "unidad", precio: 5, cantidad: 2 },
  ];

  it("la caserita ve la reserva en 'Reservas de hoy' y al entregar se registra la venta", () => {
    const r = reservar({ puestoId: PUESTO_PROPIO, familia: "Familia Pérez", items: bolsita, pago: "qr", ahora });
    expect(r).toMatchObject({ total: 17, estado: "reservada", pago: "qr" });
    expect(reservasDeHoy(almacenReservas.leer(), ahora).map((x) => x.id)).toEqual([r.id]);
    expect(obtenerMovimientos()).toEqual([]);

    const ventas = entregarReserva(r.id, ahora);
    expect(ventas.map((m) => [m.tipo, m.producto, m.cantidad, m.unidad, m.total, m.pago, m.cliente])).toEqual([
      ["venta", "tomate", 1, "kilo", 7, "qr", "Familia Pérez"],
      ["venta", "lechuga", 2, "unidad", 10, "qr", "Familia Pérez"],
    ]);
    expect(almacenReservas.leer()[0].estado).toBe("entregada");
    expect(entregarReserva(r.id)).toEqual([]); // no se registra dos veces
    expect(ventasDelDia({ ahora: new Date(2026, 10, 21, 23) })).toBe(17);
  });

  it("fiado de familia → aparece en Me deben", () => {
    const r = reservar({ puestoId: PUESTO_PROPIO, familia: "Familia Rojas", items: [{ producto: "papa", unidad: "kilo", precio: 4.5, cantidad: 2 }], pago: "fiado", ahora });
    entregarReserva(r.id, ahora);
    const lista = deudas({ ahora: new Date(2026, 10, 21, 23) });
    expect(lista.map((d) => [d.cliente, d.total, d.productos])).toEqual([["Familia Rojas", 9, ["papa"]]]);
  });

  it("estrellas promedio de la caserita", () => {
    almacenCalificaciones.guardar([
      { id: "a", fecha: ahora.toISOString(), puestoId: PUESTO_PROPIO, estrellas: 5, familia: "A" },
      { id: "b", fecha: ahora.toISOString(), puestoId: PUESTO_PROPIO, estrellas: 4, familia: "B" },
    ]);
    const r = reservar({ puestoId: PUESTO_PROPIO, familia: "C", items: bolsita, pago: "efectivo", ahora });
    calificar(r.id, 3);
    expect(promedioEstrellas(PUESTO_PROPIO, almacenCalificaciones.leer())).toEqual({ promedio: 4, cantidad: 3 });
    calificar(r.id, 5); // volver a calificar la misma reserva la reemplaza
    expect(promedioEstrellas(PUESTO_PROPIO, almacenCalificaciones.leer())).toEqual({ promedio: 4.7, cantidad: 3 });
    expect(calificar(r.id, 9)?.estrellas).toBe(5); // de 1 a 5
    expect(promedioEstrellas(PUESTO_PROPIO, [])).toBeNull();
  });

  it("buscador compara precios entre puestos con estrellas; ahorro estimado", () => {
    const lista = puestos([{ producto: "tomate", unidad: "kilo", precio: 7 }]);
    expect(lista[0]).toMatchObject({ id: PUESTO_PROPIO, nombre: "Doña Rosa", ejemplo: false });
    expect(PUESTOS_EJEMPLO.every((p) => p.ejemplo)).toBe(true);
    expect(buscarProducto("tomate", lista, []).map((r) => [r.puesto.id, r.precio.precio, r.estrellas?.promedio ?? null])).toEqual([
      [PUESTO_PROPIO, 7, null],
      ["don-pedro", 7.5, 4.2],
      ["dona-carmen", 8, 4.5],
    ]);
    const items = [
      { producto: "tomate", unidad: "kilo", precio: 7, cantidad: 1 },
      { producto: "lechuga", unidad: "unidad", precio: 5, cantidad: 2 },
      { producto: "papa", unidad: "kilo", precio: 4.5, cantidad: 2 },
      { producto: "zanahoria", unidad: "kilo", precio: 6, cantidad: 1 },
    ];
    expect(totalBolsita(items)).toBe(32);
    expect(ahorroEstimado(items)).toEqual({ supermercado: 52, ahorro: 20, porcentaje: 38 });
  });

  it("publicar precio: la caserita elige qué ven las familias", () => {
    venta("tomate", 4, "kilo", 28);
    const opciones = productosPublicables(obtenerMovimientos(), almacenPublicados.leer(), { ahora });
    expect(opciones).toEqual([{ producto: "tomate", unidad: "kilo", precio: 7, publicado: false }]);
    cambiarPublicado(opciones[0], true);
    expect(almacenPublicados.leer()).toEqual([{ producto: "tomate", unidad: "kilo", precio: 7 }]);
    expect(puestos(almacenPublicados.leer())[0].productos).toHaveLength(1);
    cambiarPublicado(opciones[0], false);
    expect(almacenPublicados.leer()).toEqual([]);
  });
});

describe("paso 2 del documento: venta y fiado en una frase", () => {
  const frase = "Vendí 2 kilos de papa a 9 pesos y Don Juan me debe 30";

  it("se parte en dos registros", () => {
    expect(dividirFrase(frase)).toEqual(["Vendí 2 kilos de papa a 9 pesos", "Don Juan me debe 30"]);
  });

  it.each([
    "Vendí dos kilos y medio de cebolla a cuarenta y cinco",
    "Juan se llevó fiado kilo y medio de papa a 9",
    "Compré veinte kilos de pollo a trescientos cuarenta pesos",
  ])("'%s' no se parte", (f) => expect(dividirFrase(f)).toEqual([f]));

  it("'Don Juan me debe 30' es una deuda sin detalle: suma en Me deben, no es venta de hoy", () => {
    const [primera, segunda] = dividirFrase(frase).map((f) => parsearFrase(f));
    expect(primera).toMatchObject({ tipo: "venta", producto: "papa", cantidad: 2, unidad: "kilo", total: 9, faltantes: [] });
    expect(segunda).toMatchObject({ tipo: "fiado", producto: "deuda", total: 30, cliente: "don Juan", soloDeuda: true, faltantes: [] });
    expect(resumirMovimiento(segunda)).toBe("Fiado · deuda · Bs 30 · don Juan");
    expect(describirCantidad(1, "unidad", "deuda")).toBe("deuda");

    const { faltantes: _a, ...v } = primera;
    const { faltantes: _b, ...d } = segunda;
    void _a; void _b;
    agregarMovimiento({ ...(v as Omit<Movimiento, "id" | "fecha">), fecha: new Date(2026, 10, 21, 9).toISOString() });
    agregarMovimiento({ ...(d as Omit<Movimiento, "id" | "fecha">), fecha: new Date(2026, 10, 21, 9, 1).toISOString() });
    const op = { ahora: new Date(2026, 10, 21, 18) };
    expect(deudas(op).map((x) => [x.cliente, x.total])).toEqual([["don Juan", 30]]);
    expect(ventasDelDia(op)).toBe(9);
    expect(gananciaDelDia(op).productosSinCosto).toEqual(["papa"]); // la deuda no aparece como "sin costo"
  });

  it("con producto sigue siendo un registro normal", () => {
    expect(parsearFrase("Doña Rosa me debe dos kilos de papa a 14")).toMatchObject({ tipo: "fiado", producto: "papa", cantidad: 2, total: 14 });
  });
});

describe("Modo demo completo", () => {
  it("trae los movimientos del demo de siempre (más compras de lechuga y zanahoria) y da los mismos números", () => {
    const d = datosDemoCompleto(ahora);
    const base = generarMovimientosDemo(ahora);
    expect(d.movimientos.slice(0, base.length)).toEqual(base);
    expect(d.movimientos.slice(base.length).map((m) => [m.tipo, m.producto])).toEqual([["compra", "lechuga"], ["compra", "zanahoria"]]);
    const fin = new Date(ahora.getTime() + 60_000);
    for (const op of [{ movimientos: base, ahora: fin }, { movimientos: d.movimientos, ahora: fin }]) {
      expect(ventasDelDia(op)).toBe(ventasDelDia({ movimientos: base, ahora: fin }));
      expect(gananciaDelDia(op)).toEqual(gananciaDelDia({ movimientos: base, ahora: fin }));
      expect(deudas({ ...op, pagos: [] }).map((x) => x.total)).toEqual(deudas({ movimientos: base, pagos: [], ahora: fin }).map((x) => x.total));
    }
  });

  it("con el demo completo, la bolsita de la familia no queda 'sin contar'", () => {
    cargarDemoCompleto(ahora);
    const r = reservar({ puestoId: PUESTO_PROPIO, familia: "Familia Gómez", items: [
      { producto: "lechuga", unidad: "unidad", precio: 5, cantidad: 2 },
      { producto: "zanahoria", unidad: "kilo", precio: 6, cantidad: 1 },
    ], pago: "qr", ahora });
    entregarReserva(r.id, ahora);
    expect(gananciaDelDia({ ahora: new Date(ahora.getTime() + 60_000) }).productosSinCosto).toEqual([]);
  });

  it("carga publicados, estrellas y reservas de ejemplo sin tocar el escenario", () => {
    cargarDemoCompleto(ahora);
    expect(obtenerMovimientos()).toHaveLength(generarMovimientosDemo(ahora).length + 2);
    expect(almacenReservas.leer().every((r) => r.ejemplo && r.estado === "reservada")).toBe(true);
    expect(promedioEstrellas(PUESTO_PROPIO, almacenCalificaciones.leer())).toEqual({ promedio: 4.7, cantidad: 3 });
    expect(almacenPublicados.leer().map((p) => p.producto)).toEqual(["tomate", "papa", "lechuga", "zanahoria"]);
    // el paso 3 del guion: compra de pollo a 340 → pierde Bs 4 por kilo
    agregarMovimiento({ tipo: "compra", producto: "pollo", cantidad: 20, unidad: "kilo", total: 340, pago: "efectivo", fecha: ahora.toISOString() });
    expect(revisarMargen("pollo", { ahora: new Date(ahora.getTime() + 60_000) })).toMatchObject({ diferenciaPorUnidad: -4 });
  });
});
