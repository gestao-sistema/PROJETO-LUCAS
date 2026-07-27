const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ROLES = ["Admin", "Gerente", "Coordenador"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No auth header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const callerEmail = callerData.user.email;
  const callerId = callerData.user.id;

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false },
  });

  let callerRole: string | undefined;
  const { data: profileRow } = await adminClient
    .from("profiles")
    .select("role")
    .eq("user_id", callerId)
    .single();
  callerRole = profileRow?.role as string | undefined;

  if (!callerRole) {
    callerRole =
      (callerData.user.app_metadata?.role as string) ??
      (callerData.user.user_metadata?.role as string);
  }

  const isAuthorized =
    ALLOWED_ROLES.includes(callerRole ?? "") ||
    callerEmail === "admin@azime.com.br";

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: "Acesso restrito a Admin, Gerente ou Coordenador." }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { email } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (email === callerEmail) {
    return new Response(
      JSON.stringify({ error: "Você não pode remover sua própria conta." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const user = users?.users.find((u: { email?: string }) => u.email === email);
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
