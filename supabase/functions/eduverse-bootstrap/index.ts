// EDUVERSE bootstrap (one-time) — creates first Super Admin + school.
// Auth is disabled for this function; guarded by a workspace secret.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BootstrapRequest = {
  bootstrapSecret: string;
  schoolSlug: string;
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  displayName?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as BootstrapRequest;

    const expected = Deno.env.get("EDUVERSE_BOOTSTRAP_SECRET") ?? "";
    if (!expected || body.bootstrapSecret !== expected) {
      return json({ error: "Invalid bootstrap secret." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ error: "Invalid schoolSlug." }, 400);

    // 1) Create school (idempotent)
    const { data: schoolRow, error: schoolInsertErr } = await admin
      .from("schools")
      .upsert({ slug: schoolSlug, name: body.schoolName || schoolSlug }, { onConflict: "slug" })
      .select("id,slug,name")
      .single();
    if (schoolInsertErr) return json({ error: schoolInsertErr.message }, 400);

    // 2) Create admin user
    const { data: createdUser, error: createUserErr } = await admin.auth.admin.createUser({
      email: body.adminEmail.trim().toLowerCase(),
      password: body.adminPassword,
      email_confirm: true,
    });
    if (createUserErr) return json({ error: createUserErr.message }, 400);
    const userId = createdUser.user?.id;
    if (!userId) return json({ error: "Failed to create admin user." }, 500);

    // 3) Profile
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, display_name: body.displayName ?? "Super Admin" }, { onConflict: "user_id" });
    if (profileErr) return json({ error: profileErr.message }, 400);

    // 4) Membership + roles
    const { error: memErr } = await admin
      .from("school_memberships")
      .upsert(
        { school_id: schoolRow.id, user_id: userId, status: "active", created_by: userId },
        { onConflict: "school_id,user_id" },
      );
    if (memErr) return json({ error: memErr.message }, 400);

    const { error: roleErr } = await admin.from("user_roles").insert([
      { school_id: schoolRow.id, user_id: userId, role: "super_admin", created_by: userId },
      { school_id: schoolRow.id, user_id: userId, role: "school_owner", created_by: userId },
      { school_id: schoolRow.id, user_id: userId, role: "principal", created_by: userId },
    ]);
    if (roleErr) {
      // ignore duplicates if re-run
      console.log("role insert err (can be duplicate):", roleErr.message);
    }

    // 5) Branding default
    await admin.from("school_branding").upsert({ school_id: schoolRow.id }, { onConflict: "school_id" });

    return json({
      ok: true,
      school: schoolRow,
      adminUserId: userId,
      message: "Bootstrap complete. You can now sign in via /:school/auth as Super Admin/Principal.",
    });
  } catch (e) {
    console.error("eduverse-bootstrap error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
