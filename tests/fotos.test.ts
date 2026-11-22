import { describe, expect, it } from "vitest";
import { CATALOGO, CATEGORIAS, idProducto } from "@/data/catalogo";
import creditos from "@/data/creditos-fotos.json";
import { imagenProducto } from "@/lib/catalogo";
import {
  elegirFoto,
  idProducto as idDelScript,
  leerClave,
  normalizarPixabay,
  PROVEEDORES,
  TERMINOS as TERMINOS_JS,
  TERMINOS_CATEGORIA,
} from "../scripts/descargar-fotos.mjs";

const TERMINOS = TERMINOS_JS as unknown as Record<string, [string, string[]] | null>;
const sinFoto = creditos.sin_foto as { producto: string; categoria: string }[];

describe("script de fotos y catálogo", () => {
  it("el script y la app calculan el mismo id de archivo", () => {
    for (const p of CATALOGO) expect(idDelScript(p.nombre)).toBe(idProducto(p.nombre));
    expect(idProducto("plátano beniano")).toBe("platano-beniano");
    expect(idProducto("ají amarillo")).toBe("aji-amarillo");
  });

  it("cada producto del catálogo tiene un término decidido (en inglés o null = sin foto)", () => {
    const faltan = CATALOGO.filter((p) => !(p.nombre in TERMINOS)).map((p) => p.nombre);
    expect(faltan).toEqual([]);
    expect(Object.keys(TERMINOS_CATEGORIA).sort()).toEqual(CATEGORIAS.map((c) => c.id).sort());
  });

  it("los términos pedidos están como se pidió", () => {
    expect(TERMINOS.tomate?.[0]).toBe("tomatoes market");
    expect(TERMINOS.locoto?.[0]).toBe("red hot chili pepper");
    expect(TERMINOS.vainita?.[0]).toBe("green beans");
    expect(TERMINOS.choclo?.[0]).toBe("corn cob");
    expect(TERMINOS.yuca?.[0]).toBe("cassava root");
    expect(TERMINOS["plátano beniano"]?.[0]).toBe("plantain bananas");
    expect(TERMINOS["queso menonita"]?.[0]).toBe("fresh white cheese");
    expect(TERMINOS.charque?.[0]).toBe("dried beef jerky");
    expect(TERMINOS.pollo?.[0]).toBe("raw chicken market");
    expect(TERMINOS.papa?.[0]).toBe("potatoes market");
    for (const nombre of ["motacú", "achojcha", "hualusa"]) expect(TERMINOS[nombre]).toBeNull();
  });
});

describe("proveedores (Pexels o Pixabay)", () => {
  it("lee la clave correcta de .env.local", () => {
    const env = "OTRA=1\r\nPIXABAY_API_KEY = 'abc123'\n";
    expect(leerClave(env, "PIXABAY_API_KEY")).toBe("abc123");
    expect(leerClave(env, "PEXELS_API_KEY")).toBe("");
  });

  it("Pixabay: etiquetas como descripción, autor con enlace y tamaño medio", () => {
    const hit = {
      id: 7, pageURL: "https://pixabay.com/photos/potatoes-7/", tags: "potatoes, vegetables, market",
      webformatURL: "https://cdn.pixabay.com/w.jpg", webformatWidth: 640, webformatHeight: 427,
      largeImageURL: "https://cdn.pixabay.com/l.jpg", user: "ana", user_id: 42,
    };
    expect(normalizarPixabay(hit)).toEqual({
      id: 7, alt: "potatoes, vegetables, market", autor: "ana", autorUrl: "https://pixabay.com/users/ana-42/",
      url: "https://pixabay.com/photos/potatoes-7/", descarga: "https://cdn.pixabay.com/w.jpg",
    });
    expect(normalizarPixabay({ ...hit, webformatWidth: 200 }).descarga).toBe("https://cdn.pixabay.com/l.jpg");
    expect(elegirFoto([normalizarPixabay({ ...hit, tags: "papaya, fruit" }), normalizarPixabay(hit)], ["potato"])?.id).toBe(7);
  });

  it("licencias de cada proveedor", () => {
    expect(PROVEEDORES.pixabay.licencia).toBe("https://pixabay.com/service/license-summary/");
    expect(PROVEEDORES.pexels.licencia).toBe("https://www.pexels.com/license/");
  });
});

describe("elegirFoto", () => {
  const foto = (id: number, alt: string) => ({ id, alt });

  it("no elige papaya para papa", () => {
    const fotos = [foto(1, "Sliced papaya on a plate"), foto(2, "Potatoes in a crate at the market")];
    expect(elegirFoto(fotos, ["potato"])?.id).toBe(2);
  });

  it("descarta fotos con personas", () => {
    const fotos = [foto(1, "Woman holding tomatoes"), foto(2, "Red tomatoes close-up")];
    expect(elegirFoto(fotos, ["tomato"])?.id).toBe(2);
  });

  it("prefiere fotos de mercado o de producto solo", () => {
    const fotos = [foto(1, "Tomato sauce pasta"), foto(2, "Fresh tomatoes at a market stall")];
    expect(elegirFoto(fotos, ["tomato"])?.id).toBe(2);
  });

  it("si nada sirve, no inventa", () => {
    expect(elegirFoto([foto(1, "A man selling fruit"), foto(2, "Landscape")], ["motacu"])).toBeNull();
  });

  it("respeta las fotos marcadas para evitar", () => {
    const fotos = [foto(1, "Potatoes market"), foto(2, "Potatoes pile")];
    expect(elegirFoto(fotos, ["potato"], [1])?.id).toBe(2);
  });
});

describe("fotos en la app", () => {
  const hayFotos = creditos.categorias.length === CATEGORIAS.length;

  it.runIf(hayFotos)("todo producto del catálogo tiene foto: propia o de su categoría", () => {
    for (const p of CATALOGO) expect(p.imagen, p.nombre).toMatch(/^\/productos\/.+\.webp$/);
  });

  it.runIf(hayFotos)("los sin_foto usan la foto de su categoría", () => {
    for (const s of sinFoto) expect(imagenProducto(s.producto)).toEqual({ src: `/productos/categoria-${s.categoria}.webp`, deCategoria: true });
  });

  it.runIf(hayFotos)("un producto nuevo dicho por voz usa la foto de su categoría", () => {
    expect(imagenProducto("cosa rarísima de la feria")?.deCategoria).toBe(true);
  });

  it("sin fotos descargadas no rompe nada (se muestra el ícono)", () => {
    if (!hayFotos) expect(imagenProducto("tomate")).toBeNull();
    else expect(imagenProducto("tomate")?.src).toBe("/productos/tomate.webp");
  });
});
