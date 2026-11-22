#!/usr/bin/env node
/**
 * Descarga UNA VEZ las fotos de los productos (Pexels o Pixabay, licencias
 * libres) y las deja dentro del proyecto, para que la app funcione sin internet.
 *
 *   npm run fotos                                  → descarga lo que falta
 *   npm run fotos -- --solo=papa,tomate --forzar   → vuelve a elegir esas
 *
 * - Usa Pexels si hay PEXELS_API_KEY en .env.local; si no, Pixabay
 *   (PIXABAY_API_KEY, image_type=photo, safesearch=true). La clave nunca se
 *   imprime ni se copia a ningún archivo del proyecto.
 * - Salida: public/productos/<id>.webp (300×300, calidad 75),
 *   public/productos/categoria-<id>.webp, public/productos/indice.json y
 *   data/creditos-fotos.json (fuente, licencia, producto, autor, enlace).
 * - Si un producto no tiene un término confiable o la búsqueda no trae una
 *   foto buena, NO se inventa: queda en "sin_foto" y la app usa la foto de
 *   su categoría.
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA_FOTOS = path.join(RAIZ, "public", "productos");
const ARCHIVO_CREDITOS = path.join(RAIZ, "data", "creditos-fotos.json");
const ESPERA_MS = 800; // entre llamadas, para no pasar el límite de la API

/** Mismo id que usa la app (data/catalogo.ts → idProducto). */
export function idProducto(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Término de búsqueda en inglés y palabras que la descripción de la foto
 * (alt) tiene que mencionar. null = no hay término confiable → sin foto.
 */
export const TERMINOS = {
  // Verduras
  tomate: ["tomatoes market", ["tomato"]],
  cebolla: ["onions", ["onion"]],
  "cebolla en hoja": ["spring onions", ["spring onion", "green onion", "scallion"]],
  cebollín: ["chives", ["chive", "scallion"]],
  locoto: ["red hot chili pepper", ["chili", "chilli", "pepper"]],
  pimentón: ["bell peppers", ["bell pepper", "capsicum", "pepper"]],
  zanahoria: ["carrots", ["carrot"]],
  pepino: ["cucumbers", ["cucumber"]],
  lechuga: ["lettuce", ["lettuce"]],
  repollo: ["cabbage", ["cabbage"]],
  brócoli: ["broccoli", ["broccoli"]],
  coliflor: ["cauliflower", ["cauliflower"]],
  acelga: ["swiss chard", ["chard"]],
  espinaca: ["spinach leaves", ["spinach"]],
  perejil: ["parsley", ["parsley"]],
  cilantro: ["cilantro coriander", ["cilantro", "coriander"]],
  apio: ["celery", ["celery"]],
  vainita: ["green beans", ["green bean"]],
  arveja: ["green peas", ["pea"]],
  haba: ["fava beans", ["fava", "broad bean"]],
  choclo: ["corn cob", ["corn"]],
  zapallo: ["pumpkin squash", ["pumpkin", "squash"]],
  zapallito: ["zucchini", ["zucchini", "courgette"]],
  achojcha: null,
  rábano: ["radish", ["radish"]],
  beterraga: ["beetroot", ["beet"]],
  nabo: ["turnip", ["turnip"]],
  vaina: null,
  "ají amarillo": ["yellow chili peppers", ["chili", "chilli", "pepper"]],
  "ají rojo": ["red chili peppers", ["chili", "chilli", "pepper"]],
  puerro: ["leeks", ["leek"]],
  albahaca: ["basil leaves", ["basil"]],
  "hierba buena": ["mint leaves", ["mint"]],
  "orégano fresco": ["fresh oregano", ["oregano"]],
  quirquiña: null,
  huacataya: null,
  wacataya: null,
  chile: ["chili peppers", ["chili", "chilli"]],
  palta: ["avocado", ["avocado"]],
  // Frutas
  plátano: ["bananas", ["banana"]],
  "plátano beniano": ["plantain bananas", ["plantain", "banana"]],
  "plátano verde": ["green plantains", ["plantain", "green banana"]],
  guineo: ["bananas bunch", ["banana"]],
  naranja: ["oranges fruit", ["orange"]],
  mandarina: ["tangerines", ["tangerine", "mandarin"]],
  limón: ["limes", ["lime", "lemon"]],
  papaya: ["papaya fruit", ["papaya"]],
  sandía: ["watermelon", ["watermelon"]],
  piña: ["pineapple", ["pineapple"]],
  manzana: ["apples", ["apple"]],
  uva: ["grapes", ["grape"]],
  frutilla: ["strawberries", ["strawberr"]],
  mango: ["mangoes", ["mango"]],
  pera: ["pears", ["pear"]],
  durazno: ["peaches", ["peach"]],
  ciruela: ["plums", ["plum"]],
  maracuyá: ["passion fruit", ["passion fruit", "passionfruit"]],
  achachairú: null,
  guayaba: ["guava fruit", ["guava"]],
  coco: ["coconut", ["coconut"]],
  tamarindo: ["tamarind", ["tamarind"]],
  motacú: null,
  cupuazú: null,
  sinini: null,
  pacay: null,
  pomelo: ["grapefruit", ["grapefruit"]],
  granadilla: ["granadilla fruit", ["granadilla"]],
  tuna: ["prickly pear fruit", ["prickly pear", "cactus fruit"]],
  chirimoya: ["cherimoya", ["cherimoya", "custard apple"]],
  carambola: ["starfruit", ["star fruit", "starfruit", "carambola"]],
  kiwi: ["kiwi fruit", ["kiwi"]],
  melón: ["cantaloupe melon", ["melon", "cantaloupe"]],
  // Tubérculos y granos
  papa: ["potatoes market", ["potato"]],
  "papa imilla": null,
  "papa holandesa": null,
  yuca: ["cassava root", ["cassava", "yuca", "manioc"]],
  camote: ["sweet potatoes", ["sweet potato"]],
  oca: null,
  papalisa: null,
  chuño: null,
  tunta: null,
  arroz: ["rice grains", ["rice"]],
  maíz: ["dried corn kernels", ["corn", "maize"]],
  mote: ["hominy", ["hominy"]],
  quinua: ["quinoa", ["quinoa"]],
  cañahua: null,
  trigo: ["wheat grains", ["wheat"]],
  cebada: ["barley grains", ["barley"]],
  avena: ["oats", ["oat"]],
  frejol: ["dried beans", ["bean"]],
  lenteja: ["lentils", ["lentil"]],
  garbanzo: ["chickpeas", ["chickpea"]],
  maní: ["peanuts", ["peanut"]],
  soya: ["soybeans", ["soy"]],
  sésamo: ["sesame seeds", ["sesame"]],
  amaranto: ["amaranth seeds", ["amaranth"]],
  hualusa: null,
  // Carnes y pollo
  pollo: ["raw chicken market", ["chicken"]],
  "pollo entero": ["whole raw chicken", ["chicken"]],
  "pechuga de pollo": ["raw chicken breast", ["chicken breast", "chicken"]],
  "ala de pollo": ["raw chicken wings", ["wing"]],
  "pierna de pollo": ["raw chicken legs", ["drumstick", "chicken leg", "chicken"]],
  "menudencias de pollo": null,
  "carne de res": ["raw beef", ["beef", "meat"]],
  bife: ["raw steak", ["steak"]],
  "costilla de res": ["raw beef ribs", ["rib"]],
  "hígado de res": ["raw liver", ["liver"]],
  "carne de cerdo": ["raw pork", ["pork"]],
  "costilla de cerdo": ["raw pork ribs", ["rib"]],
  "chuleta de cerdo": ["raw pork chops", ["chop"]],
  chorizo: ["chorizo sausages", ["chorizo", "sausage"]],
  charque: ["dried beef jerky", ["jerky"]],
  menudo: ["raw tripe", ["tripe"]],
  pescado: ["fresh fish market", ["fish"]],
  surubí: null,
  pacú: null,
  sábalo: null,
  pavo: ["raw turkey meat", ["turkey"]],
  cordero: ["raw lamb meat", ["lamb"]],
  // Lácteos y huevos
  leche: ["milk bottle", ["milk"]],
  queso: ["cheese", ["cheese"]],
  "queso menonita": ["fresh white cheese", ["cheese"]],
  "queso criollo": ["fresh farmer cheese", ["cheese"]],
  "queso mozzarella": ["mozzarella", ["mozzarella"]],
  quesillo: null,
  cuajada: ["curd cheese", ["curd", "cottage"]],
  yogur: ["yogurt", ["yogurt", "yoghurt"]],
  mantequilla: ["butter", ["butter"]],
  "crema de leche": ["heavy cream", ["cream"]],
  huevo: ["eggs", ["egg"]],
  "huevo de codorniz": ["quail eggs", ["quail"]],
  "leche condensada": ["condensed milk", ["condensed"]],
  "leche evaporada": ["evaporated milk", ["evaporated"]],
  // Abarrotes
  aceite: ["cooking oil bottle", ["oil"]],
  azúcar: ["sugar", ["sugar"]],
  sal: ["salt", ["salt"]],
  fideo: ["pasta noodles", ["pasta", "noodle", "spaghetti"]],
  harina: ["flour", ["flour"]],
  "harina de maíz": ["cornmeal", ["cornmeal", "corn flour", "polenta"]],
  pan: ["bread loaves", ["bread"]],
  café: ["coffee beans", ["coffee"]],
  té: ["tea leaves", ["tea"]],
  "yerba mate": ["yerba mate", ["mate", "yerba"]],
  atún: ["canned tuna", ["tuna"]],
  sardina: ["canned sardines", ["sardine"]],
  mayonesa: ["mayonnaise", ["mayo"]],
  kétchup: ["ketchup", ["ketchup"]],
  mostaza: ["mustard", ["mustard"]],
  vinagre: ["vinegar", ["vinegar"]],
  "salsa de soya": ["soy sauce", ["soy sauce"]],
  galleta: ["cookies biscuits", ["cookie", "biscuit"]],
  chocolate: ["chocolate bar", ["chocolate"]],
  caramelo: ["candies sweets", ["candy", "candies", "sweets"]],
  gaseosa: ["soda bottles", ["soda", "soft drink", "cola"]],
  agua: ["water bottles", ["water"]],
  jugo: ["fruit juice", ["juice"]],
  "avena instantánea": ["oatmeal", ["oat"]],
  cereal: ["breakfast cereal", ["cereal"]],
  mermelada: ["jam jar", ["jam", "marmalade"]],
  miel: ["honey jar", ["honey"]],
  canela: ["cinnamon sticks", ["cinnamon"]],
  comino: ["cumin", ["cumin"]],
  pimienta: ["black peppercorns", ["peppercorn", "black pepper"]],
  orégano: ["dried oregano", ["oregano"]],
  "ají molido": ["chili powder", ["chili", "chilli", "paprika"]],
  caldo: ["bouillon cubes", ["bouillon", "stock cube"]],
  "arroz con leche": ["rice pudding", ["rice pudding"]],
  maicena: ["cornstarch", ["cornstarch", "corn starch"]],
  "polvo de hornear": ["baking powder", ["baking powder"]],
  levadura: ["yeast", ["yeast"]],
  // Limpieza y otros
  detergente: ["laundry detergent", ["detergent"]],
  jabón: ["soap bar", ["soap"]],
  jaboncillo: ["handmade soap bars", ["soap"]],
  lavandina: ["bleach bottle", ["bleach"]],
  suavizante: ["fabric softener", ["softener"]],
  shampoo: ["shampoo bottle", ["shampoo"]],
  "papel higiénico": ["toilet paper rolls", ["toilet paper", "tissue"]],
  servilleta: ["paper napkins", ["napkin"]],
  esponja: ["kitchen sponge", ["sponge"]],
  "bolsa de basura": ["garbage bags", ["garbage bag", "trash bag", "bin bag"]],
  desinfectante: ["disinfectant spray", ["disinfectant"]],
  ambientador: ["air freshener", ["freshener"]],
  "pasta dental": ["toothpaste", ["toothpaste"]],
  "cepillo de dientes": ["toothbrush", ["toothbrush"]],
  desodorante: ["deodorant", ["deodorant"]],
  pañales: ["diapers", ["diaper"]],
  "toalla higiénica": ["sanitary pads", ["sanitary pad", "menstrual pad"]],
  fósforos: ["matches matchsticks", ["match"]],
  vela: ["candles", ["candle"]],
  pilas: ["batteries", ["batter"]],
};

/** Una foto por categoría (respaldo de los productos sin foto y de los nuevos). */
export const TERMINOS_CATEGORIA = {
  verduras: ["fresh vegetables market", ["vegetable"]],
  frutas: ["fresh fruits market", ["fruit"]],
  tuberculos: ["potatoes sacks market", ["potato", "tuber"]],
  carnes: ["raw meat butcher", ["meat", "beef", "pork"]],
  lacteos: ["cheese and milk dairy", ["dairy", "cheese", "milk"]],
  abarrotes: ["grocery pantry jars", ["grocer", "pantry", "jar"]],
  limpieza: ["cleaning products", ["cleaning"]],
  otros: ["market basket", ["basket"]],
};

/**
 * Fotos revisadas a mano que NO corresponden al producto (id de la foto en
 * el proveedor). Se agregan después de mirarlas en la página de créditos.
 */
export const EVITAR = {};

// Si la descripción/etiquetas mencionan personas, se descarta (queremos el producto solo).
const CON_PERSONAS =
  /\b(person|people|woman|women|man|men|hand|hands|girl|boy|child|children|kid|kids|vendor|seller|farmer|chef|cook|holding|face|portrait|lady|guy|family|worker|baby|couple|customer|human|female|male)\b/i;
// Pistas de una buena foto de producto o de mercado.
const BUENA_PISTA = /\b(market|stall|close[- ]?up|fresh|pile|heap|basket|crate|bunch|isolated|top view|still life)\b/i;

// ---------------------------------------------------------------------------
// Proveedores: Pexels si hay PEXELS_API_KEY; si no, Pixabay (PIXABAY_API_KEY).
// Los dos se llevan a la misma forma:
//   { id, alt, autor, autorUrl, url, descarga, ancho, alto }
// ---------------------------------------------------------------------------

export const PROVEEDORES = {
  pexels: {
    nombre: "Pexels",
    variable: "PEXELS_API_KEY",
    licencia: "https://www.pexels.com/license/",
  },
  pixabay: {
    nombre: "Pixabay",
    variable: "PIXABAY_API_KEY",
    licencia: "https://pixabay.com/service/license-summary/",
  },
};

export function leerClave(texto, variable) {
  for (const linea of texto.split(/\r?\n/)) {
    const m = linea.match(new RegExp(`^\\s*${variable}\\s*=\\s*(.*)\\s*$`));
    if (m) return m[1].replace(/^['"]|['"]$/g, "").trim();
  }
  return "";
}

/** Pexels → forma común. "medium" mide 350 px de alto; si queda angosta, "large". */
export function normalizarPexels(f) {
  const anchoMedium = (f.width * 350) / f.height;
  return {
    id: f.id,
    alt: f.alt ?? "",
    autor: f.photographer,
    autorUrl: f.photographer_url,
    url: f.url,
    descarga: anchoMedium >= 300 ? f.src.medium : f.src.large,
  };
}

/** Pixabay → forma común. Sus "tags" hacen de descripción; "webformat" (hasta 640 px) es el tamaño medio. */
export function normalizarPixabay(h) {
  const chica = Math.min(h.webformatWidth ?? 0, h.webformatHeight ?? 0) < 300;
  return {
    id: h.id,
    alt: h.tags ?? "",
    autor: h.user,
    autorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
    url: h.pageURL,
    descarga: chica ? h.largeImageURL : h.webformatURL,
  };
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const existe = (p) => access(p).then(() => true, () => false);

class LimiteAlcanzado extends Error {}

function revisarLimite(r, reinicioEnSegundos) {
  if (r.status !== 429 && r.headers.get("x-ratelimit-remaining") !== "0") return;
  const valor = Number(r.headers.get("x-ratelimit-reset"));
  const cuando = valor ? new Date(reinicioEnSegundos ? Date.now() + valor * 1000 : valor * 1000) : null;
  throw new LimiteAlcanzado(
    `Se alcanzó el límite de la API${cuando ? ` (se libera ${cuando.toLocaleTimeString("es-BO")})` : ""}. Vuelve a ejecutar el script después: continúa donde quedó.`,
  );
}

async function buscarPexels(clave, termino) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", termino);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("locale", "en-US");
  const r = await fetch(url, { headers: { Authorization: clave } });
  if (r.status === 401 || r.status === 403) throw new Error("Pexels rechazó la clave (revisa PEXELS_API_KEY en .env.local).");
  revisarLimite(r, false);
  if (!r.ok) throw new Error(`Pexels respondió ${r.status} para "${termino}"`);
  return ((await r.json()).photos ?? []).map(normalizarPexels);
}

async function buscarPixabay(clave, termino) {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", clave);
  url.searchParams.set("q", termino.slice(0, 100));
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("lang", "en");
  const r = await fetch(url);
  // Ojo: la URL lleva la clave, así que nunca se imprime ni se guarda.
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    const texto = (await r.text()).replace(clave, "***");
    throw new Error(`Pixabay rechazó la consulta (${r.status}): ${texto.slice(0, 120)}. Revisa PIXABAY_API_KEY en .env.local.`);
  }
  revisarLimite(r, true);
  if (!r.ok) throw new Error(`Pixabay respondió ${r.status} para "${termino}"`);
  return ((await r.json()).hits ?? []).map(normalizarPixabay);
}

/** Elige la foto: la descripción nombra el producto, sin personas, con pistas de mercado/producto. */
export function elegirFoto(fotos, claves, evitar = []) {
  const candidatas = fotos
    .filter((f) => !evitar.includes(f.id))
    .filter((f) => {
      const alt = (f.alt ?? "").toLowerCase();
      return alt && claves.some((c) => alt.includes(c)) && !CON_PERSONAS.test(alt);
    })
    .map((f, orden) => ({ f, puntos: (BUENA_PISTA.test(f.alt) ? 2 : 0) - orden * 0.05 }));
  candidatas.sort((a, b) => b.puntos - a.puntos);
  return candidatas[0]?.f ?? null;
}

async function guardarFoto(sharp, foto, destino) {
  const r = await fetch(foto.descarga);
  if (!r.ok) throw new Error(`No se pudo descargar la foto ${foto.id}`);
  const datos = Buffer.from(await r.arrayBuffer());
  await sharp(datos)
    .resize(300, 300, { fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 75 })
    .toFile(destino);
}

function nombresDelCatalogo(texto) {
  return [...texto.matchAll(/\{ nombre: "([^"]+)", categoria: "([^"]+)"/g)].map(([, nombre, categoria]) => ({ nombre, categoria }));
}

async function principal() {
  const args = process.argv.slice(2);
  const solo = (args.find((a) => a.startsWith("--solo="))?.slice(7) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const forzar = args.includes("--forzar");

  const env = await readFile(path.join(RAIZ, ".env.local"), "utf8").catch(() => "");
  const clavePexels = leerClave(env, PROVEEDORES.pexels.variable);
  const clavePixabay = leerClave(env, PROVEEDORES.pixabay.variable);
  const proveedor = clavePexels ? PROVEEDORES.pexels : clavePixabay ? PROVEEDORES.pixabay : null;
  if (!proveedor) {
    console.error("Falta PEXELS_API_KEY o PIXABAY_API_KEY en .env.local (en la carpeta del proyecto).");
    process.exit(1);
  }
  const buscar = proveedor === PROVEEDORES.pexels ? (t) => buscarPexels(clavePexels, t) : (t) => buscarPixabay(clavePixabay, t);
  console.log(`Fotos de ${proveedor.nombre}\n`);
  const { default: sharp } = await import("sharp");

  const productos = nombresDelCatalogo(await readFile(path.join(RAIZ, "data", "catalogo.ts"), "utf8"));
  const anterior = JSON.parse(await readFile(ARCHIVO_CREDITOS, "utf8").catch(() => "{}"));
  // Si cambia el proveedor, se empieza de cero (los créditos no se mezclan).
  const mismoProveedor = anterior.fuente === proveedor.nombre;
  const creditos = {
    fuente: proveedor.nombre,
    licencia: proveedor.licencia,
    productos: mismoProveedor ? (anterior.productos ?? []) : [],
    categorias: mismoProveedor ? (anterior.categorias ?? []) : [],
    sin_foto: mismoProveedor ? (anterior.sin_foto ?? []) : [],
  };
  await mkdir(CARPETA_FOTOS, { recursive: true });

  const quitar = (lista, id) => lista.filter((x) => x.id !== id);
  const pendientes = [
    ...Object.entries(TERMINOS_CATEGORIA).map(([cat, t]) => ({ tipo: "categoria", id: `categoria-${cat}`, nombre: cat, categoria: cat, termino: t })),
    ...productos.map((p) => ({ tipo: "producto", id: idProducto(p.nombre), nombre: p.nombre, categoria: p.categoria, termino: TERMINOS[p.nombre] })),
  ].filter((x) => !solo.length || solo.includes(x.nombre) || solo.includes(x.id));

  let llamadas = 0;
  try {
    for (const item of pendientes) {
      const archivo = path.join(CARPETA_FOTOS, `${item.id}.webp`);
      const lista = item.tipo === "categoria" ? "categorias" : "productos";
      if (!forzar && (await existe(archivo)) && creditos[lista].some((x) => x.id === item.id)) continue;

      if (item.termino === undefined) console.warn(`  (sin término definido para "${item.nombre}")`);
      if (!item.termino) {
        if (item.tipo === "producto") {
          creditos.sin_foto = [...quitar(creditos.sin_foto, item.id), { id: item.id, producto: item.nombre, categoria: item.categoria, motivo: "sin término confiable en inglés" }];
          creditos.productos = quitar(creditos.productos, item.id);
        }
        continue;
      }

      const [termino, claves] = item.termino;
      if (llamadas++ > 0) await esperar(ESPERA_MS);
      const foto = elegirFoto(await buscar(termino), claves, EVITAR[item.nombre] ?? []);
      if (!foto) {
        console.log(`✗ ${item.nombre}: ninguna foto clara para "${termino}"`);
        if (item.tipo === "producto") {
          creditos.sin_foto = [...quitar(creditos.sin_foto, item.id), { id: item.id, producto: item.nombre, categoria: item.categoria, motivo: `sin resultado bueno para "${termino}"` }];
          creditos.productos = quitar(creditos.productos, item.id);
        }
        continue;
      }
      await guardarFoto(sharp, foto, archivo);
      const registro = {
        id: item.id,
        producto: item.nombre,
        categoria: item.categoria,
        archivo: `/productos/${item.id}.webp`,
        fuente: proveedor.nombre,
        fotografo: foto.autor,
        fotografo_url: foto.autorUrl,
        url: foto.url,
        foto_id: foto.id,
        termino,
        descripcion: foto.alt,
      };
      creditos[lista] = [...quitar(creditos[lista], item.id), registro];
      creditos.sin_foto = quitar(creditos.sin_foto, item.id);
      console.log(`✓ ${item.nombre} ← "${foto.alt}" (${foto.autor})`);
    }
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exitCode = e instanceof LimiteAlcanzado ? 2 : 1;
  } finally {
    const orden = (a, b) => a.producto.localeCompare(b.producto, "es");
    creditos.productos.sort(orden);
    creditos.sin_foto.sort(orden);
    creditos.categorias.sort((a, b) => a.id.localeCompare(b.id));
    await writeFile(ARCHIVO_CREDITOS, JSON.stringify(creditos, null, 2) + "\n");
    const archivos = [...creditos.categorias, ...creditos.productos].map((x) => x.archivo);
    await writeFile(path.join(CARPETA_FOTOS, "indice.json"), JSON.stringify(archivos) + "\n");
    console.log(`\nCon foto: ${creditos.productos.length} productos + ${creditos.categorias.length} categorías · sin_foto: ${creditos.sin_foto.length} · llamadas a la API: ${llamadas}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await principal();
}
