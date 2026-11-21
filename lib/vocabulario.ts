import type { Vocabulario } from "@/types/vocabulario";
import { datosReales, productosDelJson } from "@/lib/datosReales";

// Copia local (sin importar el parser, que a su vez importa este archivo).
const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/**
 * Vocabulario base de mercados de Santa Cruz. Se completa abajo con los
 * productos y unidades de /data/caserita-datos-reales.json.
 */
const vocabularioBase: Vocabulario = {
  unidades: [
    { nombre: "kilo", sinonimos: ["kg", "kgs", "kilogramo", "kilito"] },
    { nombre: "arroba" },
    { nombre: "libra", sinonimos: ["lb", "lbs"] },
    { nombre: "quintal", sinonimos: ["qq"] },
    { nombre: "docena" },
    { nombre: "unidad", sinonimos: ["pieza"] },
    { nombre: "caja" },
    { nombre: "cajón" },
    { nombre: "bolsa" },
    { nombre: "paquete" },
    { nombre: "maple" },
    { nombre: "amarro" },
    { nombre: "litro" },
    { nombre: "botella" },
  ],
  productos: [
    { nombre: "pollo" },
    { nombre: "carne de res", sinonimos: ["res", "carne"] },
    { nombre: "carne de cerdo", sinonimos: ["cerdo", "chancho", "carne de chancho"] },
    { nombre: "charque" },
    { nombre: "chorizo" },
    { nombre: "huevo" },
    { nombre: "leche" },
    { nombre: "queso" },
    { nombre: "tomate" },
    { nombre: "papa" },
    { nombre: "cebolla" },
    { nombre: "pimentón", sinonimos: ["morrón"] },
    { nombre: "zanahoria" },
    { nombre: "locoto" },
    { nombre: "ajo" },
    { nombre: "lechuga" },
    { nombre: "repollo" },
    { nombre: "pepino" },
    { nombre: "zapallo" },
    { nombre: "yuca" },
    { nombre: "plátano" },
    { nombre: "guineo" },
    { nombre: "choclo" },
    { nombre: "maíz" },
    { nombre: "arroz" },
    { nombre: "azúcar" },
    { nombre: "fideo" },
    { nombre: "aceite" },
    { nombre: "harina" },
    { nombre: "frejol", sinonimos: ["frijol", "poroto"] },
    { nombre: "arveja" },
    { nombre: "maní" },
    { nombre: "limón" },
    { nombre: "naranja" },
    { nombre: "mandarina" },
    { nombre: "papaya" },
    { nombre: "sandía" },
    { nombre: "piña" },
    { nombre: "manzana" },
    { nombre: "uva" },
    { nombre: "achachairú" },
    { nombre: "cilantro" },
    { nombre: "perejil" },
  ],
};

/** Agrega lo del JSON que no esté ya (comparando sin tildes ni mayúsculas). */
function unirConJson(base: Vocabulario): Vocabulario {
  const tiene = (lista: { nombre: string; sinonimos?: string[] }[], nombre: string) =>
    lista.some((x) => [x.nombre, ...(x.sinonimos ?? [])].some((n) => normalizar(n) === normalizar(nombre)));
  const productos = [...base.productos];
  for (const nombre of productosDelJson()) {
    if (!tiene(productos, nombre)) productos.push({ nombre });
  }
  const unidades = [...base.unidades];
  for (const nombre of Object.keys(datosReales.unidades_locales)) {
    // "media docena" ya la entiende el lector de números ("media" + "docena").
    if (nombre.includes(" ")) continue;
    if (!tiene(unidades, nombre)) unidades.push({ nombre });
  }
  return { productos, unidades };
}

export const vocabularioPorDefecto: Vocabulario = unirConJson(vocabularioBase);
