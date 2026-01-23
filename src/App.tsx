import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlatformAuth from "./pages/platform/PlatformAuth";
import PlatformDashboardPage from "./pages/platform/PlatformDashboardPage";
import PlatformDirectoryPage from "./pages/platform/PlatformDirectoryPage";
import PlatformSchoolsPage from "./pages/platform/PlatformSchoolsPage";
import PlatformUpdatePassword from "./pages/platform/PlatformUpdatePassword";
import TenantAuth from "./pages/tenant/TenantAuth";
import TenantDashboard from "./pages/tenant/TenantDashboard";
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
          <Route path="/platform" element={<PlatformDashboardPage />} />
          <Route path="/platform/directory" element={<PlatformDirectoryPage />} />
          <Route path="/platform/schools" element={<PlatformSchoolsPage />} />
          <Route path="/:schoolSlug/auth" element={<TenantAuth />} />
          <Route path="/:schoolSlug/bootstrap" element={<TenantBootstrap />} />
          <Route path="/:schoolSlug/:role/*" element={<TenantDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
