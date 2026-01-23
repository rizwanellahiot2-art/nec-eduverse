// EDUVERSE Admin — create user with explicit password (no public signup)
// Platform Super Admin only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateUserRequest = {
  schoolSlug: string;
  email: string;
  password: string;
  displayName?: string;
  role:
    | "school_owner"
    | "principal"
    | "vice_principal"
    | "academic_coordinator"
    | "teacher"
    | "accountant"
    | "hr_manager"
    | "counselor"
    | "student"
    | "parent"
    | "marketing_staff";
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anon) return json({ ok: false, error: "Missing SUPABASE_ANON_KEY" }, 500, traceId);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401, traceId);
    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    const actorUserId = claimsData?.claims?.sub;
    if (claimsErr || !actorUserId) return json({ ok: false, error: "Unauthorized" }, 401, traceId);

    const body = (await req.json()) as CreateUserRequest;
    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ ok: false, error: "Invalid schoolSlug" }, 400, traceId);

    const email = body.email.trim().toLowerCase();
    if (!email.includes("@")) return json({ ok: false, error: "Invalid email" }, 400, traceId);

    const password = body.password;
    if (!password || password.length < 8) return json({ ok: false, error: "Password must be at least 8 characters." }, 400, traceId);

    // Guardrail: never create platform super admin via this function.
    if ((body.role as string) === "super_admin") return json({ ok: false, error: "Invalid role" }, 400, traceId);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: psa, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (psaErr) return json({ ok: false, error: psaErr.message }, 400, traceId);
    if (!psa?.user_id) return json({ ok: false, error: "Forbidden" }, 403, traceId);

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id,slug,name")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (schoolErr || !school) return json({ ok: false, error: schoolErr?.message ?? "School not found" }, 400, traceId);

    // Create or update auth user
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) console.log("listUsers err:", listErr.message);
    const existingUser = existing?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

    let userId = existingUser?.id ?? null;
    if (!userId) {
      const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) return json({ ok: false, error: createErr.message }, 400, traceId);
      userId = createdUser.user?.id ?? null;
    } else {
      // Set/reset password explicitly
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (updErr) return json({ ok: false, error: updErr.message }, 400, traceId);
    }
    if (!userId) return json({ ok: false, error: "Failed to create user" }, 500, traceId);

    // Profile
    if (body.displayName?.trim()) {
      const { error: profErr } = await admin
        .from("profiles")
        .upsert({ user_id: userId, display_name: body.displayName.trim() }, { onConflict: "user_id" });
      if (profErr) return json({ ok: false, error: profErr.message }, 400, traceId);
    }

    // Membership + role + directory
    const { error: memErr } = await admin
      .from("school_memberships")
      .upsert({ school_id: school.id, user_id: userId, status: "active", created_by: actorUserId }, { onConflict: "school_id,user_id" });
    if (memErr) return json({ ok: false, error: memErr.message }, 400, traceId);

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert(
        { school_id: school.id, user_id: userId, role: body.role, created_by: actorUserId },
        { onConflict: "school_id,user_id,role" },
      );
    if (roleErr) return json({ ok: false, error: roleErr.message }, 400, traceId);

    await admin
      .from("school_user_directory")
      .upsert(
        {
          school_id: school.id,
          user_id: userId,
          email,
          display_name: body.displayName?.trim() ?? null,
        },
        { onConflict: "school_id,user_id" },
      );

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_user_id: actorUserId,
      action: "user_created_direct",
      entity_type: "user",
      entity_id: userId,
      metadata: { email, role: body.role },
    });

    return json({ ok: true, school, userId }, 200, traceId);
  } catch (e) {
    console.error("eduverse-admin-create-user error:", e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500, makeTraceId());
  }
});
