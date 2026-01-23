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
  force?: boolean;
};

const makeTraceId = () => crypto.randomUUID();

const json = (data: unknown, status = 200, traceId?: string) =>
  new Response(JSON.stringify({ traceId, ...((data ?? {}) as any) }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const traceId = makeTraceId();

    const body = (await req.json()) as BootstrapRequest;

    const expected = Deno.env.get("EDUVERSE_BOOTSTRAP_SECRET") ?? "";
    if (!expected || body.bootstrapSecret !== expected) {
      return json({ ok: false, error: "Invalid bootstrap secret." }, 401, traceId);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole);

    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ ok: false, error: "Invalid schoolSlug." }, 400, traceId);

    // 1) Create school (idempotent)
    const { data: schoolRow, error: schoolInsertErr } = await admin
      .from("schools")
      .upsert({ slug: schoolSlug, name: body.schoolName || schoolSlug }, { onConflict: "slug" })
      .select("id,slug,name")
      .single();
    if (schoolInsertErr) return json({ ok: false, error: schoolInsertErr.message }, 400, traceId);

    // 1b) Check bootstrap lock
    const { data: bsState } = await admin
      .from("school_bootstrap")
      .select("locked")
      .eq("school_id", schoolRow.id)
      .maybeSingle();
    if (bsState?.locked && !body.force) {
      return json({ ok: false, error: "Bootstrap is locked for this school." }, 409, traceId);
    }

    // 2) Create (or reuse) admin user
    const email = body.adminEmail.trim().toLowerCase();
    if (!email) return json({ ok: false, error: "Invalid adminEmail." }, 400, traceId);

    const password = String(body.adminPassword ?? "");
    if (!password || password.length < 8) {
      return json({ ok: false, error: "Admin password must be at least 8 characters." }, 400, traceId);
    }

    // If force is enabled (or school is already bootstrapped), we should be able to re-issue
    // a password-set link without trying to re-create the user.
    let userId: string | null = null;
    const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return json({ error: listErr.message }, 400);
    const existing = usersList.users.find((u) => (u.email ?? "").toLowerCase() === email);
    userId = existing?.id ?? null;

    if (!userId) {
      const { data: createdUser, error: createUserErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createUserErr) return json({ ok: false, error: createUserErr.message }, 400, traceId);
      userId = createdUser.user?.id ?? null;
      if (!userId) return json({ ok: false, error: "Failed to create admin user." }, 500, traceId);
    } else {
      // Force mode allows resetting the admin password for already-bootstrapped schools.
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (updErr) return json({ ok: false, error: updErr.message }, 400, traceId);
    }

    // Mark as PLATFORM Super Admin (global)
    const { error: psaErr } = await admin.from("platform_super_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
    if (psaErr) return json({ ok: false, error: psaErr.message }, 400, traceId);

    // 3) Profile
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, display_name: body.displayName ?? "Super Admin" }, { onConflict: "user_id" });
    if (profileErr) return json({ ok: false, error: profileErr.message }, 400, traceId);

    // Directory (for UI visibility)
    await admin
      .from("school_user_directory")
      .upsert(
        {
          school_id: schoolRow.id,
          user_id: userId,
          email,
          display_name: body.displayName ?? "Super Admin",
        },
        { onConflict: "school_id,user_id" },
      );

    // 4) Membership + roles
    const { error: memErr } = await admin
      .from("school_memberships")
      .upsert(
        { school_id: schoolRow.id, user_id: userId, status: "active", created_by: userId },
        { onConflict: "school_id,user_id" },
      );
    if (memErr) return json({ ok: false, error: memErr.message }, 400, traceId);

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

    // Lock bootstrap
    await admin
      .from("school_bootstrap")
      .upsert(
        {
          school_id: schoolRow.id,
          bootstrapped_at: new Date().toISOString(),
          bootstrapped_by: userId,
          locked: true,
        },
        { onConflict: "school_id" },
      );

    return json({
      ok: true,
      school: schoolRow,
      adminUserId: userId,
      message: "Bootstrap complete. You can now sign in via /:school/auth as Super Admin/Principal.",
    }, 200, traceId);
  } catch (e) {
    console.error("eduverse-bootstrap error:", e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500, makeTraceId());
  }
});
