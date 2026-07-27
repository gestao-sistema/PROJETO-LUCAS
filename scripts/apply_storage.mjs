import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connStr = process.argv[2] || process.env.MIGRATE_DB;
if (!connStr) { console.error("Connection string required"); process.exit(1); }

const client = new pg.Client(connStr);
await client.connect();

const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "004_storage_bucket.sql"), "utf-8");
try {
  await client.query(sql);
  console.log("Storage bucket created OK");
} catch (e) {
  console.log("Storage bucket:", e.message);
}
await client.end();
