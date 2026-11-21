"use client";

import { useState } from "react";
import type { Pedido } from "@/types/roles";
import { almacenPedidos, marcarCobrado, recibirPedido } from "@/lib/pedidos";
import { productorPorId } from "@/lib/ejemplos";
import { revisarMargen, type AlertaMargen } from "@/lib/calculos";
import { describirCantidad, formatearBs } from "@/lib/formato";
import { fraseAlerta } from "@/lib/respuestas";
import { hablar, callar } from "@/lib/habla";
import { useAlmacen } from "@/lib/useAlmacen";
import QrEjemplo from "@/components/QrEjemplo";
import TarjetaAlerta from "@/components/TarjetaAlerta";
import { ResumenGrupal } from "@/components/TarjetaPedido";

const ESTADO = {
  pendiente: { texto: "Pendiente", clase: "bg-amarillo-claro" },
  entregado: { texto: "Recibido · falta pagar", clase: "bg-naranja-claro" },
  cobrado: { texto: "Pagado", clase: "bg-verde-claro" },
} as const;

function FilaPedido({ pedido, onAlerta }: { pedido: Pedido; onAlerta: (a: AlertaMargen) => void }) {
  const [verGrupo, setVerGrupo] = useState(false);
  const [verQr, setVerQr] = useState(false);
  const productor = productorPorId(pedido.productorId);
  const estado = ESTADO[pedido.estado];

  const recibir = () => {
    const compras = recibirPedido(pedido.id);
    setVerQr(true);
    // Con el costo real cargado, ¿alguno de estos productos se vende a pérdida?
    for (const c of compras) {
      const alerta = revisarMargen(c.producto);
      if (alerta) {
        onAlerta(alerta);
        hablar(fraseAlerta(alerta));
        break;
      }
    }
  };

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-extrabold">
            {productor?.nombre} <span className="rounded-md bg-amarillo-claro px-1.5 py-0.5 text-xs font-bold align-middle">ejemplo</span>
          </p>
          <p className="text-base text-tinta-suave">{pedido.items.map((i) => describirCantidad(i.cantidad, i.unidad, i.producto)).join(", ")}</p>
          <span className={`mt-1 inline-block rounded-full border-2 border-tinta px-2 py-0.5 text-sm font-bold ${estado.clase}`}>{estado.texto}</span>
        </div>
        <span className="shrink-0 text-2xl font-black">{formatearBs(pedido.total)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pedido.estado === "pendiente" && (
          <button
            type="button"
            onClick={recibir}
            className="rounded-2xl border-4 border-tinta bg-verde px-4 py-2 text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none"
          >
            📦 Recibí la mercadería
          </button>
        )}
        {pedido.estado === "entregado" && !verQr && (
          <button
            type="button"
            onClick={() => setVerQr(true)}
            className="rounded-2xl border-4 border-tinta bg-azul px-4 py-2 text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none"
          >
            Pagar por QR
          </button>
        )}
        <button type="button" onClick={() => setVerGrupo((v) => !v)} aria-expanded={verGrupo} className="px-2 text-base font-semibold underline">
          {verGrupo ? "Ocultar" : "Ver"} pedido grupal
        </button>
      </div>

      {verQr && pedido.estado !== "cobrado" && (
        <div className="mt-3 space-y-3 rounded-2xl bg-crema p-3">
          <p className="text-base font-bold">✅ Compra registrada con el costo del pedido. Paga a {productor?.nombre}:</p>
          <QrEjemplo para={productor?.nombre ?? "el productor"} monto={pedido.total} semilla={pedido.id} />
          <button
            type="button"
            onClick={() => {
              marcarCobrado(pedido.id);
              setVerQr(false);
            }}
            className="w-full rounded-2xl border-4 border-tinta bg-white py-3 text-lg font-extrabold"
          >
            Ya pagué (ejemplo)
          </button>
        </div>
      )}

      {verGrupo && (
        <div className="mt-3">
          <ResumenGrupal pedido={pedido} />
        </div>
      )}
    </li>
  );
}

/** "Mis pedidos a productores" en la vista de la caserita. */
export default function MisPedidos() {
  const pedidos = useAlmacen(almacenPedidos);
  const [alerta, setAlerta] = useState<AlertaMargen | null>(null);

  return (
    <section aria-labelledby="titulo-pedidos" className="rounded-3xl border-4 border-tinta bg-white">
      <div className="border-b-4 border-tinta bg-verde-claro px-5 py-4">
        <h2 id="titulo-pedidos" className="text-2xl font-extrabold">
          🌾 Mis pedidos a productores
        </h2>
      </div>
      {pedidos.length === 0 ? (
        <p className="p-5 text-lg text-tinta-suave">
          Pide con el micrófono: <em>“Para mañana necesito un quintal de papa y dos cajas de tomate”</em>. Te muestro los
          productores ordenados por precio y cuánto te deja cada uno.
        </p>
      ) : (
        <ul className="divide-y-2 divide-crema-oscura">
          {pedidos.map((p) => (
            <FilaPedido key={p.id} pedido={p} onAlerta={setAlerta} />
          ))}
        </ul>
      )}
      {alerta && (
        <TarjetaAlerta
          alerta={alerta}
          onCerrar={() => {
            callar();
            setAlerta(null);
          }}
        />
      )}
    </section>
  );
}
