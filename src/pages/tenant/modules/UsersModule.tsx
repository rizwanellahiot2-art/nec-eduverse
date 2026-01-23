import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, Download, FileUp, KeyRound, Link2, UserMinus, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { EDUVERSE_ROLES, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import { parseCsv, toCsv } from "@/lib/csv";
import { useSchoolPermissions } from "@/hooks/useSchoolPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type DirectoryRow = {
  user_id: string;
  email: string;
  display_name: string | null;
};

type BulkRow = {
  rowNumber: number; // CSV line number
  email: string;
  roles: string[];
  displayName?: string;
  phone?: string;
};

type BulkResult = {
  rowNumber: number;
  email: string;
  ok: boolean;
  errors: string[];
  normalizedRoles: string[];
  userId?: string;
  actionLink?: string;
};

export function UsersModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();

  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const perms = useSchoolPermissions(schoolId);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<EduverseRole>("teacher");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkLinksCsv, setBulkLinksCsv] = useState<string | null>(null);

  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, EduverseRole[]>>({});

  const [govRoleByUser, setGovRoleByUser] = useState<Record<string, EduverseRole>>({});
  const [govReason, setGovReason] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<{ userId: string; type: "recovery" | "magiclink"; link: string } | null>(null);

  const refresh = async () => {
    if (!schoolId) return;

    const { data: dir } = await supabase
      .from("school_user_directory")
      .select("user_id,email,display_name")
      .eq("school_id", schoolId)
      .order("email", { ascending: true });
    setDirectory((dir ?? []) as DirectoryRow[]);

    const { data: ur } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .eq("school_id", schoolId);
    const next: Record<string, EduverseRole[]> = {};
    (ur ?? []).forEach((r) => {
      const key = (r as any).user_id as string;
      const val = (r as any).role as EduverseRole;
      next[key] = next[key] ? [...next[key], val] : [val];
    });
    setRolesByUser(next);

    setGovRoleByUser((prev) => {
      const copy = { ...prev };
      (dir ?? []).forEach((row) => {
        const id = (row as any).user_id as string;
        const existing = copy[id];
        const currentRoles = next[id] ?? [];
        if (!existing) {
          copy[id] = (currentRoles[0] ?? "teacher") as EduverseRole;
        }
      });
      return copy;
    });
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const allowedRoles = useMemo((): EduverseRole[] => {
    // Teachers can only create students/parents.
    // Principals/VP (staff managers) can create staff.
    // Platform super admin can create anything except super_admin (reserved).
    const base = EDUVERSE_ROLES.filter((r): r is EduverseRole => r !== "super_admin");
    if (perms.isPlatformSuperAdmin) return base;
    if (perms.canManageStaff) return base;
    return base.filter((r) => r === "student" || r === "parent");
  }, [perms.canManageStaff, perms.isPlatformSuperAdmin]);

  const invite = async () => {
    if (!tenant.slug) return;
    if (!email.trim()) return toast.error("Email is required");

    if (!allowedRoles.includes(role)) {
      return toast.error(
        "Not allowed: principals/VP create staff; teachers can create students/parents.",
      );
    }

    setBusy(true);
    setInviteLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("eduverse-invite", {
        body: {
          schoolSlug: tenant.slug,
          email: email.trim().toLowerCase(),
          role,
          displayName: displayName.trim() || undefined,
          appOrigin: window.location.origin,
        },
      });
      if (error) {
        // supabase-js often collapses non-2xx into a generic message; try to surface function JSON error.
        const raw = (error as any)?.context?.body;
        let detail: string | null = null;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            detail = parsed?.error ? String(parsed.error) : null;
          } catch {
            detail = null;
          }
        }
        return toast.error(detail ?? error.message);
      }

      setInviteLink((data as any)?.actionLink ?? null);

      if (schoolId && user?.id) {
        await supabase.from("audit_logs").insert({
          school_id: schoolId,
          actor_user_id: user.id,
          action: "user_invited",
          entity_type: "user",
          entity_id: email.trim().toLowerCase(),
          metadata: { role },
        });
      }

      toast.success("User created and role assigned");
      setEmail("");
      setDisplayName("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const canGovernStaff = perms.isPlatformSuperAdmin || perms.canManageStaff;

  const governanceInvoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("eduverse-staff-governance", { body });
    if (error) {
      const raw = (error as any)?.context?.body;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          throw new Error(parsed?.error ? String(parsed.error) : error.message);
        } catch {
          throw new Error(error.message);
        }
      }
      throw new Error(error.message);
    }
    return data as any;
  };

  const bulkInvoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("eduverse-bulk-staff-import", { body });
    if (error) {
      const raw = (error as any)?.context?.body;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          throw new Error(parsed?.error ? String(parsed.error) : error.message);
        } catch {
          throw new Error(error.message);
        }
      }
      throw new Error(error.message);
    }
    return data as any;
  };

  const downloadTextFile = (filename: string, contents: string, mime = "text/plain") => {
    const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseBulkCsvFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) return [] as BulkRow[];

    const rows: BulkRow[] = parsed.map((r, idx) => {
      const email = (r["email"] ?? "").trim().toLowerCase();
      const roleCell = (r["role"] ?? r["roles"] ?? "").trim();
      const roles = roleCell
        .split(/[;,]/)
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      const displayName = (r["display_name"] ?? r["displayname"] ?? r["name"] ?? "").trim();
      const phone = (r["phone"] ?? r["mobile"] ?? "").trim();

      return {
        rowNumber: idx + 2,
        email,
        roles,
        displayName: displayName || undefined,
        phone: phone || undefined,
      };
    });

    return rows;
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Staff & Users</CardTitle>
          <p className="text-sm text-muted-foreground">Admin-created accounts only • No self-registration</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!perms.loading && !perms.isPlatformSuperAdmin && !perms.canManageStaff && (
            <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              Limited access: you can only create <span className="font-medium">students</span> and <span className="font-medium">parents</span>.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@school.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as EduverseRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="hero" size="xl" onClick={invite} disabled={busy} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" /> Create user + generate invite
          </Button>

          {inviteLink && (
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-sm font-medium text-accent-foreground">Invite link (password set)</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{inviteLink}</p>
              <div className="mt-3">
                <Button
                  variant="soft"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </Button>
              </div>
            </div>
          )}

          {canGovernStaff && (
            <div className="rounded-3xl border bg-surface p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold tracking-tight">Bulk staff import (CSV)</p>
                  <p className="text-sm text-muted-foreground">
                    Dry-run validates everything first. Commit creates/attaches users and replaces roles.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const sample = toCsv([
                        {
                          email: "teacher1@school.com",
                          role: "teacher",
                          display_name: "Teacher One",
                          phone: "+1 555 000 0000",
                        },
                        {
                          email: "vp@school.com",
                          role: "vice_principal;academic_coordinator",
                          display_name: "VP",
                          phone: "",
                        },
                      ]);
                      downloadTextFile("staff-import-template.csv", sample, "text/csv");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Template
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CSV file</label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      setBulkLinksCsv(null);
                      setBulkResults(null);
                      if (!file) {
                        setBulkRows([]);
                        return;
                      }
                      try {
                        const rows = await parseBulkCsvFile(file);
                        setBulkRows(rows);
                        toast.success(`Loaded ${rows.length} rows`);
                      } catch (err) {
                        setBulkRows([]);
                        toast.error((err as Error).message);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Columns: <span className="font-medium">email</span>, <span className="font-medium">role</span>
                    (multi-role via <span className="font-medium">; or ,</span>), optional <span className="font-medium">display_name</span>, <span className="font-medium">phone</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Audit reason (optional)</label>
                  <Input value={govReason} onChange={(e) => setGovReason(e.target.value)} placeholder="e.g. Onboarding batch Jan 2026" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  disabled={busy || bulkRows.length === 0 || !tenant.slug}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      setBulkLinksCsv(null);
                      const res = await bulkInvoke({
                        mode: "dry_run",
                        schoolSlug: tenant.slug,
                        rows: bulkRows,
                        appOrigin: window.location.origin,
                        reason: govReason.trim() || undefined,
                      });
                      setBulkResults((res?.results ?? []) as BulkResult[]);
                      const ok = !!res?.ok;
                      toast[ok ? "success" : "error"](ok ? "Dry-run OK" : "Dry-run has errors");
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <FileUp className="mr-2 h-4 w-4" /> Dry-run validate
                </Button>

                <Button
                  variant="hero"
                  disabled={
                    busy ||
                    bulkRows.length === 0 ||
                    !bulkResults ||
                    bulkResults.some((r) => !r.ok) ||
                    !tenant.slug
                  }
                  onClick={async () => {
                    try {
                      setBusy(true);
                      const res = await bulkInvoke({
                        mode: "commit",
                        schoolSlug: tenant.slug,
                        rows: bulkRows,
                        appOrigin: window.location.origin,
                        reason: govReason.trim() || undefined,
                      });
                      const results = (res?.results ?? []) as BulkResult[];
                      setBulkResults(results);
                      const links = results
                        .map((r) => ({
                          row: String(r.rowNumber),
                          email: r.email,
                          roles: (r.normalizedRoles ?? []).join(";"),
                          password_set_link: r.actionLink ?? "",
                        }))
                        .filter((r) => r.email);
                      const csv = toCsv(links);
                      setBulkLinksCsv(csv);
                      toast.success("Import committed");
                      await refresh();
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Commit import
                </Button>

                {bulkLinksCsv && (
                  <Button
                    variant="outline"
                    onClick={() => downloadTextFile(`staff-import-links-${tenant.slug}.csv`, bulkLinksCsv, "text/csv")}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download links CSV
                  </Button>
                )}
              </div>

              {bulkResults && (
                <div className="mt-4 overflow-auto rounded-2xl border bg-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.slice(0, 200).map((r) => (
                        <TableRow key={`${r.rowNumber}-${r.email}`}>
                          <TableCell>{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.email}</TableCell>
                          <TableCell>{(r.normalizedRoles ?? []).map((x) => roleLabel[x as EduverseRole] ?? x).join(", ")}</TableCell>
                          <TableCell>{r.ok ? "OK" : "ERROR"}</TableCell>
                          <TableCell className="text-muted-foreground">{(r.errors ?? []).join(" • ") || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {bulkResults.length > 200 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-muted-foreground">
                            Showing first 200 rows.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Directory</CardTitle>
          <p className="text-sm text-muted-foreground">Visible to staff managers</p>
        </CardHeader>
        <CardContent>
          {canGovernStaff && (
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audit reason (optional)</label>
                  <Input
                    value={govReason}
                    onChange={(e) => setGovReason(e.target.value)}
                    placeholder="e.g. Staff left the school / role change approved"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated link</label>
                  <Input value={generatedLink ? `${generatedLink.type}: ${generatedLink.link}` : "—"} disabled />
                </div>
              </div>

              {generatedLink && (
                <div className="rounded-2xl bg-accent p-4">
                  <p className="text-sm font-medium text-accent-foreground">
                    {generatedLink.type === "recovery" ? "Password reset link" : "One-time magic link"}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{generatedLink.link}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="soft"
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedLink.link);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy link
                    </Button>
                    <Button variant="outline" onClick={() => setGeneratedLink(null)}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="overflow-auto rounded-2xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
                  {canGovernStaff && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>{r.display_name ?? "—"}</TableCell>
                    <TableCell>
                      {(rolesByUser[r.user_id] ?? []).map((x) => roleLabel[x]).join(", ") || "—"}
                    </TableCell>
                    {canGovernStaff && (
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                          <Select
                            value={govRoleByUser[r.user_id] ?? "teacher"}
                            onValueChange={(v) =>
                              setGovRoleByUser((s) => ({ ...s, [r.user_id]: v as EduverseRole }))
                            }
                          >
                            <SelectTrigger className="h-9 w-[180px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedRoles.map((x) => (
                                <SelectItem key={x} value={x}>
                                  {roleLabel[x]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="soft"
                            size="sm"
                            onClick={async () => {
                              try {
                                setBusy(true);
                                await governanceInvoke({
                                  action: "set_roles",
                                  schoolSlug: tenant.slug,
                                  targetUserId: r.user_id,
                                  roles: [govRoleByUser[r.user_id] ?? "teacher"],
                                  reason: govReason.trim() || undefined,
                                });
                                toast.success("Role updated");
                                await refresh();
                              } catch (e) {
                                toast.error((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy}
                          >
                            <UserPlus className="mr-2 h-4 w-4" /> Set role
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setBusy(true);
                                await governanceInvoke({
                                  action: "deactivate",
                                  schoolSlug: tenant.slug,
                                  targetUserId: r.user_id,
                                  reason: govReason.trim() || undefined,
                                });
                                toast.success("User deactivated (roles removed)");
                                await refresh();
                              } catch (e) {
                                toast.error((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy}
                          >
                            <UserMinus className="mr-2 h-4 w-4" /> Deactivate
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setBusy(true);
                                const res = await governanceInvoke({
                                  action: "generate_recovery_link",
                                  schoolSlug: tenant.slug,
                                  targetUserId: r.user_id,
                                  appOrigin: window.location.origin,
                                  reason: govReason.trim() || undefined,
                                });
                                const link = String(res?.actionLink ?? "");
                                if (!link) throw new Error("No link returned");
                                setGeneratedLink({ userId: r.user_id, type: "recovery", link });
                                toast.success("Reset link generated");
                              } catch (e) {
                                toast.error((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy}
                          >
                            <KeyRound className="mr-2 h-4 w-4" /> Reset link
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setBusy(true);
                                const res = await governanceInvoke({
                                  action: "generate_magic_link",
                                  schoolSlug: tenant.slug,
                                  targetUserId: r.user_id,
                                  appOrigin: window.location.origin,
                                  reason: govReason.trim() || undefined,
                                });
                                const link = String(res?.actionLink ?? "");
                                if (!link) throw new Error("No link returned");
                                setGeneratedLink({ userId: r.user_id, type: "magiclink", link });
                                toast.success("Magic link generated");
                              } catch (e) {
                                toast.error((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy}
                          >
                            <Link2 className="mr-2 h-4 w-4" /> Magic link
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {directory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canGovernStaff ? 4 : 3} className="text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
