import { beforeEach, describe, expect, it } from "vitest";
import { parsearFrase } from "@/lib/parser";
import { establecerCategoriaProducto, obtenerMisProductos, recordarProducto, resolverCategoria } from "@/lib/catalogo";
import { agregarMovimiento, reemplazarMovimientos } from "@/lib/storage";

function asegurarLocalStorage() {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
    },
    configurable: true,
  });
}

describe("categorias", () => {
  beforeEach(() => {
    asegurarLocalStorage();
    localStorage.clear();
    reemplazarMovimientos([]);
  });

  it("asigna categorías pedidas", () => {
    expect(resolverCategoria("vainita").categoria).toBe("verduras");
    expect(resolverCategoria("queso menonita").categoria).toBe("lacteos");
    expect(resolverCategoria("costilla de cerdo").categoria).toBe("carnes");
    expect(resolverCategoria("detergente").categoria).toBe("limpieza");
    expect(resolverCategoria("chuño").categoria).toBe("tuberculos");
  });

  it("tomatito va a Verduras", () => {
    expect(resolverCategoria("tomatito").categoria).toBe("verduras");
  });

  it("palabra inventada va a Otros sin preguntar", () => {
    const r = parsearFrase("Vendí 1 unidad de xyzabc a 5");
    expect(r.categoria).toBe("otros");
    expect(r.faltantes).toEqual([]);
  });

  it("producto nuevo se recuerda la segunda vez", () => {
    recordarProducto("sajta rara", "otros");
    const antes = resolverCategoria("sajta rara").categoria;
    establecerCategoriaProducto("sajta rara", "abarrotes");
    const despues = resolverCategoria("sajta rara").categoria;
    expect(antes).toBe("otros");
    expect(despues).toBe("abarrotes");
  });

  it("cambio manual se recuerda", () => {
    agregarMovimiento({ tipo: "venta", producto: "producto raro", categoria: "abarrotes", cantidad: 1, unidad: "unidad", total: 10, pago: "efectivo" });
    establecerCategoriaProducto("producto raro", "limpieza");
    expect(obtenerMisProductos().find((p) => p.nombre.toLowerCase().includes("producto raro"))?.categoria).toBe("limpieza");
    expect(resolverCategoria("producto raro").categoria).toBe("limpieza");
  });

  it("parser agrega categoria a vainita nueva", () => {
    const r = parsearFrase("Vendí dos kilos de vainita a quince");
    expect(r.producto).toBe("vainita");
    expect(r.categoria).toBe("verduras");
    expect(r.total).toBe(15);
  });

  it("registro manual por categoría expone productos de la categoría", async () => {
    const { productosPorCategoria } = await import("@/lib/catalogo");
    const verduras = productosPorCategoria("verduras");
    expect(verduras).toContain("vainita");
    expect(verduras).toContain("tomate");
  });
});
