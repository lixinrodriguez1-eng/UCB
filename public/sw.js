/*
 * Service worker de Caserita: guarda la app para que abra sin internet.
 * - Páginas: primero la red (para tener la última versión); sin red, la guardada.
 * - Archivos de /_next/static (tienen hash en el nombre) e íconos: primero el caché.
 * El reconocimiento de voz del navegador igual necesita internet.
 *
 * Subir VERSION cuando cambie este archivo o para limpiar el caché viejo.
 */
const VERSION = "caserita-v2";
/** Páginas de la app que se guardan para abrir sin internet. */
const PAGINAS = ["/", "/reporte"];
const BASICOS = [
  "/manifest.webmanifest",
  "/icono-192.png",
  "/icono-512.png",
  "/icono-maskable-512.png",
  "/icon.png",
  "/apple-icon.png",
];

async function guardar(urls) {
  const cache = await caches.open(VERSION);
  await Promise.all(
    urls.map((url) =>
      cache.match(url).then((ya) => ya || cache.add(url)).catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      const archivos = new Set();
      for (const pagina of PAGINAS) {
        const respuesta = await fetch(pagina, { cache: "no-store" });
        if (!respuesta.ok) continue;
        const html = await respuesta.clone().text();
        await cache.put(pagina, respuesta);
        // Los scripts y estilos que la página pide, sacados del HTML.
        for (const url of html.match(/\/_next\/static\/[\w\-.~%/]+/g) || []) archivos.add(url);
      }
      await guardar([...BASICOS, ...archivos]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "guardar" && Array.isArray(event.data.urls)) {
    event.waitUntil(guardar(event.data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero, caché si no hay internet.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const respuesta = await fetch(request);
          if (respuesta.ok && PAGINAS.includes(url.pathname)) cache.put(url.pathname, respuesta.clone());
          return respuesta;
        } catch {
          return (await cache.match(url.pathname)) || (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Archivos estáticos: caché primero.
  const esEstatico =
    url.pathname.startsWith("/_next/static/") ||
    BASICOS.includes(url.pathname) ||
    /\.(png|svg|ico|woff2?)$/.test(url.pathname);

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      if (esEstatico) {
        const guardada = await cache.match(request);
        if (guardada) return guardada;
      }
      try {
        const respuesta = await fetch(request);
        if (respuesta.ok && esEstatico) cache.put(request, respuesta.clone());
        return respuesta;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })(),
  );
});
