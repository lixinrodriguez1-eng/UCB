import { Pool, type QueryResultRow } from "pg";

/**
 * Conexión a PostgreSQL. Solo se usa en el servidor (rutas en app/api),
 * nunca en componentes del navegador: la contraseña vive en .env.
 */

const globalParaPool = globalThis as unknown as { poolCaserita?: Pool };

function crearPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL en el archivo .env");
  }
  return new Pool({ connectionString: url, max: 10 });
}

/** Un solo pool para toda la app (en desarrollo sobrevive a las recargas). */
export function obtenerPool(): Pool {
  if (!globalParaPool.poolCaserita) {
    globalParaPool.poolCaserita = crearPool();
  }
  return globalParaPool.poolCaserita;
}

/** Ejecuta una consulta con parámetros ($1, $2, ...) y devuelve las filas. */
export async function consultar<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  const resultado = await obtenerPool().query<T>(sql, parametros);
  return resultado.rows;
}
