// EDUVERSE Staff Governance
// Deactivate/reactivate (via role removal/reassignment), and generate recovery/magic links.
// Requires JWT (verify_jwt=true); also checks caller has staff governance privileges.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GovernanceAction =
  | "deactivate" // remove all roles for user in a school
  | "set_roles" // replace roles for user in a school
  | "generate_recovery_link"
  | "generate_magic_link";

type GovernanceRequest = {
  schoolSlug: string;
  targetUserId: string;
  roles?: string[]; // required for set_roles
  appOrigin?: string; // window.location.origin
  reason?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const normalizeSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anon) return json({ error: "Missing SUPABASE_ANON_KEY" }, 500);

    // user-scoped client: identify caller
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims();
    const actorUserId = claimsData?.claims?.sub;
    if (claimsErr || !actorUserId) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as GovernanceRequest & { action?: GovernanceAction };
    const action = (body.action ?? "").trim() as GovernanceAction;
    if (!action) return json({ error: "Missing action" }, 400);

    const schoolSlug = normalizeSlug(body.schoolSlug ?? "");
    if (!schoolSlug) return json({ error: "Invalid schoolSlug" }, 400);

    const targetUserId = (body.targetUserId ?? "").trim();
    if (!targetUserId) return json({ error: "Invalid targetUserId" }, 400);

    const admin = createClient(supabaseUrl, serviceRole);

    // Resolve school
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id,slug")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (schoolErr || !school) return json({ error: schoolErr?.message ?? "School not found" }, 400);

    // Permission check: platform super admin OR one of the governance roles in the school
    const { data: psa, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (psaErr) return json({ error: psaErr.message }, 400);
    const isPlatformSuperAdmin = !!psa?.user_id;

    if (!isPlatformSuperAdmin) {
      const { data: roleRows, error: roleErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("school_id", school.id)
        .eq("user_id", actorUserId)
        .in("role", ["super_admin", "school_owner", "principal", "vice_principal", "hr_manager"])
        .limit(1);
      if (roleErr) return json({ error: roleErr.message }, 400);
      if (!roleRows || roleRows.length === 0) return json({ error: "Forbidden" }, 403);
    }

    // Snapshot existing roles for audit metadata
    const { data: beforeRolesRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("school_id", school.id)
      .eq("user_id", targetUserId);
    const beforeRoles = (beforeRolesRows ?? []).map((r: any) => String(r.role));

    if (action === "deactivate") {
      const { error: delErr } = await admin
        .from("user_roles")
        .delete()
        .eq("school_id", school.id)
        .eq("user_id", targetUserId);
      if (delErr) return json({ error: delErr.message }, 400);

      await admin.from("audit_logs").insert({
        school_id: school.id,
        actor_user_id: actorUserId,
        action: "staff_deactivated",
        entity_type: "user",
        entity_id: targetUserId,
        metadata: { beforeRoles, reason: body.reason ?? null },
      });

      return json({ ok: true });
    }

    if (action === "set_roles") {
      const roles = Array.isArray(body.roles) ? body.roles.map(String) : [];
      if (roles.length === 0) return json({ error: "roles is required" }, 400);

      // Replace roles: delete then insert
      const { error: delErr } = await admin
        .from("user_roles")
        .delete()
        .eq("school_id", school.id)
        .eq("user_id", targetUserId);
      if (delErr) return json({ error: delErr.message }, 400);

      const rows = roles.map((role) => ({
        school_id: school.id,
        user_id: targetUserId,
        role,
        created_by: actorUserId,
      }));
      const { error: insErr } = await admin.from("user_roles").insert(rows);
      if (insErr) return json({ error: insErr.message }, 400);

      await admin.from("audit_logs").insert({
        school_id: school.id,
        actor_user_id: actorUserId,
        action: "staff_roles_reassigned",
        entity_type: "user",
        entity_id: targetUserId,
        metadata: { beforeRoles, afterRoles: roles, reason: body.reason ?? null },
      });

      return json({ ok: true, roles });
    }

    if (action === "generate_recovery_link" || action === "generate_magic_link") {
      const rawOrigin = (body.appOrigin ?? req.headers.get("origin") ?? "").trim();
      let appOrigin: string;
      try {
        appOrigin = new URL(rawOrigin).origin;
      } catch {
        return json({ error: "Invalid appOrigin. Pass window.location.origin from the client." }, 400);
      }

      const { data: userResp, error: userErr } = await admin.auth.admin.getUserById(targetUserId);
      if (userErr) return json({ error: userErr.message }, 400);
      const email = (userResp.user?.email ?? "").toLowerCase();
      if (!email.includes("@")) return json({ error: "Target user has no email" }, 400);

      const redirectTo = `${appOrigin.replace(/\/$/, "")}/${schoolSlug}/auth`;
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: action === "generate_magic_link" ? "magiclink" : "recovery",
        email,
        options: { redirectTo },
      });
      if (linkErr) return json({ error: linkErr.message }, 400);

      const linkType = action === "generate_magic_link" ? "magiclink" : "recovery";
      await admin.from("audit_logs").insert({
        school_id: school.id,
        actor_user_id: actorUserId,
        action: linkType === "recovery" ? "password_reset_link_generated" : "magic_link_generated",
        entity_type: "user",
        entity_id: targetUserId,
        metadata: {
          targetEmail: email,
          redirectTo,
          reason: body.reason ?? null,
        },
      });

      return json({ ok: true, actionLink: linkData.properties?.action_link ?? null, linkType });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("eduverse-staff-governance error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
