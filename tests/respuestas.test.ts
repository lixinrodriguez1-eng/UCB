import { describe, expect, it } from "vitest";
import type { Movimiento } from "@/types/movimiento";
import type { DatosMercado } from "@/types/datosMercado";
import { revisarMargen } from "@/lib/calculos";
import { datosMercadoPorDefecto } from "@/lib/datosMercado";
import { detectarPregunta } from "@/lib/preguntas";
import { fraseAlerta, montoHablado, pesosHablados, responderPregunta } from "@/lib/respuestas";
import { elegirVoz } from "@/lib/habla";

const dia = (d: number, h = 10) => new Date(2026, 10, d, h, 0, 0); // el 16 es lunes
let n = 0;
function mov(
  d: number, tipo: Movimiento["tipo"], producto: string, cantidad: number,
  unidad: string, total: number, cliente?: string,
): Movimiento {
  return {
    id: String(++n), fecha: dia(d).toISOString(), tipo, producto, cantidad, unidad, total,
    pago: "efectivo", ...(cliente ? { cliente } : {}),
  };
}

// Precio de referencia de PRUEBA (no es un dato real del mercado).
const datosPrueba: DatosMercado = {
  ...datosMercadoPorDefecto,
  preciosReferencia: [{ producto: "pollo", precio: 20.5, unidad: "kilo", fuente: "Fuente de prueba" }],
};

describe("fraseAlerta", () => {
  it("dice la frase de pérdida con el precio de mercado", () => {
    const movimientos = [mov(16, "compra", "pollo", 20, "kilo", 340), mov(17, "venta", "pollo", 3, "kilo", 39)];
    const alerta = revisarMargen("pollo", { movimientos, ahora: dia(17, 18), datos: datosPrueba })!;
    expect(fraseAlerta(alerta)).toBe(
      "Ojo, caserita: el kilo de pollo te sale a 17 pesos y lo vendes a 13. " +
        "Estás perdiendo 4 pesos por kilo. En el mercado ya está a 20 con 50.",
    );
  });

  it("margen bajo en centavos y sin referencia", () => {
    const movimientos = [mov(16, "compra", "queso", 10, "kilo", 100), mov(17, "venta", "queso", 1, "kilo", 10.4)];
    const alerta = revisarMargen("queso", { movimientos, ahora: dia(17, 18) })!;
    expect(fraseAlerta(alerta)).toBe(
      "Ojo, caserita: el kilo de queso te sale a 10 pesos y lo vendes a 10 con 40. Apenas ganas 40 centavos por kilo.",
    );
  });

  it("usa 'la' para unidades femeninas y habla en la unidad base", () => {
    // 2 docenas a Bs 24 = Bs 1 la unidad; media docena a Bs 5 = Bs 0,83 la unidad
    const movimientos = [
      mov(16, "compra", "pimentón", 2, "docena", 24),
      mov(17, "venta", "pimentón", 0.5, "docena", 5),
    ];
    const alerta = revisarMargen("pimentón", { movimientos, ahora: dia(17, 18) })!;
    expect(fraseAlerta(alerta)).toBe(
      // Con el precio real del JSON: Bs 22,50 la docena = Bs 1,88 la unidad.
      "Ojo, caserita: la unidad de pimentón te sale a 1 peso y lo vendes a 83 centavos. " +
        "Estás perdiendo 17 centavos por unidad. En el mercado ya está a 1 con 88.",
    );
  });
});

describe("montos hablados (punto 4: nunca '1,20 pesos')", () => {
  it.each([
    // valor, suelto ("lo vendes a …"), con pesos
    [21, "21", "21 pesos"],
    [17, "17", "17 pesos"],
    [1, "1", "1 peso"],
    [1.2, "1 con 20", "1 peso con 20 centavos"],
    [20.5, "20 con 50", "20 pesos con 50 centavos"],
    [139.8, "139 con 80", "139 pesos con 80 centavos"],
    [2.01, "2 pesos con 1 centavo", "2 pesos con 1 centavo"], // "2 con 1" sonaría a 2,10
    [6.08, "6 pesos con 8 centavos", "6 pesos con 8 centavos"],
    [0.4, "40 centavos", "40 centavos"],
    [0.01, "1 centavo", "1 centavo"],
    [-4, "4", "4 pesos"],
    [4.999, "5", "5 pesos"], // redondeo a centavos
  ])("%d → '%s' / '%s'", (valor, monto, pesos) => {
    expect(montoHablado(valor)).toBe(monto);
    expect(pesosHablados(valor)).toBe(pesos);
  });

  it("ningún monto hablado lleva coma decimal", () => {
    for (let c = 0; c < 2000; c += 7) {
      expect(pesosHablados(c / 100)).not.toMatch(/\d,\d/);
      expect(montoHablado(c / 100)).not.toMatch(/\d,\d/);
    }
  });

  it("¿cuánto gané hoy? con centavos", () => {
    const movs = [
      { id: "c", fecha: new Date(2026, 10, 18, 6).toISOString(), tipo: "compra" as const, producto: "papa", cantidad: 10, unidad: "kilo", total: 48.8, pago: "efectivo" as const },
      { id: "v", fecha: new Date(2026, 10, 18, 9).toISOString(), tipo: "venta" as const, producto: "papa", cantidad: 1, unidad: "kilo", total: 6.08, pago: "efectivo" as const },
    ];
    expect(responderPregunta("ganancia-hoy", { movimientos: movs, pagos: [], ahora: new Date(2026, 10, 18, 18) }).hablado).toBe(
      "Hoy ganaste 1 peso con 20 centavos, caserita. Vendiste 6 pesos con 8 centavos y la mercadería te costó 4 con 88.",
    );
  });
});

