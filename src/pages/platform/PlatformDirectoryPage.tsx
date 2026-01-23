import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Search, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { usePlatformSuperAdmin } from "@/hooks/usePlatformSuperAdmin";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SchoolRow = { id: string; slug: string; name: string; is_active: boolean; created_at: string };
type StudentRow = { id: string; school_id: string; first_name: string; last_name: string | null; status: string; created_at: string };
type LeadRow = { id: string; school_id: string; full_name: string; email: string | null; phone: string | null; status: string; created_at: string };
type DirRow = { id: string; school_id: string; email: string; display_name: string | null; user_id: string; created_at: string };

export default function PlatformDirectoryPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const authz = usePlatformSuperAdmin(user?.id);

  const [tab, setTab] = useState<"schools" | "users" | "students" | "leads">("schools");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [users, setUsers] = useState<DirRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const needle = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const runSearch = async () => {
    if (!user || !authz.allowed) return;
    setBusy(true);
    try {
      if (tab === "schools") {
        const query = supabase
          .from("schools")
          .select("id,slug,name,is_active,created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        const { data } = needle
          ? await query.or(`name.ilike.%${needle}%,slug.ilike.%${needle}%`)
          : await query;
        setSchools((data ?? []) as SchoolRow[]);
      }

      if (tab === "users") {
        const query = supabase
          .from("school_user_directory")
          .select("id,school_id,email,display_name,user_id,created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        const { data } = needle
          ? await query.or(`email.ilike.%${needle}%,display_name.ilike.%${needle}%`)
          : await query;
        setUsers((data ?? []) as DirRow[]);
      }

      if (tab === "students") {
        const query = supabase
          .from("students")
          .select("id,school_id,first_name,last_name,status,created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        const { data } = needle
          ? await query.or(`first_name.ilike.%${needle}%,last_name.ilike.%${needle}%,status.ilike.%${needle}%`)
          : await query;
        setStudents((data ?? []) as StudentRow[]);
      }

      if (tab === "leads") {
        const query = supabase
          .from("crm_leads")
          .select("id,school_id,full_name,email,phone,status,created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        const { data } = needle
          ? await query.or(`full_name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%,status.ilike.%${needle}%`)
          : await query;
        setLeads((data ?? []) as LeadRow[]);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (authz.loading) return;
    if (!authz.allowed) return;
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authz.loading, authz.allowed, user?.id]);

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
            <CardTitle className="font-display text-xl">Global Directory</CardTitle>
            <p className="text-sm text-muted-foreground">Search across schools, users, students, and leads.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Platform Super Admin
            </div>
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => navigate("/platform")}>
                Back to dashboard
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {!authz.loading && !authz.allowed && (
          <Card className="shadow-elevated">
            <CardContent className="pt-6">
              <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">{authz.message ?? "Access denied."}</div>
            </CardContent>
          </Card>
        )}

        {authz.allowed && (
          <Card className="shadow-elevated">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative md:max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
                </div>
                <Button variant="hero" disabled={busy} onClick={runSearch}>
                  Run search
                </Button>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="schools" className="flex-1">
                    Schools
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex-1">
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="students" className="flex-1">
                    Students
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex-1">
                    Leads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schools" className="mt-4">
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
                        {schools.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>/{s.slug}</TableCell>
                            <TableCell>{s.is_active ? "Active" : "Disabled"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="hero" size="sm" asChild>
                                <a href={`/${s.slug}/super_admin`}>
                                  <ExternalLink className="mr-2 h-4 w-4" /> Open
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {schools.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-muted-foreground">
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-4">
                  <div className="overflow-auto rounded-2xl border bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>School</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground">{u.display_name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{u.school_id}</TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-muted-foreground">
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="students" className="mt-4">
                  <div className="overflow-auto rounded-2xl border bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>School</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.first_name} {s.last_name ?? ""}</TableCell>
                            <TableCell className="text-muted-foreground">{s.status}</TableCell>
                            <TableCell className="text-muted-foreground">{s.school_id}</TableCell>
                          </TableRow>
                        ))}
                        {students.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-muted-foreground">
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="leads" className="mt-4">
                  <div className="overflow-auto rounded-2xl border bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>School</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{l.email ?? l.phone ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{l.status}</TableCell>
                            <TableCell className="text-muted-foreground">{l.school_id}</TableCell>
                          </TableRow>
                        ))}
                        {leads.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-muted-foreground">
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
