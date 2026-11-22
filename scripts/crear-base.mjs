// Crea la base (si falta) y sus tablas usando DATABASE_URL de .env.local.
// Uso: npm run db:crear   (con el túnel SSH abierto)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (revisa .env.local).");
  process.exit(1);
}

const destino = new URL(url);
const nombreBase = decodeURIComponent(destino.pathname.slice(1));

async function crearBaseSiFalta() {
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const cliente = new pg.Client({ connectionString: admin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [nombreBase]);
    if (rowCount) {
      console.log(`La base "${nombreBase}" ya existe.`);
      return;
    }
    await cliente.query(`CREATE DATABASE "${nombreBase.replaceAll('"', '""')}"`);
    console.log(`Base "${nombreBase}" creada.`);
  } finally {
    await cliente.end();
  }
}

async function crearTablas() {
  const sql = readFileSync(fileURLToPath(new URL("../db/schema.sql", import.meta.url)), "utf8");
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(sql);
    await cliente.query("COMMIT");
    const { rows } = await cliente.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
    );
    console.log("Tablas en la base:", rows.map((r) => r.table_name).join(", "));
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await cliente.end();
  }
}

try {
  await crearBaseSiFalta();
} catch (error) {
  // Si el usuario no puede entrar a "postgres" o no tiene CREATEDB, se intenta
  // igual con las tablas: la base puede existir ya.
  console.warn(`No se pudo revisar/crear la base: ${error.message}`);
}

try {
  await crearTablas();
} catch (error) {
  console.error(`No se pudieron crear las tablas: ${error.message}`);
  process.exit(1);
}
