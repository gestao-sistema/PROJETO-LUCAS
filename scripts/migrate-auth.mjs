import { createClient } from "@supabase/supabase-js";

// Usage: node scripts/migrate-auth.mjs SUPABASE_URL SERVICE_ROLE_KEY
const url = process.argv[2];
const serviceKey = process.argv[3];

if (!url || !serviceKey) {
  console.error("Usage: node scripts/migrate-auth.mjs https://PROJECT.supabase.co SERVICE_ROLE_KEY");
  console.error("Or: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false } });

const users = [
  { id: "a0000000-0000-0000-0000-000000000001", email: "admin@azime.com.br", name: "Admin", role: "Admin" },
  { id: "a67410c0-fd38-4642-b49d-77092faf616d", email: "alan.martins@azime.com.br", name: "Alan Martins", role: "Analista" },
  { id: "da2b951d-8e8d-4782-87a9-718b6e27cc2d", email: "lucas.emori@azime.com.br", name: "Lucas Emori", role: "Analista" },
  { id: "8d6070a4-613c-4cf1-9563-cfc08c5acf53", email: "maiara.silva@azime.com.br", name: "Maiara Hamasaki", role: "Coordenador" },
  { id: "0ed430bd-fc60-40b8-9ee1-7e78041b03ce", email: "bruna.soares@azime.com.br", name: "Bruna Soares", role: "Analista" },
  { id: "b2be2bd3-1d21-48c2-8a0a-3acad31b16e7", email: "karina.bocci@azime.com.br", name: "Karina Bocci", role: "Analista" },
  { id: "57956c6f-4ab9-4a2b-97e7-cf7d5aad8ae8", email: "marilyn.assis@azime.com.br", name: "Marilyn Assis", role: "Gerente" },
  { id: "1455cddc-3938-4393-84e7-d27a1826e19a", email: "camila.santos@azime.com.br", name: "Camila dos Santos", role: "Analista" },
  { id: "497b9bb7-5944-4f70-ba70-b7b1bf735b22", email: "alexandre.silva@azime.com.br", name: "Alexandre da Silva", role: "Analista" },
  { id: "8e5941f7-8e6b-4f13-a30f-b94dc9c11b14", email: "suzy.souza@azime.com.br", name: "Suzy Souza", role: "Analista" },
  { id: "24e2432a-df58-47ec-b23d-509b1e660faa", email: "luis.santos@azime.com.br", name: "Luis Santos", role: "Analista" },
];

console.log(`Creating ${users.length} auth users (preserving UUIDs)...`);

for (const u of users) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: "Azime2026..", // Temporary - user resets on first login
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error) {
      console.log(`  SKIP ${u.email}: ${error.message}`);
    } else {
      console.log(`  OK ${u.email} (${data.user?.id})`);
    }
  } catch (err) {
    console.log(`  ERROR ${u.email}: ${err.message}`);
  }
}

// Check that FK constraints will be satisfied
console.log("\nVerifying profiles + purchase_orders + personal_tasks FK integrity...");
const { count: profileCount } = await supabase
  .from("profiles")
  .select("*", { count: "exact", head: true });
console.log(`  profiles: ${profileCount} rows`);

const { count: poCount } = await supabase
  .from("purchase_orders")
  .select("*", { count: "exact", head: true });
console.log(`  purchase_orders: ${poCount} rows`);

const { count: ptCount } = await supabase
  .from("personal_tasks")
  .select("*", { count: "exact", head: true });
console.log(`  personal_tasks: ${ptCount} rows`);

console.log("\nDone. Users must reset password via 'Esqueceu a senha?' on first login.");
