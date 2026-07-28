import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connStr = process.argv[2];
if (!connStr) { console.error("Needs connection string"); process.exit(1); }

const client = new pg.Client({
  connectionString: connStr,
  host: "db.tzzsbgvayplefwbdrymd.supabase.co",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "004_storage_bucket_policies.sql"), "utf-8");
try {
  await client.query(sql);
  console.log("Storage policies OK");
} catch (e) {
  console.log("Storage policies err:", e.message);
}
await client.end();
