// EDUVERSE Admin — create/update school + create first Principal with email+password
// Platform Super Admin only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateSchoolRequest = {
  slug: string;
  name: string;
  isActive?: boolean;
  principalEmail: string;
  principalPassword: string;
  principalDisplayName?: string;
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

    const body = (await req.json()) as CreateSchoolRequest;
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) return json({ error: "Invalid slug" }, 400);
    const name = (body.name || slug).trim();
    if (!name) return json({ error: "Invalid name" }, 400);

    const principalEmail = body.principalEmail.trim().toLowerCase();
    if (!principalEmail.includes("@")) return json({ error: "Invalid principalEmail" }, 400);
    if (!body.principalPassword || body.principalPassword.length < 8) {
      return json({ error: "Principal password must be at least 8 characters." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: psa, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (psaErr) return json({ error: psaErr.message }, 400);
    if (!psa?.user_id) return json({ error: "Forbidden" }, 403);

    // Upsert school
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .upsert(
        { slug, name, is_active: body.isActive ?? true },
        { onConflict: "slug" },
      )
      .select("id,slug,name,is_active")
      .single();
    if (schoolErr) return json({ error: schoolErr.message }, 400);

    // Ensure default related rows
    await admin.from("school_branding").upsert({ school_id: school.id }, { onConflict: "school_id" });

    // Create or update principal
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) console.log("listUsers err:", listErr.message);
    const existingUser = existing?.users?.find((u) => (u.email ?? "").toLowerCase() === principalEmail);

    let principalUserId = existingUser?.id ?? null;
    if (!principalUserId) {
      const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
        email: principalEmail,
        password: body.principalPassword,
        email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);
      principalUserId = createdUser.user?.id ?? null;
    } else {
      const { error: updErr } = await admin.auth.admin.updateUserById(principalUserId, { password: body.principalPassword });
      if (updErr) return json({ error: updErr.message }, 400);
    }
    if (!principalUserId) return json({ error: "Failed to create principal user" }, 500);

    const displayName = body.principalDisplayName?.trim() || "Principal";

    await admin.from("profiles").upsert(
      { user_id: principalUserId, display_name: displayName },
      { onConflict: "user_id" },
    );

    const { error: memErr } = await admin
      .from("school_memberships")
      .upsert({ school_id: school.id, user_id: principalUserId, status: "active", created_by: actorUserId }, { onConflict: "school_id,user_id" });
    if (memErr) return json({ error: memErr.message }, 400);

    // Principal role
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert(
        { school_id: school.id, user_id: principalUserId, role: "principal", created_by: actorUserId },
        { onConflict: "school_id,user_id,role" },
      );
    if (roleErr) return json({ error: roleErr.message }, 400);

    await admin.from("school_user_directory").upsert(
      { school_id: school.id, user_id: principalUserId, email: principalEmail, display_name: displayName },
      { onConflict: "school_id,user_id" },
    );

    // Mark as bootstrapped (so bootstrap secret isn't required later)
    await admin
      .from("school_bootstrap")
      .upsert(
        {
          school_id: school.id,
          locked: true,
          bootstrapped_at: new Date().toISOString(),
          bootstrapped_by: actorUserId,
        },
        { onConflict: "school_id" },
      );

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_user_id: actorUserId,
      action: "school_created_direct",
      entity_type: "school",
      entity_id: slug,
      metadata: { principalEmail },
    });

    return json({ ok: true, school, principalUserId });
  } catch (e) {
    console.error("eduverse-admin-create-school error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
