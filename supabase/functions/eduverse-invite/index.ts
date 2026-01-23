// EDUVERSE Invite — admin creates users (no public signup)
// Requires JWT (verify_jwt=true); also checks caller has staff-management privileges.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteRequest = {
  schoolSlug: string;
  email: string;
  // Needed for auth admin.generateLink redirectTo (must be an allowed URL)
  // Example: https://your-app-domain.com
  appOrigin?: string;
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
  displayName?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) + "Aa1!";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!anon) return json({ error: "Missing SUPABASE_ANON_KEY" }, 500);

    // user-scoped client (to identify caller)
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims();
    const actorUserId = claimsData?.claims?.sub;
    if (claimsErr || !actorUserId) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as InviteRequest;
    const schoolSlug = body.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!schoolSlug) return json({ error: "Invalid schoolSlug" }, 400);

    // admin client
    const admin = createClient(supabaseUrl, serviceRole);

    // Resolve school
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id,slug,name")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (schoolErr || !school) return json({ error: schoolErr?.message ?? "School not found" }, 400);

    // Platform Super Admins can invite for ANY school
    const { data: psaRows, error: psaErr } = await admin
      .from("platform_super_admins")
      .select("user_id")
      .eq("user_id", actorUserId)
      .limit(1);
    if (psaErr) return json({ error: psaErr.message }, 400);
    const isPlatformSuperAdmin = !!(psaRows && psaRows.length > 0);

    if (!isPlatformSuperAdmin) {
      const { data: roleRow, error: roleCheckErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("school_id", school.id)
        .eq("user_id", actorUserId)
        .in("role", ["super_admin", "school_owner", "principal", "vice_principal"])
        .limit(1);
      if (roleCheckErr) return json({ error: roleCheckErr.message }, 400);
      if (!roleRow || roleRow.length === 0) return json({ error: "Forbidden" }, 403);
    }

    const inviteEmail = body.email.trim().toLowerCase();
    if (!inviteEmail.includes("@")) return json({ error: "Invalid email" }, 400);

    // Create user (idempotent-ish): if exists, reuse
    const { data: existing, error: findErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (findErr) console.log("listUsers err:", findErr.message);
    const existingUser = existing?.users?.find((u) => u.email?.toLowerCase() === inviteEmail);

    const userId = existingUser?.id ?? (
      (await admin.auth.admin.createUser({
        email: inviteEmail,
        password: randomPassword(),
        email_confirm: true,
      }))
        .data.user?.id
    );

    if (!userId) return json({ error: "Failed to create user" }, 500);

    // Attach membership + role
    const { error: memErr } = await admin
      .from("school_memberships")
      .upsert({ school_id: school.id, user_id: userId, status: "active", created_by: actorUserId }, { onConflict: "school_id,user_id" });
    if (memErr) return json({ error: memErr.message }, 400);

    const { error: assignErr } = await admin
      .from("user_roles")
      .upsert({ school_id: school.id, user_id: userId, role: body.role, created_by: actorUserId }, { onConflict: "school_id,user_id,role" });
    if (assignErr) return json({ error: assignErr.message }, 400);

    // Directory for UI
    await admin
      .from("school_user_directory")
      .upsert(
        {
          school_id: school.id,
          user_id: userId,
          email: inviteEmail,
          display_name: body.displayName ?? null,
        },
        { onConflict: "school_id,user_id" },
      );

    // Create password-set (recovery) link that admin can deliver via email/WhatsApp
    // IMPORTANT: the URL origin for edge functions is NOT the app origin.
    // The redirectTo must be a valid, allowlisted app URL.
    const rawOrigin = (body.appOrigin ?? req.headers.get("origin") ?? "").trim();
    let appOrigin: string;
    try {
      appOrigin = new URL(rawOrigin).origin;
    } catch {
      return json({ error: "Invalid appOrigin. Pass window.location.origin from the client." }, 400);
    }
    const redirectTo = `${appOrigin.replace(/\/$/, "")}/${school.slug}/auth`;
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: inviteEmail,
      options: { redirectTo },
    });
    if (linkErr) return json({ error: linkErr.message }, 400);

    // Note: email delivery integration is added next; for now we return the link to copy.
    return json({
      ok: true,
      userId,
      actionLink: linkData.properties?.action_link,
      message: "User created and attached to school. Deliver the actionLink to let them set a password.",
    });
  } catch (e) {
    console.error("eduverse-invite error:", e);
    const err = e as { message?: string };
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
});
