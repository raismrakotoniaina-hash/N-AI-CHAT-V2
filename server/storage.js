import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const pool = USE_POSTGRES ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
}) : null;

export async function initStorage() {
  if (USE_POSTGRES) {
    await pool.query("CREATE TABLE IF NOT EXISTS nai_collections (name TEXT PRIMARY KEY, data JSONB NOT NULL)");
    await pool.query("INSERT INTO nai_collections (name, data) VALUES ('users','[]'::jsonb) ON CONFLICT (name) DO NOTHING");
    await pool.query("INSERT INTO nai_collections (name, data) VALUES ('payments','[]'::jsonb) ON CONFLICT (name) DO NOTHING");
    await pool.query("INSERT INTO nai_collections (name, data) VALUES ('memories','[]'::jsonb) ON CONFLICT (name) DO NOTHING");
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of ["users.json", "payments.json", "memories.json"]) {
    const target = path.join(DATA_DIR, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, "[]", "utf8");
  }
}

export async function getCollection(name) {
  if (USE_POSTGRES) {
    const result = await pool.query("SELECT data FROM nai_collections WHERE name=$1", [name]);
    return result.rows[0]?.data || [];
  }
  const target = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(target)) fs.writeFileSync(target, "[]", "utf8");
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

export async function setCollection(name, data) {
  if (USE_POSTGRES) {
    await pool.query(
      "INSERT INTO nai_collections (name,data) VALUES ($1,$2::jsonb) ON CONFLICT (name) DO UPDATE SET data=EXCLUDED.data",
      [name, JSON.stringify(data)]
    );
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name + ".json"), JSON.stringify(data, null, 2), "utf8");
}

export { USE_POSTGRES };
