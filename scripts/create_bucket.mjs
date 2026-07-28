import { createClient } from "@supabase/supabase-js";

const url = process.argv[2];
const serviceKey = process.argv[3];
if (!url || !serviceKey) {
  console.error("Usage: node scripts/create_bucket.mjs URL SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false } });

const { data, error } = await supabase.storage.createBucket("avatars", {
  public: true,
  fileSizeLimit: 2097152,
});

if (error) {
  console.log("createBucket error:", error.message);
} else {
  console.log("createBucket OK:", data);
}

// List to confirm
const { data: list } = await supabase.storage.listBuckets();
console.log("buckets:", list?.map(b => b.name));
