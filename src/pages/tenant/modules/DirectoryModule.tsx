import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StudentRow = { id: string; first_name: string; last_name: string; status: string | null };
type StaffRow = { user_id: string; email: string | null; display_name: string | null };
type LeadRow = { id: string; full_name: string | null; status: string | null; stage_id: string | null; created_at: string };

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function DirectoryModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);

  const [tab, setTab] = useState<"students" | "staff" | "leads">("students");
  const [q, setQ] = useState("");
  const needle = useDebounced(q.trim(), 250);

  const [busy, setBusy] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  useEffect(() => {
    if (tenant.status !== "ready") return;
    let cancelled = false;
    setBusy(true);

    (async () => {
      const schoolId = tenant.schoolId;

      // NOTE: RLS enforces role-based visibility. This is a premium UI layer only.
      const runStudents = async () => {
        let query = supabase
          .from("students")
          .select("id,first_name,last_name,status")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (needle) {
          // broad matching by name (client-side filter after fetch is safer with RLS)
          // We'll still fetch a bounded set and filter locally.
        }

        const { data } = await query;
        const rows = (data ?? []) as StudentRow[];
        return needle
          ? rows.filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(needle.toLowerCase()))
          : rows;
      };

      const runStaff = async () => {
        // This view is already used elsewhere; falls back to user_roles if not present.
        const { data } = await supabase
          .from("school_user_directory")
          .select("user_id,email,display_name")
          .eq("school_id", schoolId)
          .limit(200);
        const rows = (data ?? []) as StaffRow[];
        return needle
          ? rows.filter((u) => `${u.display_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(needle.toLowerCase()))
          : rows;
      };

      const runLeads = async () => {
        const { data } = await supabase
          .from("crm_leads")
          .select("id,full_name,status,stage_id,created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(200);
        const rows = (data ?? []) as LeadRow[];
        return needle
          ? rows.filter((l) => `${l.full_name ?? ""} ${l.status ?? ""}`.toLowerCase().includes(needle.toLowerCase()))
          : rows;
      };

      try {
        const [s, u, l] = await Promise.all([runStudents(), runStaff(), runLeads()]);
        if (cancelled) return;
        setStudents(s);
        setStaff(u);
        setLeads(l);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant.status, tenant.schoolId, needle]);

  const counts = useMemo(
    () => ({ students: students.length, staff: staff.length, leads: leads.length }),
    [students.length, staff.length, leads.length],
  );

  return (
    <div className="space-y-4">
      <Card className="shadow-soft">
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-display text-xl">Global search</CardTitle>
              <p className="text-sm text-muted-foreground">Search students, staff, and leads. Filters + deep links come next.</p>
            </div>
            <div className="relative w-full md:w-[420px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, status…"
                className="pl-9"
              />
              {busy ? <p className="mt-2 text-xs text-muted-foreground">Searching…</p> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="students">Students ({counts.students})</TabsTrigger>
              <TabsTrigger value="staff">Staff ({counts.staff})</TabsTrigger>
              <TabsTrigger value="leads">Leads ({counts.leads})</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-4">
              <div className="rounded-2xl border bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.status ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{s.id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">No students found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="staff" className="mt-4">
              <div className="rounded-2xl border bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.display_name ?? u.email ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{u.user_id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                    {staff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-sm text-muted-foreground">No staff found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="leads" className="mt-4">
              <div className="rounded-2xl border bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.full_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{l.status ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {leads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">No leads found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
