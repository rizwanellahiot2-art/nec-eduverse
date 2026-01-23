import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { EDUVERSE_ROLES, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
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

export function UsersModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();

  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<EduverseRole>("teacher");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, EduverseRole[]>>({});

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
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const invite = async () => {
    if (!tenant.slug) return;
    if (!email.trim()) return toast.error("Email is required");

    setBusy(true);
    setInviteLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("eduverse-invite", {
        body: {
          schoolSlug: tenant.slug,
          email: email.trim().toLowerCase(),
          role,
          displayName: displayName.trim() || undefined,
        },
      });
      if (error) return toast.error(error.message);

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

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Staff & Users</CardTitle>
          <p className="text-sm text-muted-foreground">Admin-created accounts only • No self-registration</p>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  {EDUVERSE_ROLES.filter((r) => r !== "super_admin").map((r) => (
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
        </CardContent>
      </Card>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Directory</CardTitle>
          <p className="text-sm text-muted-foreground">Visible to staff managers</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-2xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
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
                  </TableRow>
                ))}
                {directory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
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
