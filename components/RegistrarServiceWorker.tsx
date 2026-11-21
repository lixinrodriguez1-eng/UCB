"use client";

import { useEffect } from "react";

/**
 * Registra /sw.js para que la app abra sin internet.
 * Solo en producción: en desarrollo el caché estorbaría la recarga en caliente.
 */
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registro) => {
        // Pasarle al service worker todo lo que la página ya cargó
        // (scripts, estilos, fuentes) para que quede guardado.
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((url) => url.startsWith(location.origin));
        registro.active?.postMessage({ tipo: "guardar", urls });
      })
      .catch(() => {
        // Sin service worker la app igual funciona, solo que no sin internet.
      });
  }, []);

  return null;
}
