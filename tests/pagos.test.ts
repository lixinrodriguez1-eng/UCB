import { describe, expect, it } from "vitest";
import type { Movimiento, Pago } from "@/types/movimiento";
import { claveCliente, deudas, nombreCliente } from "@/lib/calculos";
import { buscarDeudor, detectarPago, montoAPagar } from "@/lib/pagos";
import { generarMovimientosDemo } from "@/lib/demo";
import { parsearFrase } from "@/lib/parser";
import { detectarPregunta } from "@/lib/preguntas";
import { fraseSaldo, responderPregunta } from "@/lib/respuestas";
import { mensajeCobro } from "@/lib/cobros";

const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString(); // el 16 es lunes
const ahora = new Date(2026, 10, 19, 18);
let n = 0;
const fiado = (d: number, producto: string, total: number, cliente: string): Movimiento => ({
  id: `f${++n}`, fecha: dia(d), tipo: "fiado", producto, cantidad: 1, unidad: "kilo", total, pago: "efectivo", cliente,
});
const pago = (d: number, cliente: string, monto: number, h = 12): Pago => ({
  id: `p${++n}`, fecha: dia(d, h), cliente, monto, pago: "efectivo",
});

// doña Rosa: pollo 26 (lunes) + pollo 15 (martes) = 41 · don Pedro: queso 13 · Rosa Mamani: papa 10
const movimientos = [
  fiado(16, "pollo", 26, "doña Rosa"),
  fiado(17, "pollo", 15, "doña Rosa"),
  fiado(17, "queso", 13, "don Pedro"),
];

describe("detectarPago", () => {
  it.each([
    ["doña Rosa me pagó 20", { nombre: "doña Rosa", monto: 20, todo: false, pago: "efectivo" }],
    ["la Rosa ya me pagó todo", { nombre: "Rosa", monto: undefined, todo: true, pago: "efectivo" }],
    ["me pagó 20 la doña Rosa por QR", { nombre: "doña Rosa", monto: 20, todo: false, pago: "qr" }],
    ["Don Pedro me pagó veinte pesos", { nombre: "don Pedro", monto: 20, todo: false, pago: "efectivo" }],
    ["DOÑA ROSA ME PAGO 20", { nombre: "doña Rosa", monto: 20, todo: false, pago: "efectivo" }],
    ["me canceló la doña Carmen", { nombre: "doña Carmen", monto: undefined, todo: true, pago: "efectivo" }],
    ["doña Rosa me pagó diez y medio", { nombre: "doña Rosa", monto: 10.5, todo: false, pago: "efectivo" }],
    ["me pagó 15", { nombre: undefined, monto: 15, todo: false, pago: "efectivo" }],
  ])("%s", (frase, esperado) => {
    expect(detectarPago(frase)).toEqual(esperado);
  });

  it.each([
    "Vendí 3 kilos de tomate a 21 pago con QR",
    "Compré una arroba de papa a 50",
    "¿Quién me pagó?",
    "¿cuánto me pagaron hoy?",
    "doña Rosa me debe 20",
    "¿Cuánto gané hoy?",
  ])("'%s' no es un pago", (frase) => {
    expect(detectarPago(frase)).toBeNull();
  });
});

describe("nombreCliente", () => {
  it.each([
    ["Doña rosa", "doña Rosa"], ["DOÑA ROSA", "doña Rosa"], ["don pedro", "don Pedro"], ["  rosa  ", "Rosa"],
  ])("%s → %s", (entrada, esperado) => expect(nombreCliente(entrada)).toBe(esperado));
});

