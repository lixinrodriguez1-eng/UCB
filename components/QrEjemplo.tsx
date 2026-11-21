import { formatearBs } from "@/lib/formato";

/** Dibujo de un QR de EJEMPLO (no se puede escanear para pagar). */
function celdas(semilla: string, tam: number): boolean[][] {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const azar = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100) / 100;
  };
  const m = Array.from({ length: tam }, () => Array.from({ length: tam }, () => azar() > 0.5));
  // Los tres cuadros de las esquinas, como un QR de verdad.
  const cuadro = (f0: number, c0: number) => {
    for (let f = 0; f < 7; f++)
      for (let c = 0; c < 7; c++) {
        const borde = f === 0 || f === 6 || c === 0 || c === 6;
        const centro = f >= 2 && f <= 4 && c >= 2 && c <= 4;
        m[f0 + f][c0 + c] = borde || centro;
      }
  };
  cuadro(0, 0);
  cuadro(0, tam - 7);
  cuadro(tam - 7, 0);
  return m;
}

export default function QrEjemplo({ para, monto, semilla }: { para: string; monto: number; semilla: string }) {
  const tam = 25;
  const m = celdas(semilla, tam);
  return (
    <figure className="mx-auto w-fit rounded-2xl border-4 border-tinta bg-white p-4 text-center">
      <svg viewBox={`0 0 ${tam} ${tam}`} className="mx-auto h-44 w-44" role="img" aria-label="QR de ejemplo, no realiza pagos">
        {m.flatMap((fila, f) =>
          fila.map((lleno, c) => (lleno ? <rect key={`${f}-${c}`} x={c} y={f} width={1} height={1} fill="#2b1a0e" /> : null)),
        )}
      </svg>
      <figcaption className="mt-2 text-base">
        <span className="block font-extrabold">{formatearBs(monto)} para {para}</span>
        <span className="mt-1 inline-block rounded-lg bg-amarillo-claro px-2 py-0.5 text-sm font-bold">
          QR DE EJEMPLO · no hace pagos reales
        </span>
      </figcaption>
    </figure>
  );
}
