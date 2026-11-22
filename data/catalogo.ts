import creditosFotos from "./creditos-fotos.json";

export interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  /** Foto de la categoría (Pexels), si se descargó. */
  imagen?: string;
}

/** Id para archivos: "plátano beniano" → "platano-beniano". */
export function idProducto(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Fotos descargadas por scripts/descargar-fotos.mjs (ver data/creditos-fotos.json).
const FOTOS_PRODUCTO = new Map<string, string>(creditosFotos.productos.map((f: { id: string; archivo: string }) => [f.id, f.archivo]));
const FOTOS_CATEGORIA = new Map<string, string>(creditosFotos.categorias.map((f: { id: string; archivo: string }) => [f.id, f.archivo]));

const CATEGORIAS_BASE: Categoria[] = [
  { id: "verduras", nombre: "Verduras", icono: "🥬" },
  { id: "frutas", nombre: "Frutas", icono: "🍎" },
  { id: "tuberculos", nombre: "Tubérculos y granos", icono: "🥔" },
  { id: "carnes", nombre: "Carnes y pollo", icono: "🍗" },
  { id: "lacteos", nombre: "Lácteos y huevos", icono: "🧀" },
  { id: "abarrotes", nombre: "Abarrotes", icono: "🛒" },
  { id: "limpieza", nombre: "Limpieza y otros", icono: "🧴" },
  { id: "otros", nombre: "Otros", icono: "📦" },
];

export const CATEGORIAS: Categoria[] = CATEGORIAS_BASE.map((c) => {
  const imagen = FOTOS_CATEGORIA.get(`categoria-${c.id}`);
  return imagen ? { ...c, imagen } : c;
});

export const CATEGORIA_OTROS = "otros";

export function categoriaPorId(id?: string): Categoria {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function etiquetaCategoria(id?: string): string {
  const c = categoriaPorId(id);
  return `${c.icono} ${c.nombre}`;
}

export interface ProductoCatalogo {
  nombre: string;
  categoria: string;
  sinonimos?: string[];
  /**
   * Foto del producto (Pexels, 300×300 webp en /public/productos). Si no hubo
   * una foto buena, la de su categoría.
   */
  imagen?: string;
}

const CATALOGO_BASE: ProductoCatalogo[] = [
  { nombre: "tomate", categoria: "verduras", sinonimos: ["tomates", "tomatito", "tomatitos"] },
  { nombre: "cebolla", categoria: "verduras", sinonimos: ["cebollas", "cebolla blanca", "cebolla roja"] },
  { nombre: "cebolla en hoja", categoria: "verduras", sinonimos: ["cebolla verde"] },
  { nombre: "cebollín", categoria: "verduras", sinonimos: ["cebollin", "cebolleta"] },
  { nombre: "locoto", categoria: "verduras", sinonimos: ["locotos", "aji locoto"] },
  { nombre: "pimentón", categoria: "verduras", sinonimos: ["pimenton", "morrón", "morron", "pimiento"] },
  { nombre: "zanahoria", categoria: "verduras", sinonimos: ["zanahorias"] },
  { nombre: "pepino", categoria: "verduras", sinonimos: ["pepinos"] },
  { nombre: "lechuga", categoria: "verduras", sinonimos: ["lechugas"] },
  { nombre: "repollo", categoria: "verduras", sinonimos: ["repollos"] },
  { nombre: "brócoli", categoria: "verduras", sinonimos: ["brocoli", "brocolis"] },
  { nombre: "coliflor", categoria: "verduras" },
  { nombre: "acelga", categoria: "verduras" },
  { nombre: "espinaca", categoria: "verduras" },
  { nombre: "perejil", categoria: "verduras" },
  { nombre: "cilantro", categoria: "verduras" },
  { nombre: "apio", categoria: "verduras" },
  { nombre: "vainita", categoria: "verduras", sinonimos: ["vainitas", "ejote", "chaucha"] },
  { nombre: "arveja", categoria: "verduras", sinonimos: ["arvejas", "alverja"] },
  { nombre: "haba", categoria: "verduras", sinonimos: ["habas"] },
  { nombre: "choclo", categoria: "verduras", sinonimos: ["choclos", "elote"] },
  { nombre: "zapallo", categoria: "verduras", sinonimos: ["zapallos", "ahuyama", "calabaza"] },
  { nombre: "zapallito", categoria: "verduras", sinonimos: ["zapallitos"] },
  { nombre: "achojcha", categoria: "verduras", sinonimos: ["achojchas", "caigua"] },
  { nombre: "rábano", categoria: "verduras", sinonimos: ["rabano", "rabanos"] },
  { nombre: "beterraga", categoria: "verduras", sinonimos: ["remolacha"] },
  { nombre: "nabo", categoria: "verduras" },
  { nombre: "vaina", categoria: "verduras" },
  { nombre: "ají amarillo", categoria: "verduras", sinonimos: ["aji amarillo"] },
  { nombre: "ají rojo", categoria: "verduras", sinonimos: ["aji rojo"] },
  { nombre: "puerro", categoria: "verduras" },
  { nombre: "albahaca", categoria: "verduras" },
  { nombre: "hierba buena", categoria: "verduras", sinonimos: ["hierbabuena"] },
  { nombre: "orégano fresco", categoria: "verduras", sinonimos: ["oregano fresco"] },
  { nombre: "quirquiña", categoria: "verduras", sinonimos: ["quirquina"] },
  { nombre: "huacataya", categoria: "verduras" },
  { nombre: "wacataya", categoria: "verduras" },
  { nombre: "chile", categoria: "verduras" },
  { nombre: "palta", categoria: "verduras", sinonimos: ["paltas", "aguacate"] },
  { nombre: "plátano", categoria: "frutas", sinonimos: ["platano", "platanos"] },
  { nombre: "plátano beniano", categoria: "frutas", sinonimos: ["platano beniano", "plátanos benianos", "platanos benianos"] },
  { nombre: "plátano verde", categoria: "frutas", sinonimos: ["platano verde"] },
  { nombre: "guineo", categoria: "frutas", sinonimos: ["guineos", "banana"] },
  { nombre: "naranja", categoria: "frutas", sinonimos: ["naranjas"] },
  { nombre: "mandarina", categoria: "frutas", sinonimos: ["mandarinas"] },
  { nombre: "limón", categoria: "frutas", sinonimos: ["limon", "limones"] },
  { nombre: "papaya", categoria: "frutas", sinonimos: ["papayas"] },
  { nombre: "sandía", categoria: "frutas", sinonimos: ["sandia"] },
  { nombre: "piña", categoria: "frutas", sinonimos: ["pina"] },
  { nombre: "manzana", categoria: "frutas", sinonimos: ["manzanas"] },
  { nombre: "uva", categoria: "frutas", sinonimos: ["uvas"] },
  { nombre: "frutilla", categoria: "frutas", sinonimos: ["frutillas", "fresa"] },
  { nombre: "mango", categoria: "frutas", sinonimos: ["mangos"] },
  { nombre: "pera", categoria: "frutas", sinonimos: ["peras"] },
  { nombre: "durazno", categoria: "frutas", sinonimos: ["duraznos", "melocoton"] },
  { nombre: "ciruela", categoria: "frutas", sinonimos: ["ciruelas"] },
  { nombre: "maracuyá", categoria: "frutas", sinonimos: ["maracuya"] },
  { nombre: "achachairú", categoria: "frutas", sinonimos: ["achachairu"] },
  { nombre: "guayaba", categoria: "frutas", sinonimos: ["guayabas"] },
  { nombre: "coco", categoria: "frutas" },
  { nombre: "tamarindo", categoria: "frutas" },
  { nombre: "motacú", categoria: "frutas", sinonimos: ["motacu"] },
  { nombre: "cupuazú", categoria: "frutas", sinonimos: ["cupuazu", "copoazú", "copoazu"] },
  { nombre: "sinini", categoria: "frutas" },
  { nombre: "pacay", categoria: "frutas" },
  { nombre: "pomelo", categoria: "frutas" },
  { nombre: "granadilla", categoria: "frutas" },
  { nombre: "tuna", categoria: "frutas" },
  { nombre: "chirimoya", categoria: "frutas" },
  { nombre: "carambola", categoria: "frutas" },
  { nombre: "kiwi", categoria: "frutas" },
  { nombre: "melón", categoria: "frutas", sinonimos: ["melon"] },
  { nombre: "papa", categoria: "tuberculos", sinonimos: ["papas", "patata"] },
  { nombre: "papa imilla", categoria: "tuberculos" },
  { nombre: "papa holandesa", categoria: "tuberculos" },
  { nombre: "yuca", categoria: "tuberculos", sinonimos: ["yucas", "mandioca"] },
  { nombre: "camote", categoria: "tuberculos", sinonimos: ["batata"] },
  { nombre: "oca", categoria: "tuberculos" },
  { nombre: "papalisa", categoria: "tuberculos", sinonimos: ["ulluco"] },
  { nombre: "chuño", categoria: "tuberculos", sinonimos: ["chuno"] },
  { nombre: "tunta", categoria: "tuberculos" },
  { nombre: "arroz", categoria: "tuberculos", sinonimos: ["arroz grano de oro"] },
  { nombre: "maíz", categoria: "tuberculos", sinonimos: ["maiz"] },
  { nombre: "mote", categoria: "tuberculos" },
  { nombre: "quinua", categoria: "tuberculos", sinonimos: ["quinoa"] },
  { nombre: "cañahua", categoria: "tuberculos", sinonimos: ["canahua"] },
  { nombre: "trigo", categoria: "tuberculos" },
  { nombre: "cebada", categoria: "tuberculos" },
  { nombre: "avena", categoria: "tuberculos" },
  { nombre: "frejol", categoria: "tuberculos", sinonimos: ["frijol", "poroto", "frejoles"] },
  { nombre: "lenteja", categoria: "tuberculos", sinonimos: ["lentejas"] },
  { nombre: "garbanzo", categoria: "tuberculos", sinonimos: ["garbanzos"] },
  { nombre: "maní", categoria: "tuberculos", sinonimos: ["mani"] },
  { nombre: "soya", categoria: "tuberculos" },
  { nombre: "sésamo", categoria: "tuberculos", sinonimos: ["sesamo", "ajonjoli"] },
  { nombre: "amaranto", categoria: "tuberculos" },
  { nombre: "hualusa", categoria: "tuberculos", sinonimos: ["walusa"] },
  { nombre: "pollo", categoria: "carnes", sinonimos: ["pollo fresco"] },
  { nombre: "pollo entero", categoria: "carnes", sinonimos: ["pollo entero fresco"] },
  { nombre: "pechuga de pollo", categoria: "carnes", sinonimos: ["pecho de pollo", "pechuga"] },
  { nombre: "ala de pollo", categoria: "carnes", sinonimos: ["alas de pollo"] },
  { nombre: "pierna de pollo", categoria: "carnes", sinonimos: ["piernas de pollo", "muslo de pollo"] },
  { nombre: "menudencias de pollo", categoria: "carnes", sinonimos: ["menudo de pollo"] },
  { nombre: "carne de res", categoria: "carnes", sinonimos: ["res", "carne", "carne molida"] },
  { nombre: "bife", categoria: "carnes", sinonimos: ["bife de res"] },
  { nombre: "costilla de res", categoria: "carnes", sinonimos: ["costilla", "costillas de res"] },
  { nombre: "hígado de res", categoria: "carnes", sinonimos: ["higado", "higado de res"] },
  { nombre: "carne de cerdo", categoria: "carnes", sinonimos: ["cerdo", "chancho", "carne de chancho"] },
  { nombre: "costilla de cerdo", categoria: "carnes", sinonimos: ["costilla de chancho", "costillas de cerdo"] },
  { nombre: "chuleta de cerdo", categoria: "carnes", sinonimos: ["chuleta"] },
  { nombre: "chorizo", categoria: "carnes", sinonimos: ["chorizos"] },
  { nombre: "charque", categoria: "carnes" },
  { nombre: "menudo", categoria: "carnes", sinonimos: ["panza", "mondongo"] },
  { nombre: "pescado", categoria: "carnes", sinonimos: ["pescado fresco"] },
  { nombre: "surubí", categoria: "carnes", sinonimos: ["surubi"] },
  { nombre: "pacú", categoria: "carnes", sinonimos: ["pacu"] },
  { nombre: "sábalo", categoria: "carnes", sinonimos: ["sabalo"] },
  { nombre: "pavo", categoria: "carnes" },
  { nombre: "cordero", categoria: "carnes" },
  { nombre: "leche", categoria: "lacteos", sinonimos: ["leche fresca", "leche en bolsa"] },
  { nombre: "queso", categoria: "lacteos", sinonimos: ["queso fresco"] },
  { nombre: "queso menonita", categoria: "lacteos", sinonimos: ["queso menonita fresco"] },
  { nombre: "queso criollo", categoria: "lacteos" },
  { nombre: "queso mozzarella", categoria: "lacteos", sinonimos: ["mozzarella"] },
  { nombre: "quesillo", categoria: "lacteos" },
  { nombre: "cuajada", categoria: "lacteos" },
  { nombre: "yogur", categoria: "lacteos", sinonimos: ["yogurt"] },
  { nombre: "mantequilla", categoria: "lacteos", sinonimos: ["manteca"] },
  { nombre: "crema de leche", categoria: "lacteos", sinonimos: ["crema"] },
  { nombre: "huevo", categoria: "lacteos", sinonimos: ["huevos"] },
  { nombre: "huevo de codorniz", categoria: "lacteos" },
  { nombre: "leche condensada", categoria: "lacteos" },
  { nombre: "leche evaporada", categoria: "lacteos" },
  { nombre: "aceite", categoria: "abarrotes", sinonimos: ["aceite comestible", "aceite vegetal"] },
  { nombre: "azúcar", categoria: "abarrotes", sinonimos: ["azucar"] },
  { nombre: "sal", categoria: "abarrotes" },
  { nombre: "fideo", categoria: "abarrotes", sinonimos: ["fideos"] },
  { nombre: "harina", categoria: "abarrotes", sinonimos: ["harina de trigo"] },
  { nombre: "harina de maíz", categoria: "abarrotes", sinonimos: ["harina de maiz"] },
  { nombre: "pan", categoria: "abarrotes", sinonimos: ["pan casero", "marraqueta"] },
  { nombre: "café", categoria: "abarrotes", sinonimos: ["cafe"] },
  { nombre: "té", categoria: "abarrotes", sinonimos: ["te", "mate"] },
  { nombre: "yerba mate", categoria: "abarrotes" },
  { nombre: "atún", categoria: "abarrotes", sinonimos: ["atun", "atun en lata"] },
  { nombre: "sardina", categoria: "abarrotes", sinonimos: ["sardinas"] },
  { nombre: "mayonesa", categoria: "abarrotes" },
  { nombre: "kétchup", categoria: "abarrotes", sinonimos: ["ketchup", "salsa de tomate"] },
  { nombre: "mostaza", categoria: "abarrotes" },
  { nombre: "vinagre", categoria: "abarrotes" },
  { nombre: "salsa de soya", categoria: "abarrotes", sinonimos: ["sillao"] },
  { nombre: "galleta", categoria: "abarrotes", sinonimos: ["galletas"] },
  { nombre: "chocolate", categoria: "abarrotes" },
  { nombre: "caramelo", categoria: "abarrotes", sinonimos: ["caramelos"] },
  { nombre: "gaseosa", categoria: "abarrotes", sinonimos: ["refresco", "soda"] },
  { nombre: "agua", categoria: "abarrotes", sinonimos: ["agua embotellada"] },
  { nombre: "jugo", categoria: "abarrotes" },
  { nombre: "avena instantánea", categoria: "abarrotes", sinonimos: ["avena instantanea"] },
  { nombre: "cereal", categoria: "abarrotes" },
  { nombre: "mermelada", categoria: "abarrotes" },
  { nombre: "miel", categoria: "abarrotes" },
  { nombre: "canela", categoria: "abarrotes" },
  { nombre: "comino", categoria: "abarrotes" },
  { nombre: "pimienta", categoria: "abarrotes" },
  { nombre: "orégano", categoria: "abarrotes", sinonimos: ["oregano"] },
  { nombre: "ají molido", categoria: "abarrotes", sinonimos: ["aji molido"] },
  { nombre: "caldo", categoria: "abarrotes", sinonimos: ["cubito", "caldo en cubo"] },
  { nombre: "arroz con leche", categoria: "abarrotes" },
  { nombre: "maicena", categoria: "abarrotes" },
  { nombre: "polvo de hornear", categoria: "abarrotes" },
  { nombre: "levadura", categoria: "abarrotes" },
  { nombre: "detergente", categoria: "limpieza", sinonimos: ["detergente en polvo"] },
  { nombre: "jabón", categoria: "limpieza", sinonimos: ["jabon", "jabon de lavar"] },
  { nombre: "jaboncillo", categoria: "limpieza" },
  { nombre: "lavandina", categoria: "limpieza", sinonimos: ["lejia", "cloro"] },
  { nombre: "suavizante", categoria: "limpieza" },
  { nombre: "shampoo", categoria: "limpieza", sinonimos: ["shampu"] },
  { nombre: "papel higiénico", categoria: "limpieza", sinonimos: ["papel higienico"] },
  { nombre: "servilleta", categoria: "limpieza", sinonimos: ["servilletas"] },
  { nombre: "esponja", categoria: "limpieza" },
  { nombre: "bolsa de basura", categoria: "limpieza", sinonimos: ["bolsas de basura"] },
  { nombre: "desinfectante", categoria: "limpieza" },
  { nombre: "ambientador", categoria: "limpieza" },
  { nombre: "pasta dental", categoria: "limpieza", sinonimos: ["pasta de dientes"] },
  { nombre: "cepillo de dientes", categoria: "limpieza" },
  { nombre: "desodorante", categoria: "limpieza" },
  { nombre: "pañales", categoria: "limpieza", sinonimos: ["panales"] },
  { nombre: "toalla higiénica", categoria: "limpieza", sinonimos: ["toalla higienica"] },
  { nombre: "fósforos", categoria: "limpieza", sinonimos: ["fosforos", "cerillos"] },
  { nombre: "vela", categoria: "limpieza", sinonimos: ["velas"] },
  { nombre: "pilas", categoria: "limpieza" },
];

export const CATALOGO: ProductoCatalogo[] = CATALOGO_BASE.map((p) => {
  const imagen = FOTOS_PRODUCTO.get(idProducto(p.nombre)) ?? FOTOS_CATEGORIA.get(`categoria-${p.categoria}`);
  return imagen ? { ...p, imagen } : p;
});
