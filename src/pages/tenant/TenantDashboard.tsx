import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BarChart3, LogOut, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { isEduverseRole, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import { TenantShell } from "@/components/tenant/TenantShell";
import { Button } from "@/components/ui/button";

const TenantDashboard = () => {
  const { schoolSlug, role: roleParam } = useParams();
  const role = (isEduverseRole(roleParam) ? roleParam : null) as EduverseRole | null;
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tenant.status === "ready" && role) return `${tenant.school.name} • ${roleLabel[role]}`;
    if (tenant.status === "ready") return tenant.school.name;
    return "EDUVERSE";
  }, [tenant.status, tenant.school, role]);

  useEffect(() => {
    if (!role) return;
    if (tenant.status !== "ready") return;
    if (!user) return;

    let cancelled = false;
    setAuthzState("checking");
    setAuthzMessage(null);

    (async () => {
      const { data: membership, error: memErr } = await supabase
        .from("school_memberships")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (memErr) {
        setAuthzState("denied");
        setAuthzMessage(memErr.message);
        return;
      }
      if (!membership) {
        setAuthzState("denied");
        setAuthzMessage("You are not a member of this school.");
        return;
      }

      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .eq("role", role)
        .maybeSingle();

      if (cancelled) return;
      if (roleErr) {
        setAuthzState("denied");
        setAuthzMessage(roleErr.message);
        return;
      }
      if (!roleRow) {
        setAuthzState("denied");
        setAuthzMessage(`You do not have the ${roleLabel[role]} role in this school.`);
        return;
      }

      setAuthzState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [role, tenant.status, tenant.schoolId, user]);

  if (!role) return <Navigate to={`/${tenant.slug || ""}/auth`} replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  return (
    <TenantShell title={title} subtitle="Role-isolated workspace" role={role} schoolSlug={tenant.slug}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {["Revenue", "Admissions", "Attendance"].map((kpi) => (
            <div key={kpi} className="rounded-3xl bg-surface p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{kpi}</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight">—</p>
              <p className="mt-1 text-xs text-muted-foreground">Connect module data to activate KPIs.</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">Workspace</p>
              <p className="text-sm text-muted-foreground">You are signed in as {user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="soft"
                onClick={() => navigate(`/${tenant.slug}/auth`)}
                className="justify-start"
              >
                <UserRound className="mr-2 h-4 w-4" /> Switch role
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(`/${tenant.slug}/auth`);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>

          {authzState !== "ok" && (
            <div className="mt-5 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              <p className="font-medium">Access check</p>
              <p className="mt-1">
                {authzState === "checking" ? "Verifying membership and role…" : authzMessage ?? "Access denied."}
              </p>
              {authzState === "denied" && (
                <div className="mt-3">
                  <Button
                    variant="hero"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate(`/${tenant.slug}/auth`);
                    }}
                  >
                    Return to login
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TenantShell>
  );
};

export default TenantDashboard;
