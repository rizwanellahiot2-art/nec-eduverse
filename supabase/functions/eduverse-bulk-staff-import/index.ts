// EDUVERSE Bulk Staff Import
// CSV is parsed client-side; this function validates (dry-run) or commits.
// - Creates users if missing
// - Upserts school membership
// - Replaces roles (delete then insert)
// - Sets explicit passwords per row (no recovery/magic links)
// - Writes audit logs

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set([
  "school_owner",
  "principal",
  "vice_principal",
  "academic_coordinator",
  "teacher",
  "accountant",
  "hr_manager",
  "counselor",
  "student",
  "parent",
  "marketing_staff",
]);

type RowInput = {
  email: string;
  roles: string[];
  password: string;
  displayName?: string;
  phone?: string;
};

type RequestBody = {
  mode: "dry_run" | "commit";
  schoolSlug: string;
  rows: RowInput[];
  reason?: string;
};

type RowResult = {
  rowNumber: number;
  email: string;
  ok: boolean;
  errors: string[];
  normalizedRoles: string[];
  userId?: string;
};

const makeTraceId = () => crypto.randomUUID();

const json = (data: unknown, status = 200, traceId?: string) =>
  new Response(JSON.stringify({ traceId, ...((data ?? {}) as any) }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const normalizeSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

// NOTE: passwords are now provided explicitly per-row (no recovery/magic links).

async function listUsersByEmail(admin: any, emails: string[]) {
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const found = new Map<string, { id: string; email: string }>();

  // List users in pages until we've found everything, or hit a safety cap.
  // This is acceptable for admin operations where batch sizes are small.
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const u of users) {
      const em = (u.email ?? "").toLowerCase();
      if (wanted.has(em)) found.set(em, { id: u.id, email: u.email! });
    }
    if (found.size >= wanted.size) break;
    if (users.length < perPage) break;
  }
  return found;
}

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

    const body = (await req.json()) as RequestBody;
    if (body.mode !== "dry_run" && body.mode !== "commit") return json({ ok: false, error: "Invalid mode" }, 400, traceId);

    const schoolSlug = normalizeSlug(body.schoolSlug ?? "");
    if (!schoolSlug) return json({ ok: false, error: "Invalid schoolSlug" }, 400, traceId);

    if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ ok: false, error: "rows is required" }, 400, traceId);
    if (body.rows.length > 500) return json({ ok: false, error: "Too many rows (max 500)" }, 400, traceId);

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id,slug")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (schoolErr || !school) return json({ ok: false, error: schoolErr?.message ?? "School not found" }, 400, traceId);

    // Permission check: platform super admin OR governance roles
    const { data: psa, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (psaErr) return json({ ok: false, error: psaErr.message }, 400, traceId);
    const isPlatformSuperAdmin = !!psa?.user_id;
    if (!isPlatformSuperAdmin) {
      const { data: roleRows, error: roleErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("school_id", school.id)
        .eq("user_id", actorUserId)
        .in("role", ["super_admin", "school_owner", "principal", "vice_principal", "hr_manager"])
        .limit(1);
      if (roleErr) return json({ ok: false, error: roleErr.message }, 400, traceId);
      if (!roleRows || roleRows.length === 0) return json({ ok: false, error: "Forbidden" }, 403, traceId);
    }

    const results: RowResult[] = body.rows.map((r, idx) => {
      const rowNumber = idx + 2; // header is line 1
      const email = String(r.email ?? "").trim().toLowerCase();
      const password = String((r as any).password ?? "");
      const roles = Array.isArray(r.roles) ? r.roles.map((x) => String(x).trim().toLowerCase()).filter(Boolean) : [];
      const displayName = (r.displayName ?? "").toString().trim();
      const phone = (r.phone ?? "").toString().trim();

      const errors: string[] = [];
      if (!email || !email.includes("@")) errors.push("Invalid email");
      if (!password || password.length < 8) errors.push("Password must be at least 8 characters");
      if (roles.length === 0) errors.push("Missing role(s)");
      const normalizedRoles = Array.from(new Set(roles));
      for (const role of normalizedRoles) {
        if (!ALLOWED_ROLES.has(role)) errors.push(`Invalid role: ${role}`);
      }
      if (displayName.length > 120) errors.push("display_name too long (max 120)");
      if (phone.length > 50) errors.push("phone too long (max 50)");

      return { rowNumber, email, ok: errors.length === 0, errors, normalizedRoles };
    });

    const invalid = results.filter((r) => !r.ok);
    if (body.mode === "dry_run") {
      return json({ ok: invalid.length === 0, mode: "dry_run", results }, 200, traceId);
    }

    if (invalid.length > 0) {
      return json({ ok: false, error: "Fix validation errors before committing", mode: "commit", results }, 400, traceId);
    }

    // Commit
    const emails = results.map((r) => r.email);
    const existingByEmail = await listUsersByEmail(admin, emails);

    let createdCount = 0;
    let processedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      processedCount++;
      let userId: string | null = existingByEmail.get(r.email)?.id ?? null;
      const password = String((body.rows[i] as any)?.password ?? "");

      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: r.email,
          password,
          email_confirm: true,
        });
        if (createErr) {
          // Best effort fallback: refresh list and retry lookup
          const refreshed = await listUsersByEmail(admin, [r.email]);
          userId = refreshed.get(r.email)?.id ?? null;
          if (!userId) {
            r.ok = false;
            r.errors = [createErr.message];
            continue;
          }
        } else {
          userId = created.user?.id ?? null;
        }
        if (userId) createdCount++;
      }

      if (userId) {
        // Always set/reset password explicitly from the import row.
        const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
        if (updErr) {
          r.ok = false;
          r.errors = [updErr.message];
          continue;
        }
      }

      if (!userId) {
        r.ok = false;
        r.errors = ["Failed to resolve userId"]; 
        continue;
      }
      r.userId = userId;

      // Membership
      const { error: memErr } = await admin
        .from("school_memberships")
        .upsert(
          { school_id: school.id, user_id: userId, status: "active", created_by: actorUserId },
          { onConflict: "school_id,user_id" },
        );
      if (memErr) {
        r.ok = false;
        r.errors = [memErr.message];
        continue;
      }

      // Replace roles (delete then insert)
      const { error: delErr } = await admin.from("user_roles").delete().eq("school_id", school.id).eq("user_id", userId);
      if (delErr) {
        r.ok = false;
        r.errors = [delErr.message];
        continue;
      }

      const roleRows = r.normalizedRoles.map((role) => ({
        school_id: school.id,
        user_id: userId,
        role,
        created_by: actorUserId,
      }));
      const { error: insErr } = await admin.from("user_roles").insert(roleRows);
      if (insErr) {
        r.ok = false;
        r.errors = [insErr.message];
        continue;
      }

      // Directory
      const displayName = (body.rows[i]?.displayName ?? "").toString().trim() || null;
      const { error: dirErr } = await admin
        .from("school_user_directory")
        .upsert(
          { school_id: school.id, user_id: userId, email: r.email, display_name: displayName },
          { onConflict: "school_id,user_id" },
        );
      if (dirErr) {
        r.ok = false;
        r.errors = [dirErr.message];
        continue;
      }

      await admin.from("audit_logs").insert({
        school_id: school.id,
        actor_user_id: actorUserId,
        action: "bulk_staff_import_row",
        entity_type: "user",
        entity_id: userId,
        metadata: {
          email: r.email,
          roles: r.normalizedRoles,
          reason: body.reason ?? null,
        },
      });
    }

    await admin.from("audit_logs").insert({
      school_id: school.id,
      actor_user_id: actorUserId,
      action: "bulk_staff_import_commit",
      entity_type: "school",
      entity_id: schoolSlug,
      metadata: {
        totalRows: results.length,
        createdCount,
        processedCount,
        okCount: results.filter((x) => x.ok).length,
        errorCount: results.filter((x) => !x.ok).length,
        reason: body.reason ?? null,
      },
    });

    return json({ ok: results.every((x) => x.ok), mode: "commit", results }, 200, traceId);
  } catch (e) {
    console.error("eduverse-bulk-staff-import error:", e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500, makeTraceId());
  }
});
