import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlatformAuth from "./pages/platform/PlatformAuth";
import PlatformDashboardPage from "./pages/platform/PlatformDashboardPage";
import PlatformDirectoryPage from "./pages/platform/PlatformDirectoryPage";
import PlatformSchoolsPage from "./pages/platform/PlatformSchoolsPage";
import PlatformUpdatePassword from "./pages/platform/PlatformUpdatePassword";
import PlatformRecoverMaster from "./pages/platform/PlatformRecoverMaster";
import TenantAuth from "./pages/tenant/TenantAuth";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TeacherDashboard from "./pages/tenant/TeacherDashboard";
import HrDashboard from "./pages/tenant/HrDashboard";
import AccountantDashboard from "./pages/tenant/AccountantDashboard";
import MarketingDashboard from "./pages/tenant/MarketingDashboard";
import StudentDashboard from "./pages/tenant/StudentDashboard";
import ParentDashboard from "./pages/tenant/ParentDashboard";
import TenantBootstrap from "./pages/tenant/TenantBootstrap";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<PlatformAuth />} />
          <Route path="/auth/update-password" element={<PlatformUpdatePassword />} />
          <Route path="/auth/recover-master" element={<PlatformRecoverMaster />} />
          {/* Global Super Admin (platform-level) */}
          <Route path="/super_admin" element={<PlatformDashboardPage />} />
          <Route path="/super_admin/directory" element={<PlatformDirectoryPage />} />
          <Route path="/super_admin/schools" element={<PlatformSchoolsPage />} />

          {/* Back-compat aliases */}
          <Route path="/platform" element={<Navigate to="/super_admin" replace />} />
          <Route path="/platform/directory" element={<Navigate to="/super_admin/directory" replace />} />
          <Route path="/platform/schools" element={<Navigate to="/super_admin/schools" replace />} />
          <Route path="/:schoolSlug/auth" element={<TenantAuth />} />
          <Route path="/:schoolSlug/bootstrap" element={<TenantBootstrap />} />
          <Route path="/:schoolSlug/teacher/*" element={<TeacherDashboard />} />
          <Route path="/:schoolSlug/hr/*" element={<HrDashboard />} />
          <Route path="/:schoolSlug/accountant/*" element={<AccountantDashboard />} />
          <Route path="/:schoolSlug/marketing/*" element={<MarketingDashboard />} />
          <Route path="/:schoolSlug/student/*" element={<StudentDashboard />} />
          <Route path="/:schoolSlug/parent/*" element={<ParentDashboard />} />
          <Route path="/:schoolSlug/:role/*" element={<TenantDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
