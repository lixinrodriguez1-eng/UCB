import { describe, expect, it } from "vitest";
import { obtenerCelulares, sinCelulares } from "@/lib/contactos";

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

describe("contactos cache", () => {
  it("obtenerCelulares devuelve misma referencia si no cambió", () => {
    asegurarLocalStorage();
    localStorage.clear();
    localStorage.setItem("caserita:celulares", JSON.stringify({ rosa: "59171234567" }));
    const a = obtenerCelulares();
    const b = obtenerCelulares();
    expect(a).toBe(b);
    expect(sinCelulares()).toBe(sinCelulares());
  });
});