describe("detectarPregunta", () => {
  it.each([
    ["¿Cuánto gané hoy?", "ganancia-hoy"],
    ["cuanto gane hoy", "ganancia-hoy"],
    ["¿Cuánto gané esta semana?", "ganancia-semana"],
    ["CUÁNTO GANÉ ESTA SEMANA", "ganancia-semana"],
    ["¿Qué me deja más?", "mas-rentable"],
    ["qué producto me deja más plata", "mas-rentable"],
    ["¿Quién me debe?", "deudores"],
    ["quienes me deben", "deudores"],
    ["¿Cuánto me deben?", "deudores"],
  ])("%s → %s", (frase, esperado) => {
    expect(detectarPregunta(frase)).toBe(esperado);
  });

  it.each([
    "Vendí 3 kilos de tomate a 21",
    "La doña Rosa se llevó apuntado un pollo entero a 41",
    "Doña Rosa me debe dos kilos de papa a 14",
    "",
  ])("'%s' no es pregunta", (frase) => {
    expect(detectarPregunta(frase)).toBeNull();
  });
});

describe("responderPregunta", () => {
  const movimientos = [
    mov(16, "compra", "pollo", 20, "kilo", 200), // Bs 10/kg
    mov(16, "compra", "queso", 10, "kilo", 100), // Bs 10/kg
    mov(17, "venta", "pollo", 3, "kilo", 45),    // gana 15
    mov(17, "venta", "queso", 2, "kilo", 28),    // gana 8
    mov(18, "fiado", "pollo", 2, "kilo", 30, "doña Rosa"), // gana 10
    mov(18, "fiado", "queso", 1, "kilo", 14, "don Pedro"), // gana 4
    mov(18, "fiado", "pollo", 1, "kilo", 15, "Doña Rosa"),
    mov(18, "venta", "charque", 1, "kilo", 80), // sin compra
  ];
  const op = { movimientos, ahora: dia(18, 18) };

  it("¿cuánto gané hoy?", () => {
    const r = responderPregunta("ganancia-hoy", op);
    expect(r.titulo).toBe("Hoy ganaste Bs 19");
    expect(r.lineas).toEqual(["Vendiste Bs 59", "La mercadería te costó Bs 40"]);
    expect(r.hablado).toBe(
      "Hoy ganaste 19 pesos, caserita. Vendiste 59 y la mercadería te costó 40. " +
        "No estoy contando charque porque no sé a cuánto lo compraste.",
    );
  });

  it("¿cuánto gané esta semana?", () => {
    const r = responderPregunta("ganancia-semana", op);
    expect(r.titulo).toBe("Esta semana ganaste Bs 42");
  });

  it("¿qué me deja más?", () => {
    const r = responderPregunta("mas-rentable", op);
    expect(r.titulo).toBe("Lo que más te deja: pollo");
    expect(r.lineas).toEqual(["pollo: ganas Bs 30", "queso: ganas Bs 12"]);
    expect(r.hablado).toBe(
      "Lo que más te deja esta semana es pollo: 30 pesos de ganancia. Le sigue queso con 12 pesos.",
    );
  });

  it("¿quién me debe? junta al mismo cliente aunque cambie la mayúscula", () => {
    const r = responderPregunta("deudores", op);
    expect(r.titulo).toBe("Te deben Bs 59");
    expect(r.lineas).toEqual(["doña Rosa: Bs 45", "don Pedro: Bs 14"]);
    expect(r.hablado).toBe("Te deben 59 pesos en total. doña Rosa, 45 pesos y don Pedro, 14 pesos.");
  });

  it("con una sola deudora no repite el monto", () => {
    const uno = [mov(18, "fiado", "pollo", 2, "kilo", 30, "doña Rosa")];
    const r = responderPregunta("deudores", { movimientos: uno, ahora: dia(18, 18) });
    expect(r.titulo).toBe("Doña Rosa te debe Bs 30");
    expect(r.hablado).toBe("Doña Rosa te debe 30 pesos, caserita.");
  });

  it("sin datos responde amable", () => {
    const vacio = { movimientos: [], ahora: dia(18, 18) };
    expect(responderPregunta("ganancia-hoy", vacio).hablado).toBe("Hoy todavía no registraste ventas, caserita.");
    expect(responderPregunta("deudores", vacio).titulo).toBe("Nadie te debe");
    expect(responderPregunta("mas-rentable", vacio).titulo).toBe("Todavía no puedo comparar");
  });

  it("pérdida del día", () => {
    const perdida = [mov(18, "compra", "pollo", 10, "kilo", 170), mov(18, "venta", "pollo", 3, "kilo", 39)];
    expect(responderPregunta("ganancia-hoy", { movimientos: perdida, ahora: dia(18, 18) }).titulo)
      .toBe("Hoy vas perdiendo Bs 12");
  });
});

describe("elegirVoz", () => {
  const voz = (lang: string) => ({ lang, name: lang });
  it.each([
    [["es-ES", "es-MX", "es-BO"], "es-BO"],
    [["es-ES", "es-419", "es-MX"], "es-419"],
    [["en-US", "es-ES", "es-MX"], "es-MX"],
    [["es-ES", "es_US"], "es_US"],
    [["es-ES", "es-AR"], "es-AR"],
    [["en-US", "es-ES"], "es-ES"],
  ])("%j → %s", (langs, esperado) => {
    expect(elegirVoz(langs.map(voz))?.lang).toBe(esperado);
  });

  it("sin voces en español no elige ninguna", () => {
    expect(elegirVoz([voz("en-US")])).toBeUndefined();
  });
});
