 import { Navigate, Route, Routes, useParams } from "react-router-dom";
 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useSession } from "@/hooks/useSession";
 import { useTenant } from "@/hooks/useTenant";
 import { AccountantShell } from "@/components/tenant/AccountantShell";
 import { AccountantHomeModule } from "@/pages/tenant/accountant-modules/AccountantHomeModule";
 import { AccountantFeesModule } from "@/pages/tenant/accountant-modules/AccountantFeesModule";
 import { AccountantInvoicesModule } from "@/pages/tenant/accountant-modules/AccountantInvoicesModule";
 import { AccountantPaymentsModule } from "@/pages/tenant/accountant-modules/AccountantPaymentsModule";
 import { AccountantExpensesModule } from "@/pages/tenant/accountant-modules/AccountantExpensesModule";
 import { AccountantPayrollModule } from "@/pages/tenant/accountant-modules/AccountantPayrollModule";
 import { AccountantReportsModule } from "@/pages/tenant/accountant-modules/AccountantReportsModule";
  import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";
 
 const AccountantDashboard = () => {
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
         .eq("role", "accountant")
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
           <p className="mt-2 text-sm text-muted-foreground">You do not have Accountant access.</p>
         </div>
       </div>
     );
   }
 
   return (
     <AccountantShell title={`${tenant.school?.name || "EDUVERSE"} • Finance`} subtitle="Accounting & Finance" schoolSlug={tenant.slug}>
       {authzState === "ok" && (
         <Routes>
           <Route index element={<AccountantHomeModule />} />
           <Route path="fees" element={<AccountantFeesModule />} />
           <Route path="invoices" element={<AccountantInvoicesModule />} />
           <Route path="payments" element={<AccountantPaymentsModule />} />
           <Route path="expenses" element={<AccountantExpensesModule />} />
           <Route path="payroll" element={<AccountantPayrollModule />} />
           <Route path="reports" element={<AccountantReportsModule />} />
            <Route path="timetable" element={<TimetableBuilderModule />} />
           <Route path="*" element={<Navigate to={`/${tenant.slug}/accountant`} replace />} />
         </Routes>
       )}
     </AccountantShell>
   );
 };
 
 export default AccountantDashboard;