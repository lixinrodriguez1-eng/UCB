"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { deudas, type Deuda } from "@/lib/calculos";
import { enlaceWhatsApp, mensajeCobro, normalizarCelular } from "@/lib/cobros";
import { celularDe, guardarCelular, obtenerCelulares, sinCelulares, suscribirCelulares } from "@/lib/contactos";
import { describirCantidad, formatearBs } from "@/lib/formato";
import { useAhora, useMovimientos, usePagos } from "@/lib/useMovimientos";
import { registrarPago } from "@/lib/pagos";
import { fraseSaldo } from "@/lib/respuestas";
import { hablar } from "@/lib/habla";
import type { FormaPago } from "@/types/movimiento";

const formatoFecha = new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "numeric", month: "short" });

function PanelPago({
  deuda,
  onPagar,
  onCerrar,
}: {
  deuda: Deuda;
  onPagar: (monto: number, forma: FormaPago) => void;
  onCerrar: () => void;
}) {
  const [montoTexto, setMontoTexto] = useState("");
  const [forma, setForma] = useState<FormaPago>("efectivo");
  const valor = Number(montoTexto.replace(",", ".").trim());
  const valido = montoTexto.trim() !== "" && Number.isFinite(valor) && valor > 0;
  const deMas = valido && valor > deuda.total;

  return (
    <div className="mt-3 rounded-2xl border-4 border-tinta bg-verde-claro p-4" role="group" aria-label={`Pago de ${deuda.cliente}`}>
      <p className="text-lg font-extrabold">¿Cuánto te pagó {deuda.cliente}?</p>
      <button
        type="button"
        onClick={() => onPagar(deuda.total, forma)}
        className="mt-2 w-full rounded-2xl border-4 border-tinta bg-verde px-4 py-3 text-xl font-extrabold text-white active:scale-95"
      >
        Todo · {formatearBs(deuda.total)}
      </button>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) onPagar(Math.min(valor, deuda.total), forma);
        }}
      >
        <input
          value={montoTexto}
          onChange={(e) => setMontoTexto(e.target.value)}
          inputMode="decimal"
          placeholder="Una parte, ej. 20"
          aria-label={`Monto que pagó ${deuda.cliente}`}
          className="min-w-0 flex-1 rounded-xl border-4 border-tinta bg-white px-3 py-2 text-xl"
        />
        <button
          type="submit"
          disabled={!valido}
          className="rounded-xl bg-tinta px-4 text-lg font-bold text-crema disabled:opacity-40"
        >
          Guardar
        </button>
      </form>
      {deMas && (
        <p className="mt-1 text-base font-semibold">Es más de lo que debe: se registra {formatearBs(deuda.total)}.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["efectivo", "qr"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={forma === f}
            onClick={() => setForma(f)}
            className={`rounded-full border-2 px-3 py-1 text-base font-bold ${
              forma === f ? "border-tinta bg-tinta text-crema" : "border-tinta/30 bg-white"
            }`}
          >
            {f === "qr" ? "QR" : "Efectivo"}
          </button>
        ))}
        <button type="button" onClick={onCerrar} className="ml-auto px-2 text-base underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FilaDeuda({
  deuda,
  celular,
  onPagar,
}: {
  deuda: Deuda;
  celular?: string;
  onPagar: (cliente: string, monto: number, forma: FormaPago) => void;
}) {
  const [cobrando, setCobrando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(celular ?? "");
  const [error, setError] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const mensaje = mensajeCobro(deuda);

  const guardar = () => {
    if (texto.trim() === "") {
      guardarCelular(deuda.cliente, null);
      setEditando(false);
      return;
    }
    const normal = normalizarCelular(texto);
    if (!normal) {
      setError(true);
      return;
    }
    guardarCelular(deuda.cliente, normal);
    setError(false);
    setEditando(false);
  };

  return (
    <li className="p-4 lg:py-2">
      <div className="flex items-start justify-between gap-3">
        {/* En pantalla grande: nombre, pagos y apuntes en una misma línea. */}
        <div className="min-w-0 lg:flex lg:flex-wrap lg:items-baseline lg:gap-x-3">
          <p className="text-xl font-extrabold">{deuda.cliente}</p>
          {deuda.pagado > 0 && (
            <p className="text-base font-semibold text-verde">
              Ya pagó {formatearBs(deuda.pagado)} de {formatearBs(deuda.apuntado)}
            </p>
          )}
          <button
            type="button"
            onClick={() => setVerDetalle((v) => !v)}
            aria-expanded={verDetalle}
            className="text-left text-base text-tinta-suave underline decoration-dotted underline-offset-4"
          >
            {deuda.fiados} {deuda.fiados === 1 ? "apunte" : "apuntes"}: {deuda.productos.join(", ")}
          </button>
        </div>
        <span className="shrink-0 text-2xl font-black">{formatearBs(deuda.total)}</span>
      </div>

      {verDetalle && (
        <ul className="mt-2 space-y-1 rounded-2xl bg-crema p-3 text-base">
          {deuda.apuntes.map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span>
                {formatoFecha.format(new Date(a.fecha))} · {describirCantidad(a.cantidad, a.unidad, a.producto)}
              </span>
              <span className="font-bold">{formatearBs(a.total)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 lg:gap-1.5">
        <a
          href={enlaceWhatsApp(mensaje, celular)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border-4 border-tinta bg-verde px-4 py-2.5 text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none lg:px-3 lg:py-1.5 lg:text-sm"
          aria-label={`Cobrar a ${deuda.cliente} por WhatsApp: ${mensaje}`}
          title={mensaje}
        >
          <span aria-hidden="true">💬</span> Cobrar por WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setCobrando((v) => !v)}
          aria-expanded={cobrando}
          className="inline-flex items-center gap-2 rounded-2xl border-4 border-tinta bg-white px-4 py-2.5 text-lg font-extrabold shadow-[0_4px_0_0_var(--tinta)] active:translate-y-1 active:shadow-none lg:px-3 lg:py-1.5 lg:text-sm"
        >
          <span aria-hidden="true">✅</span> Ya me pagó
        </button>
        {!editando && (
          <button
            type="button"
            onClick={() => {
              setTexto(celular?.replace(/^591/, "") ?? "");
              setEditando(true);
            }}
            className="rounded-xl px-2 py-1 text-base font-semibold text-tinta-suave underline lg:px-0 lg:text-sm"
          >
            {celular ? `📱 ${celular.replace(/^591/, "")}` : "📱 Agregar celular"}
          </button>
        )}
      </div>

      {cobrando && (
        <PanelPago
          deuda={deuda}
          onPagar={(monto, forma) => {
            setCobrando(false);
            onPagar(deuda.cliente, monto, forma);
          }}
          onCerrar={() => setCobrando(false)}
        />
      )}

      {editando && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setError(false);
            }}
            inputMode="tel"
            autoComplete="off"
            placeholder="ej. 71234567"
            aria-label={`Celular de ${deuda.cliente}`}
            aria-invalid={error}
            className="w-44 rounded-xl border-4 border-tinta bg-white px-3 py-2 text-lg"
            autoFocus
          />
          <button type="submit" className="rounded-xl bg-tinta px-4 py-2 text-lg font-bold text-crema">
            Guardar
          </button>
          <button type="button" onClick={() => setEditando(false)} className="px-2 text-base underline">
            Cancelar
          </button>
          {error && <p className="w-full text-base font-semibold text-rojo">Ese número no parece un celular.</p>}
        </form>
      )}

      <p className="mt-2 text-sm italic text-tinta-suave lg:hidden">“{mensaje}”</p>
    </li>
  );
}

/** Sección "Me deben": apuntados por cliente, con cobro por WhatsApp. */
export default function MeDeben() {
  const movimientos = useMovimientos();
  const pagos = usePagos();
  const ahora = useAhora();
  const celulares = useSyncExternalStore(suscribirCelulares, obtenerCelulares, sinCelulares);
  const [aviso, setAviso] = useState<string | null>(null);

  const lista = useMemo(
    () => (movimientos && pagos && ahora ? deudas({ movimientos, pagos, ahora }) : null),
    [movimientos, pagos, ahora],
  );

  const pagar = (cliente: string, monto: number, forma: FormaPago) => {
    const { saldo } = registrarPago(cliente, monto, forma);
    const frase = fraseSaldo(cliente, saldo);
    setAviso(`✅ ${frase}`);
    hablar(frase);
  };

  if (!lista) return null;
  const total = lista.reduce((s, d) => s + d.total, 0);

  return (
    <section aria-labelledby="titulo-me-deben" className="rounded-3xl border-4 border-tinta bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b-4 border-tinta bg-naranja-claro px-5 py-4">
        <h2 id="titulo-me-deben" className="text-2xl font-extrabold">
          📒 Me deben
        </h2>
        <p className="text-xl font-black">{formatearBs(total)}</p>
      </div>

      {aviso && (
        <p className="border-b-2 border-crema-oscura bg-verde-claro px-5 py-3 text-lg font-bold" aria-live="polite">
          {aviso}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="p-6 text-center text-lg text-tinta-suave">Nadie tiene apuntado. ¡Bien ahí!</p>
      ) : (
        <>
          <ul className="divide-y-2 divide-crema-oscura lg:max-h-[19rem] lg:overflow-y-auto">
            {lista.map((d) => (
              <FilaDeuda key={d.cliente} deuda={d} celular={celularDe(celulares, d.cliente)} onPagar={pagar} />
            ))}
          </ul>
          <p className="border-t-2 border-crema-oscura px-5 py-3 text-sm text-tinta-suave">
            Ya descuenta lo que te pagaron.
            <span className="lg:hidden"> Toca “Ya me pagó” o dilo: “doña Rosa me pagó 20”.</span>
          </p>
        </>
      )}
    </section>
  );
}
