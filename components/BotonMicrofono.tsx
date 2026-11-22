"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import BotonSilencio from "@/components/BotonSilencio";
import { dividirFrase, parsearFrase, type CampoParseado, type ResultadoParseo } from "@/lib/parser";
import TarjetaPedido from "@/components/TarjetaPedido";
import { compararOfertas, detectarPedido, type ItemPedidoDicho } from "@/lib/pedidos";
import { pesosHablados } from "@/lib/respuestas";
import { agregarMovimiento } from "@/lib/storage";
import { resumirMovimiento } from "@/lib/formato";
import {
  errorPideTexto,
  escuchar,
  mensajeErrorVoz,
  vozSoportada,
  type ControlEscucha,
} from "@/lib/voz";
import TarjetaConfirmacion from "@/components/TarjetaConfirmacion";
import TarjetaAlerta from "@/components/TarjetaAlerta";
import TarjetaRespuesta from "@/components/TarjetaRespuesta";
import TarjetaPago from "@/components/TarjetaPago";
import RegistroManual from "@/components/RegistroManual";
import { detectarPago, registrarPago, type PagoDetectado } from "@/lib/pagos";
import type { FormaPago } from "@/types/movimiento";
import { revisarMargen, type AlertaMargen } from "@/lib/calculos";
import { detectarPregunta } from "@/lib/preguntas";
import { fraseAlerta, fraseSaldo, responderPregunta, type Respuesta } from "@/lib/respuestas";
import { callar, hablar, prepararAudio } from "@/lib/habla";

type Fase =
  | { tipo: "inactivo" }
  | { tipo: "escuchando" }
  | { tipo: "confirmando"; texto: string; resultado: ResultadoParseo }
  | { tipo: "alerta"; alerta: AlertaMargen }
  | { tipo: "respuesta"; pregunta: string; respuesta: Respuesta }
  | { tipo: "pago"; texto: string; detectado: PagoDetectado }
  | { tipo: "pedido"; texto: string; items: ItemPedidoDicho[] };

// El soporte de voz no cambia durante la sesión: no hay nada a qué suscribirse.
const sinSuscripcion = () => () => {};
const SOPORTE_EN_SERVIDOR = null;
/** En el servidor todavía no se sabe (null). */
const soporteEnServidor = () => SOPORTE_EN_SERVIDOR;

