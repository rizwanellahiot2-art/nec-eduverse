import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { AccountantShell } from "@/components/tenant/AccountantShell";
import { AccountantHomeModule } from "@/pages/tenant/accountant-modules/AccountantHomeModule";
import { AccountantFeesModule } from "@/pages/tenant/accountant-modules/AccountantFeesModule";
import { AccountantInvoicesModule } from "@/pages/tenant/accountant-modules/AccountantInvoicesModule";
import { AccountantPaymentsModule } from "@/pages/tenant/accountant-modules/AccountantPaymentsModule";
import { AccountantExpensesModule } from "@/pages/tenant/accountant-modules/AccountantExpensesModule";
import { AccountantPayrollModule } from "@/pages/tenant/accountant-modules/AccountantPayrollModule";
import { AccountantReportsModule } from "@/pages/tenant/accountant-modules/AccountantReportsModule";
import { AccountantMessagesModule } from "@/pages/tenant/accountant-modules/AccountantMessagesModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";

const AccountantDashboard = () => {
  const { schoolSlug } = useParams();
  
  // Use optimized hooks with caching
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  // Use optimized authorization hook
  const authz = useAuthz({
    schoolId,
    userId: user?.id ?? null,
    requiredRoles: ["accountant"],
  });
  const authzState = authz.state;

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  // Don't show loading if we have cached user
  if (loading && !user) {
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
      <Routes>
        <Route index element={<AccountantHomeModule />} />
        <Route path="fees" element={<AccountantFeesModule />} />
        <Route path="invoices" element={<AccountantInvoicesModule />} />
        <Route path="payments" element={<AccountantPaymentsModule />} />
        <Route path="expenses" element={<AccountantExpensesModule />} />
        <Route path="payroll" element={<AccountantPayrollModule />} />
        <Route path="reports" element={<AccountantReportsModule />} />
        <Route path="messages" element={<AccountantMessagesModule />} />
        <Route path="timetable" element={<TimetableBuilderModule />} />
        <Route path="*" element={<Navigate to={`/${tenant.slug}/accountant`} replace />} />
      </Routes>
    </AccountantShell>
  );
};

export default AccountantDashboard;
