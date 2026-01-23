// EDUVERSE Admin — audited impersonation
// Platform Super Admin only.
// Generates a one-time magic link for the target user, redirecting into a specified school role route.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImpersonateRequest = {
  targetEmail: string;
  schoolSlug: string;
  rolePath: string; // e.g. principal | teacher | hr | marketing
  appOrigin?: string; // window.location.origin
  reason?: string;
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

    const body = (await req.json()) as ImpersonateRequest;
    const targetEmail = body.targetEmail.trim().toLowerCase();
    if (!targetEmail.includes("@")) return json({ error: "Invalid targetEmail" }, 400);

    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ error: "Invalid schoolSlug" }, 400);

    const rolePath = body.rolePath.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (!rolePath) return json({ error: "Invalid rolePath" }, 400);

    const rawOrigin = (body.appOrigin ?? req.headers.get("origin") ?? "").trim();
    let appOrigin: string;
    try {
      appOrigin = new URL(rawOrigin).origin;
    } catch {
      return json({ error: "Invalid appOrigin. Pass window.location.origin from the client." }, 400);
    }

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

    // Find user by email
    const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return json({ error: listErr.message }, 400);
    const u = usersList.users.find((x) => (x.email ?? "").toLowerCase() === targetEmail);
    if (!u?.email) return json({ error: "Target user not found" }, 404);

    const redirectTo = `${appOrigin.replace(/\/$/, "")}/${schoolSlug}/${rolePath}`;

    // Generate a one-time sign-in link as the target user.
    // NOTE: this intentionally logs-in as the target user; must be audited.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: u.email,
      options: { redirectTo },
    });
    if (linkErr) return json({ error: linkErr.message }, 400);

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_user_id: actorUserId,
      action: "impersonation_link_generated",
      entity_type: "user",
      entity_id: u.id,
      metadata: {
        targetEmail,
        redirectTo,
        reason: body.reason ?? null,
      },
    });

    return json({ ok: true, actionLink: linkData?.properties?.action_link ?? null });
  } catch (e) {
    console.error("eduverse-admin-impersonate error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