export default function BotonMicrofono({ variante = "flotante" }: { variante?: "flotante" | "pastilla" } = {}) {
  const soportada = useSyncExternalStore(sinSuscripcion, vozSoportada, soporteEnServidor);

  const [fase, setFase] = useState<Fase>({ tipo: "inactivo" });
  const [textoParcial, setTextoParcial] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [forzarTexto, setForzarTexto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [manual, setManual] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [ranura, setRanura] = useState<HTMLElement | null>(null);
  const escucha = useRef<ControlEscucha | null>(null);
  // "Vendí 2 kilos de papa a 9 pesos y don Juan me debe 30": lo que falta procesar.
  const pendientes = useRef<string[]>([]);

  // Si se desmonta mientras escucha, cortar el micrófono.
  useEffect(() => () => escucha.current?.cancelar(), []);
  useEffect(() => {
    if (variante !== "pastilla") return;
    setRanura(document.getElementById("caserita-voz"));
  }, [variante]);

  const modoTexto = soportada === false || forzarTexto;

  /** Sigue con la próxima parte de la frase, o vuelve a esperar. */
  const siguiente = () => {
    const proxima = pendientes.current.shift();
    if (proxima) procesarParte(proxima);
    else setFase({ tipo: "inactivo" });
  };

  const procesar = (texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    // "Para mañana necesito un quintal de papa…": pedido a productores.
    const pedido = detectarPedido(limpio);
    if (pedido) {
      pendientes.current = [];
      setEscrito("");
      setFase({ tipo: "pedido", texto: limpio, items: pedido });
      const [primero] = pedido;
      const mejor = compararOfertas(primero)[0];
      if (mejor) {
        hablar(
          `Para ${primero.producto}, lo más barato es ${mejor.productor.nombre}: ${pesosHablados(mejor.costo)}.` +
            (mejor.teDeja !== null ? ` Te deja ${pesosHablados(mejor.teDeja)}.` : ""),
        );
      }
      return;
    }
    // Varias cosas en una frase: se registran de a una.
    const [primera, ...resto] = dividirFrase(limpio);
    pendientes.current = resto;
    procesarParte(primera);
  };

  const procesarParte = (limpio: string) => {
    // "Doña Rosa me pagó 20": pago de lo apuntado.
    const pago = detectarPago(limpio);
    if (pago) {
      setEscrito("");
      setFase({ tipo: "pago", texto: limpio, detectado: pago });
      return;
    }
    // Las preguntas ("¿cuánto gané hoy?") no registran nada: se responden.
    const pregunta = detectarPregunta(limpio);
    if (pregunta) {
      const respuesta = responderPregunta(pregunta);
      setEscrito("");
      setFase({ tipo: "respuesta", pregunta: limpio, respuesta });
      hablar(respuesta.hablado);
      return;
    }
    setFase({ tipo: "confirmando", texto: limpio, resultado: parsearFrase(limpio) });
  };

  const empezar = () => {
    prepararAudio();
    setMensaje(null);
    setTextoParcial("");
    setFase({ tipo: "escuchando" });
    escucha.current = escuchar({
      onTexto: setTextoParcial,
      onFin: (texto) => {
        escucha.current = null;
        if (texto) {
          procesar(texto);
        } else {
          setFase({ tipo: "inactivo" });
          setMensaje(mensajeErrorVoz("no-speech"));
        }
      },
      onError: (codigo) => {
        escucha.current = null;
        setFase({ tipo: "inactivo" });
        const aviso = mensajeErrorVoz(codigo);
        setMensaje(aviso);
        hablar(aviso);
        if (errorPideTexto(codigo)) setForzarTexto(true);
      },
    });
  };

  const alTocar = () => {
    if (fase.tipo === "escuchando") escucha.current?.detener();
    else empezar();
  };

  /** La pastilla "Con voz" del perfil: abre el micrófono, o el texto si no hay voz. */
  const alPastilla = () => {
    if (fase.tipo === "escuchando") {
      escucha.current?.detener();
      return;
    }
    setAbierto(true);
    if (soportada === false) {
      setForzarTexto(true);
      return;
    }
    if (!forzarTexto) empezar();
  };

  const confirmar = (datos: CampoParseado) => {
    agregarMovimiento(datos); // la lista se actualiza sola al cambiar el storage
    // Después de cada compra o venta, ¿está perdiendo plata con este producto?
    const alerta = revisarMargen(datos.producto);
    if (alerta) {
      setFase({ tipo: "alerta", alerta });
      hablar(fraseAlerta(alerta));
    } else {
      siguiente();
    }
    setTextoParcial("");
    setEscrito("");
    setMensaje(`✅ Registrado: ${resumirMovimiento(datos)}`);
  };

  const confirmarPago = (cliente: string, monto: number, forma: FormaPago) => {
    const { saldo } = registrarPago(cliente, monto, forma);
    const frase = fraseSaldo(cliente, saldo);
    siguiente();
    setTextoParcial("");
    setMensaje(`✅ ${frase}`);
    hablar(frase);
  };

  const cancelar = () => {
    siguiente();
    setTextoParcial("");
    setMensaje(null);
  };

  const cerrar = () => {
    callar();
    siguiente();
  };

  const escuchando = fase.tipo === "escuchando";
  const compacto = variante === "pastilla";
  const ocupada =
    fase.tipo === "confirmando" ||
    fase.tipo === "alerta" ||
    fase.tipo === "respuesta" ||
    fase.tipo === "pago" ||
    fase.tipo === "pedido";
  const panelVisible = compacto && (abierto || fase.tipo !== "inactivo" || mensaje !== null);

  const controles = (
        <div className={`pointer-events-auto flex w-full flex-col items-center gap-2 ${compacto ? "" : "max-w-xl bg-gradient-to-t from-crema via-crema/95 to-crema/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 lg:max-w-6xl lg:flex-row lg:gap-8 lg:bg-none lg:px-6 lg:py-4"}`}>
          {/* Lo que va entendiendo o el último aviso */}
          <div aria-live="polite" className="min-h-8 w-full text-center lg:flex-1 lg:text-left">
            {escuchando ? (
              <p className="rounded-2xl border-2 border-tinta bg-white px-4 py-3 text-xl font-semibold">
                {textoParcial || <span className="text-tinta-suave">Te escucho…</span>}
              </p>
            ) : (
              mensaje && <p className="text-lg font-semibold text-tinta">{mensaje}</p>
            )}
          </div>

          {modoTexto ? (
            <form
              className="flex w-full flex-col gap-3 lg:flex-[2]"
              onSubmit={(e) => {
                e.preventDefault();
                procesar(escrito);
              }}
            >
              {soportada === false && (
                <p className="text-center text-base text-tinta-suave">
                  Este navegador no entiende la voz. Escríbelo como lo dirías.
                </p>
              )}
              <input
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                placeholder="Vendí 3 kilos de tomate a 21"
                aria-label="Qué vendiste o compraste"
                enterKeyHint="send"
                className="w-full rounded-2xl border-4 border-tinta bg-white px-4 py-4 text-xl placeholder:text-tinta-suave/60 focus:border-verde focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!escrito.trim()}
                  className="flex-1 rounded-2xl bg-verde py-4 text-xl font-extrabold text-white active:scale-95 disabled:bg-crema-oscura disabled:text-tinta-suave"
                >
                  Registrar
                </button>
                <button type="button" onClick={() => setManual(true)} className="rounded-2xl border-4 border-tinta bg-white px-4 text-lg font-bold">
                  Elegir producto
                </button>
                {soportada && (
                  <button
                    type="button"
                    onClick={() => {
                      setForzarTexto(false);
                      setMensaje(null);
                    }}
                    className="rounded-2xl border-4 border-tinta bg-white px-5 text-xl"
                    aria-label="Volver a usar el micrófono"
                  >
                    🎤
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                {escuchando && (
                  <>
                    <span className={`absolute animate-ping rounded-full bg-rojo/40 ${compacto ? "h-16 w-16" : "h-32 w-32 lg:h-28 lg:w-28"}`} />
                    <span className={`absolute animate-pulse rounded-full bg-rojo/20 ${compacto ? "h-20 w-20" : "h-40 w-40 lg:h-36 lg:w-36"}`} />
                  </>
                )}
                <button
                  type="button"
                  onClick={alTocar}
                  disabled={soportada === null || ocupada}
                  aria-pressed={escuchando}
                  aria-label={escuchando ? "Dejar de escuchar" : "Hablar para registrar"}
                  className={`relative flex items-center justify-center rounded-full border-4 border-tinta text-white shadow-[0_6px_0_0_var(--tinta)] transition active:translate-y-1 active:shadow-none disabled:opacity-60 ${
                    compacto ? "h-16 w-16" : "h-32 w-32 lg:h-28 lg:w-28"
                  } ${escuchando ? "scale-105 bg-rojo" : "bg-verde"}`}
                >
                  <svg viewBox="0 0 24 24" className={compacto ? "h-8 w-8" : "h-16 w-16"} fill="currentColor" aria-hidden="true">
                    {escuchando ? (
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    ) : (
                      <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 1 2 0 8 8 0 0 1-7 7.94V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-1.56a8 8 0 0 1-7-7.94 1 1 0 1 1 2 0 6 6 0 0 0 12 0Z" />
                    )}
                  </svg>
                </button>
              </div>
              <div className="flex flex-col items-center gap-1 lg:flex-1 lg:items-start">
                <p className="text-center text-base font-bold text-tinta sm:text-lg lg:text-left">
                  {escuchando ? "Toca para terminar" : "Toca y dime qué vendiste o pregúntame"}
                </p>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setForzarTexto(true)} className="text-base font-semibold text-tinta-suave underline">
                    Prefiero escribir
                  </button>
                  <button type="button" onClick={() => setManual(true)} className="text-base font-semibold text-tinta-suave underline">
                    Elegir producto
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
  );

  const dialogos = (
    <>
      {fase.tipo === "confirmando" && (
        <TarjetaConfirmacion
          // key: cada frase nueva arranca la tarjeta desde cero
          key={fase.texto}
          texto={fase.texto}
          resultado={fase.resultado}
          onConfirmar={confirmar}
          onCancelar={cancelar}
        />
      )}

      {fase.tipo === "alerta" && (
        <TarjetaAlerta alerta={fase.alerta} onCerrar={cerrar} />
      )}

      {fase.tipo === "pedido" && (
        <TarjetaPedido key={fase.texto} texto={fase.texto} items={fase.items} onCerrar={cerrar} />
      )}

      {fase.tipo === "pago" && (
        <TarjetaPago
          key={fase.texto}
          texto={fase.texto}
          detectado={fase.detectado}
          onConfirmar={confirmarPago}
          onCancelar={cancelar}
        />
      )}

      {fase.tipo === "respuesta" && (
        <TarjetaRespuesta
          pregunta={fase.pregunta}
          respuesta={fase.respuesta}
          onRepetir={() => hablar(fase.respuesta.hablado)}
          onCerrar={cerrar}
        />
      )}

      {manual && (
        <RegistroManual
          onElegir={(producto, categoria) => {
            setManual(false);
            setFase({ tipo: "confirmando", texto: producto, resultado: { tipo: "venta", producto, categoria, unidad: "kilo", pago: "efectivo", faltantes: ["cantidad", "total"] } });
          }}
          onCerrar={() => setManual(false)}
        />
      )}
    </>
  );

  if (compacto) {
    return (
      <>
        <button
          type="button"
          onClick={alPastilla}
          disabled={soportada === null || ocupada}
          aria-pressed={escuchando}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-bold shadow-sm active:scale-95 disabled:opacity-60 ${
            escuchando ? "border-rojo text-rojo" : "border-[#eadfce] text-[#3d2b1f]"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z" />
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5" />
          </svg>
          {escuchando ? "Escuchando" : "Con voz"}
        </button>
        {panelVisible &&
          ranura &&
          createPortal(
            <div className="max-h-[46dvh] overflow-y-auto border-t border-[#eadfce] bg-[#fffaf3] px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <BotonSilencio />
                {fase.tipo === "inactivo" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(false);
                      setMensaje(null);
                    }}
                    className="text-sm font-bold text-tinta-suave underline"
                  >
                    Cerrar
                  </button>
                )}
              </div>
              {controles}
            </div>,
            ranura,
          )}
        {dialogos}
      </>
    );
  }

  return (
    <>
      {/*
        Celular: botón gigante centrado abajo, sobre un degradado.
        Pantalla grande (proyector): franja baja horizontal para no tapar el contenido.
      */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:border-t-4 lg:border-tinta lg:bg-crema">
        {controles}
      </div>
      {dialogos}
    </>
  );
}
