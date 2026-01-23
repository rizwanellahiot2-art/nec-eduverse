import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { Building2, KeyRound, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSchoolPermissions } from "@/hooks/useSchoolPermissions";
import { EDUVERSE_ROLES, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

const roleToPathSegment = (role: EduverseRole) => {
  // Friendly URLs for some roles that have dedicated dashboards.
  if (role === "hr_manager") return "hr";
  if (role === "marketing_staff") return "marketing";
  if (role === "student") return "student";
  if (role === "parent") return "parent";
  return role;
};

const TenantAuth = () => {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const perms = useSchoolPermissions(tenant.status === "ready" ? tenant.schoolId : null);

  const [role, setRole] = useState<EduverseRole>("principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tenant.status === "ready") return tenant.school.name;
    return "EDUVERSE";
  }, [tenant.status, tenant.school]);

  const doPasswordLogin = async () => {
    setMessage(null);
    const parsedEmail = emailSchema.safeParse(email.trim());
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedEmail.success) return setMessage("Please enter a valid email.");
    if (!parsedPassword.success) return setMessage("Password must be at least 8 characters.");

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password,
      });
      if (error) return setMessage(error.message);
      navigate(`/${tenant.slug}/${roleToPathSegment(role)}`);
    } finally {
      setBusy(false);
    }
  };

  const doMagicLink = async () => {
    setMessage(null);
    const parsedEmail = emailSchema.safeParse(email.trim());
    if (!parsedEmail.success) return setMessage("Please enter a valid email.");

    setBusy(true);
    try {
      const redirectUrl = `${window.location.origin}/${tenant.slug}/${roleToPathSegment(role)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: parsedEmail.data,
        options: {
          emailRedirectTo: redirectUrl,
          // critical: no self-registration
          shouldCreateUser: false,
        },
      });
      if (error) return setMessage(error.message);
      setMessage("Check your email for the sign-in link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-grid px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface shadow-elevated">
            <Building2 />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
            <p className="text-sm text-muted-foreground">Secure access • Tenant: /{tenant.slug}</p>
          </div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl">Choose Role</CardTitle>
              <p className="text-sm text-muted-foreground">Each role lands in a distinct workspace.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {EDUVERSE_ROLES.map((r) => (
                  <Button
                    key={r}
                    variant={role === r ? "hero" : "soft"}
                    className="justify-start"
                    onClick={() => setRole(r)}
                    type="button"
                  >
                    {roleLabel[r]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl">{roleLabel[role]} Login</CardTitle>
              <p className="text-sm text-muted-foreground">No public signup. Accounts are created by administrators.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.com" />
              </div>

              <Tabs defaultValue="password">
                <TabsList className="w-full">
                  <TabsTrigger value="password" className="flex-1">
                    <KeyRound className="mr-2 h-4 w-4" /> Password
                  </TabsTrigger>
                  <TabsTrigger value="magic" className="flex-1">
                    <Mail className="mr-2 h-4 w-4" /> Magic link
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                    />
                  </div>
                  <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={doPasswordLogin}>
                    Sign in
                  </Button>
                </TabsContent>

                <TabsContent value="magic" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Best for parents/guardians: receive a secure sign-in link. (No account auto-creation.)
                  </p>
                  <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={doMagicLink}>
                    Send sign-in link
                  </Button>
                </TabsContent>
              </Tabs>

              {message && <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">{message}</div>}

              {tenant.status === "error" && (
                <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">{tenant.error}</div>
              )}

              {perms.isPlatformSuperAdmin && tenant.status === "ready" && (
                <div className="rounded-xl border border-border bg-card/40 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Platform Super Admin</p>
                      <p className="text-xs text-muted-foreground">Quick access to bootstrap tools for this tenant.</p>
                    </div>
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => navigate(`/${tenant.slug}/bootstrap`)}
                    >
                      Open Bootstrap
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TenantAuth;
