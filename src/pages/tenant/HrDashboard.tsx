 import { Navigate, Route, Routes, useParams } from "react-router-dom";
 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useSession } from "@/hooks/useSession";
 import { useTenant } from "@/hooks/useTenant";
 import { HrShell } from "@/components/tenant/HrShell";
 import { HrHomeModule } from "@/pages/tenant/hr-modules/HrHomeModule";
 import { HrUsersModule } from "@/pages/tenant/hr-modules/HrUsersModule";
 import { HrLeavesModule } from "@/pages/tenant/hr-modules/HrLeavesModule";
 import { HrAttendanceModule } from "@/pages/tenant/hr-modules/HrAttendanceModule";
 import { HrSalariesModule } from "@/pages/tenant/hr-modules/HrSalariesModule";
 import { HrContractsModule } from "@/pages/tenant/hr-modules/HrContractsModule";
 import { HrReviewsModule } from "@/pages/tenant/hr-modules/HrReviewsModule";
 import { HrDocumentsModule } from "@/pages/tenant/hr-modules/HrDocumentsModule";
 
 const HrDashboard = () => {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
   const { user, loading } = useSession();
   const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
 
   useEffect(() => {
     if (tenant.status !== "ready") return;
     if (!user) return;
 
     let cancelled = false;
     setAuthzState("checking");
 
     (async () => {
       const { data: psa } = await supabase
         .from("platform_super_admins")
         .select("user_id")
         .eq("user_id", user.id)
         .maybeSingle();
       if (cancelled) return;
       if (psa?.user_id) {
         setAuthzState("ok");
         return;
       }
 
       const { data: roleRow } = await supabase
         .from("user_roles")
         .select("id")
         .eq("school_id", tenant.schoolId)
         .eq("user_id", user.id)
         .eq("role", "hr_manager")
         .maybeSingle();
 
       if (cancelled) return;
       setAuthzState(roleRow ? "ok" : "denied");
     })();
 
     return () => {
       cancelled = true;
     };
   }, [tenant.status, tenant.schoolId, user]);
 
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
 
   if (authzState === "denied") {
     return (
       <div className="min-h-screen bg-background p-8">
         <div className="rounded-3xl bg-surface p-6 shadow-elevated">
           <p className="font-display text-xl font-semibold tracking-tight">Access Denied</p>
           <p className="mt-2 text-sm text-muted-foreground">You do not have HR Manager access.</p>
         </div>
       </div>
     );
   }
 
   return (
     <HrShell title={`${tenant.school?.name || "EDUVERSE"} • HR`} subtitle="Human Resources" schoolSlug={tenant.slug}>
       {authzState === "ok" && (
         <Routes>
           <Route index element={<HrHomeModule />} />
           <Route path="users" element={<HrUsersModule />} />
           <Route path="leaves" element={<HrLeavesModule />} />
           <Route path="attendance" element={<HrAttendanceModule />} />
           <Route path="salaries" element={<HrSalariesModule />} />
           <Route path="contracts" element={<HrContractsModule />} />
           <Route path="reviews" element={<HrReviewsModule />} />
           <Route path="documents" element={<HrDocumentsModule />} />
           <Route path="*" element={<Navigate to={`/${tenant.slug}/hr`} replace />} />
         </Routes>
       )}
     </HrShell>
   );
 };
 
 export default HrDashboard;