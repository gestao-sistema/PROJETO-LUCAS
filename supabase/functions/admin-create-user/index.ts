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
  const { email, password, name, role } = body;

  if (!email || !password || !name) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u: { email?: string }) => u.email === email);
  if (existing) {
    return new Response(JSON.stringify({ error: "Este e-mail já possui acesso ao sistema." }), {
      status: 409,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: role ?? "Auxiliar" },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (newUser.user) {
    await adminClient.from("profiles").upsert({
      user_id: newUser.user.id,
      name,
      email,
      role: role ?? "Auxiliar",
    });

    const color = ["bg-rose-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
      "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500"][
      Math.floor(Math.random() * 8)
    ];
    await adminClient.from("colaboradores").upsert({
      id: `u-${Date.now()}`,
      name,
      role: role ?? "Auxiliar",
      color,
      email,
    });
  }

  return new Response(JSON.stringify({ success: true, userId: newUser.user?.id }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
