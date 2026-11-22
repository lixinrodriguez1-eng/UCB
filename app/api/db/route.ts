import { connection } from "next/server";
import { consultar } from "@/lib/db";

/** GET /api/db — prueba la conexión con PostgreSQL por HTTP. */
export async function GET() {
  await connection(); // se ejecuta en cada petición, no al compilar

  try {
    const [fila] = await consultar<{ base: string; usuario: string; hora: Date }>(
      "SELECT current_database() AS base, current_user AS usuario, now() AS hora",
    );
    return Response.json({ ok: true, ...fila });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error("[api/db] Error de conexión:", mensaje);
    return Response.json(
      { ok: false, error: "No se pudo conectar a la base de datos" },
      { status: 503 },
    );
  }
}
