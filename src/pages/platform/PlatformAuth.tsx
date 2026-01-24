import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

export default function PlatformAuth() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user, loading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const title = useMemo(() => "Platform Super Admin", []);

  useEffect(() => {
    if (loading) return;
    if (user) navigate("/super_admin", { replace: true });
  }, [loading, user, navigate]);

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
      navigate("/super_admin");
    } finally {
      setBusy(false);
    }
  };

  const doResetPassword = async () => {
    setMessage(null);
    const parsedEmail = emailSchema.safeParse(email.trim());
    if (!parsedEmail.success) return setMessage("Please enter your email first.");

    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, { redirectTo });
      if (error) return setMessage(error.message);
      setMessage("Password reset email sent. Open the link to set a new password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-grid px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface shadow-elevated">
            <ShieldCheck />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
            <p className="text-sm text-muted-foreground">Sign in to manage all schools.</p>
          </div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl">Super Admin Login</CardTitle>
              <p className="text-sm text-muted-foreground">No public signup. Use your admin email.</p>
            <div className="mt-2">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/auth/recover-master")}>
                Forgot credentials? → Recover master admin
              </Button>
            </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
              </div>

              <Tabs defaultValue="password">
                <TabsList className="w-full">
                  <TabsTrigger value="password" className="flex-1">
                    <KeyRound className="mr-2 h-4 w-4" /> Password
                  </TabsTrigger>
                  <TabsTrigger value="reset" className="flex-1">
                    <Mail className="mr-2 h-4 w-4" /> Reset
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

                <TabsContent value="reset" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">We’ll email you a secure link to set a new password.</p>
                  <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={doResetPassword}>
                    Send reset email
                  </Button>
                </TabsContent>
              </Tabs>

              {message && <div className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">{message}</div>}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