describe("buscarDeudor", () => {
  const lista = deudas({ movimientos: [...movimientos, fiado(18, "papa", 10, "Rosa Mamani")], pagos: [], ahora });

  it("nombre exacto", () => {
    expect(buscarDeudor("doña Rosa", lista).deudor?.cliente).toBe("doña Rosa");
  });

  it("sin título y con mayúsculas distintas", () => {
    expect(buscarDeudor("don pedro", lista).deudor?.cliente).toBe("don Pedro");
    expect(buscarDeudor("Pedro", lista).deudor?.cliente).toBe("don Pedro");
  });

  it("'Rosa' es doña Rosa, no Rosa Mamani", () => {
    expect(buscarDeudor("Rosa", lista).deudor?.cliente).toBe("doña Rosa");
    expect(buscarDeudor("la Rosa", lista).deudor?.cliente).toBe("doña Rosa");
  });

  it("si hay dos Rosas con apellido, pide elegir", () => {
    const dos = deudas({
      movimientos: [fiado(18, "papa", 10, "Rosa Mamani"), fiado(18, "pollo", 13, "Rosa Quispe")],
      pagos: [],
      ahora,
    });
    const r = buscarDeudor("Rosa", dos);
    expect(r.deudor).toBeUndefined();
    expect(r.candidatos.map((d) => d.cliente).sort()).toEqual(["Rosa Mamani", "Rosa Quispe"]);
  });

  it("con apellido la encuentra", () => {
    expect(buscarDeudor("Rosa Mamani", lista).deudor?.cliente).toBe("Rosa Mamani");
  });

  it("nadie con ese nombre", () => {
    expect(buscarDeudor("Juana", lista)).toEqual({ candidatos: [] });
  });

  it("sin nombre: todos son candidatos", () => {
    expect(buscarDeudor(undefined, lista).candidatos).toHaveLength(3);
  });
});

describe("deudas con pagos", () => {
  it("pago parcial: doña Rosa debía 41, pagó 20, ahora debe 21", () => {
    const [rosa] = deudas({ movimientos, pagos: [pago(19, "doña Rosa", 20)], ahora });
    expect(rosa).toMatchObject({ cliente: "doña Rosa", total: 21, apuntado: 41, pagado: 20 });
    expect(fraseSaldo(rosa.cliente, rosa.total)).toBe("Listo, doña Rosa ahora te debe 21 pesos.");
  });

  it("el pago cubre primero el apunte más viejo", () => {
    const [rosa] = deudas({ movimientos, pagos: [pago(19, "doña Rosa", 26)], ahora });
    expect(rosa.total).toBe(15);
    expect(rosa.apuntes.map((a) => a.total)).toEqual([15]);
    expect(rosa.fiados).toBe(1);
  });

  it("un pago parcial deja el apunte a medias en la lista", () => {
    const [rosa] = deudas({ movimientos, pagos: [pago(19, "doña Rosa", 10)], ahora });
    expect(rosa.apuntes.map((a) => a.total)).toEqual([15, 26]);
    expect(mensajeCobro(rosa)).toBe("Hola doña Rosa, le recuerdo los Bs 31 del pollo 🙂");
  });

  it("quien paga todo sale de la lista", () => {
    const lista = deudas({ movimientos, pagos: [pago(19, "doña Rosa", 41)], ahora });
    expect(lista.map((d) => d.cliente)).toEqual(["don Pedro"]);
    expect(fraseSaldo("doña Rosa", 0)).toBe("Listo, doña Rosa ya no te debe nada.");
  });

  it("varios pagos se suman, aunque el nombre esté escrito distinto", () => {
    const [rosa] = deudas({ movimientos, pagos: [pago(18, "Doña rosa", 10), pago(19, "doña Rosa", 5)], ahora });
    expect(rosa.total).toBe(26);
  });

  it("los pagos de después de 'ahora' no cuentan", () => {
    const [rosa] = deudas({ movimientos, pagos: [pago(20, "doña Rosa", 20)], ahora });
    expect(rosa.total).toBe(41);
  });

  it("¿quién me debe? ya descuenta los pagos", () => {
    const r = responderPregunta("deudores", { movimientos, pagos: [pago(19, "doña Rosa", 20)], ahora });
    expect(r.lineas).toEqual(["doña Rosa: Bs 21", "don Pedro: Bs 13"]);
    expect(r.titulo).toBe("Te deben Bs 34");
  });

  it("los pagos no cambian la ganancia ni las preguntas de ganancia", () => {
    expect(detectarPregunta("doña Rosa me pagó 20")).toBeNull();
  });
});

