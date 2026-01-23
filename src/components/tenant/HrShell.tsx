 import { PropsWithChildren, useEffect, useState } from "react";
 import { NavLink } from "@/components/NavLink";
 import { Button } from "@/components/ui/button";
  import { Briefcase, Calendar, Coins, FileText, LayoutGrid, Star, Users as UsersIcon, ClipboardList, Headphones, LogOut, Sparkles } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
 import { NotificationsBell } from "@/components/global/NotificationsBell";
 
 type Props = PropsWithChildren<{
   title: string;
   subtitle?: string;
   schoolSlug: string;
 }>;
 
 export function HrShell({ title, subtitle, schoolSlug, children }: Props) {
   const [schoolId, setSchoolId] = useState<string | null>(null);

   useEffect(() => {
     let cancelled = false;
 
     (async () => {
        const { data: school } = await supabase.from("schools").select("id").eq("slug", schoolSlug).maybeSingle();
       if (cancelled || !school?.id) return;
        setSchoolId(school.id);
       const { data: branding } = await supabase
         .from("school_branding")
         .select("accent_hue,accent_saturation,accent_lightness,radius_scale")
         .eq("school_id", school.id)
         .maybeSingle();
 
       if (cancelled || !branding) return;
       const root = document.documentElement;
       root.style.setProperty("--brand", `${branding.accent_hue} ${branding.accent_saturation}% ${branding.accent_lightness}%`);
       root.style.setProperty("--radius", `${0.85 * (branding.radius_scale || 1)}rem`);
     })();
 
     return () => {
       cancelled = true;
     };
   }, [schoolSlug]);
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     window.location.href = `/${schoolSlug}/auth`;
   };
 
   return (
     <div className="min-h-screen bg-background">
        <GlobalCommandPalette basePath={`/${schoolSlug}/hr`} />
       <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
         <aside className="rounded-3xl bg-surface p-4 shadow-elevated">
           <div className="flex items-center justify-between">
             <div>
               <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
               <p className="text-xs text-muted-foreground">/{schoolSlug} • HR</p>
             </div>
              <div className="flex items-center gap-2">
                <NotificationsBell schoolId={schoolId} />
                <Button
                  variant="soft"
                  size="icon"
                  aria-label="Search"
                  onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
                >
                  <Sparkles />
                </Button>
              </div>
           </div>
 
           <nav className="mt-6 space-y-1">
             <NavLink
               to={`/${schoolSlug}/hr`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <LayoutGrid className="h-4 w-4" /> Dashboard
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/users`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <UsersIcon className="h-4 w-4" /> Staff & Users
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/leaves`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <Calendar className="h-4 w-4" /> Leave Management
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/attendance`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <ClipboardList className="h-4 w-4" /> Staff Attendance
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/salaries`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <Coins className="h-4 w-4" /> Salaries
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/contracts`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <FileText className="h-4 w-4" /> Contracts
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/reviews`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <Star className="h-4 w-4" /> Performance Reviews
             </NavLink>
 
             <NavLink
               to={`/${schoolSlug}/hr/documents`}
               className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
               activeClassName="bg-accent text-accent-foreground"
             >
               <Briefcase className="h-4 w-4" /> Documents
             </NavLink>

              <NavLink
                to={`/${schoolSlug}/hr/support`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <Headphones className="h-4 w-4" /> Support Inbox
              </NavLink>
           </nav>
 
           <div className="mt-6 rounded-2xl bg-accent p-4">
             <p className="text-sm font-medium text-accent-foreground">HR Portal</p>
             <p className="mt-1 text-xs text-muted-foreground">
               Manage staff, leave requests, attendance, salaries, contracts, and reviews.
             </p>
           </div>
 
           <Button onClick={handleLogout} variant="outline" className="mt-6 w-full">
             <LogOut className="mr-2 h-4 w-4" /> Logout
           </Button>
         </aside>
 
         <section className="rounded-3xl bg-surface p-6 shadow-elevated">
           <header className="mb-6">
             <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
             {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
           </header>
           {children}
         </section>
       </div>
     </div>
   );
 }