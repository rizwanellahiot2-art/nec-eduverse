// EDUVERSE Admin — unlock school bootstrap
// Platform Super Admin only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UnlockBootstrapRequest = {
  schoolSlug: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anon) return json({ error: "Missing SUPABASE_ANON_KEY" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const actorUserId = claimsData?.claims?.sub;
    if (claimsErr || !actorUserId) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as UnlockBootstrapRequest;
    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ error: "Invalid schoolSlug" }, 400);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: psa, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (psaErr) return json({ error: psaErr.message }, 400);
    if (!psa?.user_id) return json({ error: "Forbidden" }, 403);

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id,slug,name")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (schoolErr || !school) return json({ error: schoolErr?.message ?? "School not found" }, 400);

    const { error: upsertErr } = await admin
      .from("school_bootstrap")
      .upsert(
        {
          school_id: school.id,
          locked: false,
          bootstrapped_at: null,
          bootstrapped_by: null,
        },
        { onConflict: "school_id" },
      );
    if (upsertErr) return json({ error: upsertErr.message }, 400);

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_user_id: actorUserId,
      action: "bootstrap_unlocked",
      entity_type: "school",
      entity_id: schoolSlug,
      metadata: {},
    });

    return json({ ok: true, school });
  } catch (e) {
    console.error("eduverse-admin-unlock-bootstrap error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
