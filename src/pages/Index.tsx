import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Building2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SpotlightBackdrop } from "@/components/visual/SpotlightBackdrop";

const Index = () => {
  const [schoolSlug, setSchoolSlug] = useState("beacon");
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const safeSlug = useMemo(() => schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""), [schoolSlug]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-grid">
      <SpotlightBackdrop />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface shadow-elevated">
            <Building2 className="text-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
            <p className="text-sm text-muted-foreground">School Operating System</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow-elevated">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No public signup • Admin-created users</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-16 pt-8 md:grid-cols-2 md:items-center md:pt-14">
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="space-y-6"
        >
          <h1 className={cn("font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl")}> 
            Run your entire school on one premium platform.
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            EDUVERSE is a multi-tenant, role-isolated operating system for schools—CRM, academics, finance, HR, and
            analytics—built for enterprise-grade control.
          </p>

          <div className="max-w-xl rounded-2xl bg-surface p-4 shadow-elevated">
            <p className="mb-3 text-sm font-medium text-foreground">Enter your School Code</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={schoolSlug}
                onChange={(e) => setSchoolSlug(e.target.value)}
                placeholder="e.g. beacon"
                aria-label="School code"
              />
              <Button
                variant="hero"
                size="xl"
                onClick={() => {
                  if (!safeSlug) return;
                  navigate(`/${safeSlug}/auth`);
                }}
              >
                Continue
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo school seeded: <span className="font-medium text-foreground">beacon</span>
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-3xl bg-surface p-6 shadow-elevated">
            <div className="absolute inset-0 bg-brand-gradient opacity-80" aria-hidden="true" />
            <div className="relative">
              <p className="text-sm font-medium text-foreground">What you get in this foundation</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: "Subpage multi-tenancy", desc: "All routes live under /:school/*" },
                  { title: "12-role RBAC", desc: "Scoped roles per school with RLS" },
                  { title: "White-labeling", desc: "Per-school accent + logo support" },
                  { title: "PWA-ready", desc: "Installable app shell" },
                ].map((i) => (
                  <div key={i.title} className="rounded-2xl bg-surface/70 p-4 shadow-elevated">
                    <p className="font-medium text-foreground">{i.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{i.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-surface/70 p-4">
                <p className="text-sm font-medium text-foreground">Next: dashboards + modules</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  After login, you’ll land in a role-specific workspace that will expand into CRM, academics, finance,
                  HR, comms, and BI.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Index;
