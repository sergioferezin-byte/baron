import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const { Pool } = pg;

function buildPoolConfig(): pg.PoolConfig {
  const base: pg.PoolConfig = {
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  };

  // Preferred: single Supabase/Postgres connection string.
  // Supabase > Project Settings > Database > Connection string (Session pooler).
  if (process.env.DATABASE_URL) {
    return {
      ...base,
      connectionString: process.env.DATABASE_URL,
      // Supabase poolers use certs that don't chain to a public CA.
      ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
    };
  }

  // Legacy: discrete SQL_* variables (Cloud SQL era).
  const { SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME } = process.env;
  if (!SQL_HOST || !SQL_USER || !SQL_DB_NAME) {
    console.error(
      "[DB] Banco de dados NÃO configurado. Defina DATABASE_URL (connection string do Supabase) " +
      "ou SQL_HOST/SQL_USER/SQL_PASSWORD/SQL_DB_NAME no ambiente. " +
      "As rotas de dados falharão até que isso seja corrigido."
    );
  }
  return {
    ...base,
    host: SQL_HOST,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
    user: SQL_USER,
    password: SQL_PASSWORD,
    database: SQL_DB_NAME,
    ssl: process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});

let lastDbError: string | null = null;

export function getLastDbError(): string | null {
  return lastDbError;
}

/** Sanitized info about the configured DATABASE_URL (never exposes the password). */
export function getDbTargetInfo(): { host: string; port: string; protocol: string } | { error: string } | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    return { protocol: u.protocol.replace(":", ""), host: u.hostname, port: u.port || "5432" };
  } catch {
    return { error: "DATABASE_URL não é uma URL válida" };
  }
}

// Fail fast with a readable message instead of a cryptic error on the first user request.
export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query("select 1");
    } finally {
      client.release();
    }
    lastDbError = null;
    console.log("[DB] Conexão com o banco de dados verificada com sucesso.");
    return true;
  } catch (err: any) {
    lastDbError = [err?.code, err?.message].filter(Boolean).join(": ") || String(err);
    console.error("[DB] FALHA ao conectar no banco de dados:", lastDbError);
    console.error(
      "[DB] Verifique DATABASE_URL (ou SQL_HOST/SQL_USER/SQL_PASSWORD/SQL_DB_NAME). " +
      "Para Supabase, use a connection string do Session Pooler com SSL."
    );
    return false;
  }
}

export const db = drizzle(pool, { schema });
