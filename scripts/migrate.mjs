import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection string from env or args
const connStr = process.env.MIGRATE_DB || process.argv[2];
if (!connStr) {
  console.error(
    "Usage: node migrate.js postgresql://postgres:AZIME2026..@db.ctxmlvsrichzgvwqapex.supabase.co:5432/postgres",
  );
  console.error("Or: set MIGRATE_DB env var");
  process.exit(1);
}

const client = new pg.Client(connStr);

async function runMigration(filePath, label) {
  const sql = readFileSync(filePath, "utf-8");
  console.log(`\n=== ${label} ===`);
  try {
    await client.query(sql);
    console.log(`  OK - ${label}`);
  } catch (err) {
    console.error(`  FAIL - ${label}: ${err.message}`);
    // Don't abort whole migration on minor errors (like duplicate policy)
    if (err.message.includes("already exists") || err.message.includes("duplicate")) {
      console.log("  (non-critical, continuing)");
    } else {
      throw err;
    }
  }
}

async function main() {
  const migrationsDir = join(__dirname, "..", "supabase", "migrations");
  const files = [
    ["001_create_tables.sql", "Create tables"],
    ["002_rls_policies.sql", "RLS policies"],
    ["003_insert_data.sql", "Insert data"],
  ];

  console.log("Connecting to empresa database...");
  await client.connect();
  console.log("Connected.\n");

  for (const [file, label] of files) {
    await runMigration(join(migrationsDir, file), label);
  }

  await client.end();
  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
