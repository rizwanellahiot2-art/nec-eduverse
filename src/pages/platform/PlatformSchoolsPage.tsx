import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Search, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  school_id: string | null;
  actor_user_id: string | null;
};

export default function PlatformSchoolsPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  const [authz, setAuthz] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditSchoolId, setAuditSchoolId] = useState<string>("all");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAuthz("checking");
    setAuthzMessage(null);

    (async () => {
      const { data: psa, error: psaErr } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (psaErr) {
        setAuthz("denied");
        setAuthzMessage(psaErr.message);
        return;
      }
      if (!psa?.user_id) {
        setAuthz("denied");
        setAuthzMessage("Access denied. Platform Super Admin only.");
        return;
      }

      setAuthz("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = async () => {
    const { data: s, error: sErr } = await supabase
      .from("schools")
      .select("id,slug,name,is_active,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!sErr) setSchools((s ?? []) as SchoolRow[]);

    const { data: a, error: aErr } = await supabase
      .from("audit_logs")
      .select("id,created_at,action,entity_type,entity_id,school_id,actor_user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!aErr) setAudit((a ?? []) as AuditRow[]);
  };

  useEffect(() => {
    if (authz !== "ok") return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authz]);

  const filteredSchools = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(needle));
  }, [q, schools]);

  const schoolsById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);

  const filteredAudit = useMemo(() => {
    if (auditSchoolId === "all") return audit;
    return audit.filter((a) => a.school_id === auditSchoolId);
  }, [audit, auditSchoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">Platform</CardTitle>
            <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> All Schools & Audit Logs
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </CardContent>
        </Card>

        {authz !== "ok" && (
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl">Access</CardTitle>
              <p className="text-sm text-muted-foreground">Platform Super Admin only</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
                {authz === "checking" ? "Verifying access…" : authzMessage ?? "Access denied."}
              </div>
            </CardContent>
          </Card>
        )}

        {authz === "ok" && (
          <>
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="font-display text-xl">All Schools</CardTitle>
                <p className="text-sm text-muted-foreground">Search schools and jump into any tenant workspace.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="relative md:max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug" />
                  </div>
                  <Button variant="soft" onClick={refresh}>
                    Refresh
                  </Button>
                </div>

                <div className="overflow-auto rounded-2xl border bg-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchools.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>/{s.slug}</TableCell>
                          <TableCell>{s.is_active ? "Active" : "Disabled"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="hero" size="sm" asChild>
                              <a href={`/${s.slug}/super_admin/schools`}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Open
                              </a>
                            </Button>
                            <Button variant="soft" size="sm" className="ml-2" asChild>
                              <a href={`/${s.slug}/auth`}>
                                <ExternalLink className="mr-2 h-4 w-4" /> Tenant login
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSchools.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            No schools found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="font-display text-xl">Audit Logs</CardTitle>
                <p className="text-sm text-muted-foreground">Recent activity across the platform.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={auditSchoolId} onValueChange={setAuditSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All schools</SelectItem>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="overflow-auto rounded-2xl border bg-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit.map((a) => {
                        const s = a.school_id ? schoolsById.get(a.school_id) : null;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {new Date(a.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">{s ? s.slug : "—"}</TableCell>
                            <TableCell className="font-medium">{a.action}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(a.entity_type ?? "—") + (a.entity_id ? `:${a.entity_id}` : "")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredAudit.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            No audit logs.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