describe("montoAPagar", () => {
  const [rosa] = deudas({ movimientos, pagos: [], ahora });
  it("todo = lo que debe", () => expect(montoAPagar({ todo: true }, rosa)).toBe(41));
  it("parcial", () => expect(montoAPagar({ todo: false, monto: 20 }, rosa)).toBe(20));
  it("nunca más de lo que debe", () => expect(montoAPagar({ todo: false, monto: 100 }, rosa)).toBe(41));
  it("sin monto", () => expect(montoAPagar({ todo: false }, rosa)).toBeUndefined());
});

describe("punto 2: saldo de doña Rosa (86 en vez de 21)", () => {
  it("el nombre se normaliza: doña Rosa, la Rosa, Rosa y DOÑA ROSA son la misma clienta", () => {
    const claves = ["doña Rosa", "la Rosa", "Rosa", "DOÑA ROSA", "Doña rosa"].map(claveCliente);
    expect(new Set(claves)).toEqual(new Set(["rosa"]));
    expect(claveCliente("Rosa Mamani")).toBe("rosa mamani");
    expect(nombreCliente("la Rosa")).toBe("Rosa");
  });

  it("apuntes a 'Rosa' y a 'doña Rosa' se suman y se muestra con el título", () => {
    const lista = deudas({
      movimientos: [fiado(17, "papa", 10, "Rosa"), fiado(18, "pollo", 41, "doña Rosa"), fiado(18, "tomate", 7, "la Rosa")],
      pagos: [pago(19, "Rosa", 20)],
      ahora,
    });
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ cliente: "doña Rosa", apuntado: 58, pagado: 20, total: 38 });
  });

  it("causa: el modo demo traía apuntes de doña Rosa; ya no", () => {
    const demo = generarMovimientosDemo(new Date(2026, 10, 21, 10));
    expect(demo.filter((m) => claveCliente(m.cliente ?? "") === "rosa")).toEqual([]);
  });

  it("guion del demo: apuntado 41 → pago 20 → debe 21", () => {
    const hoy = new Date(2026, 10, 21, 10);
    const demo = generarMovimientosDemo(hoy);

    const frase = parsearFrase("La doña Rosa se llevó apuntado un pollo entero a 41");
    const apunte: Movimiento = {
      id: "apunte", fecha: new Date(2026, 10, 21, 9, 50).toISOString(),
      tipo: frase.tipo!, producto: frase.producto!, cantidad: frase.cantidad!, unidad: frase.unidad!,
      total: frase.total!, cliente: frase.cliente, pago: frase.pago!,
    };
    const antes = deudas({ movimientos: [...demo, apunte], pagos: [], ahora: hoy });
    const rosa = antes.find((d) => claveCliente(d.cliente) === "rosa")!;
    expect(rosa.total).toBe(41);

    const dicho = detectarPago("doña Rosa me pagó 20")!;
    const destino = buscarDeudor(dicho.nombre, antes).deudor!;
    const elPago: Pago = { id: "pago", fecha: new Date(2026, 10, 21, 9, 55).toISOString(), cliente: destino.cliente, monto: montoAPagar(dicho, destino)!, pago: dicho.pago };

    const despues = deudas({ movimientos: [...demo, apunte], pagos: [elPago], ahora: hoy });
    const saldo = despues.find((d) => claveCliente(d.cliente) === "rosa")!.total;
    expect(saldo).toBe(21);
    expect(fraseSaldo(destino.cliente, saldo)).toBe("Listo, doña Rosa ahora te debe 21 pesos.");
  });

  it("también funciona con 'la Rosa ya me pagó todo'", () => {
    const lista = deudas({ movimientos: [fiado(18, "pollo entero", 41, "doña Rosa")], pagos: [], ahora });
    const dicho = detectarPago("la Rosa ya me pagó todo")!;
    const destino = buscarDeudor(dicho.nombre, lista).deudor!;
    expect(destino.cliente).toBe("doña Rosa");
    expect(montoAPagar(dicho, destino)).toBe(41);
  });
});
