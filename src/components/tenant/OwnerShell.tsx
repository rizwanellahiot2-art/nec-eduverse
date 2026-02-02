import { PropsWithChildren, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Building2,
  Coins,
  GraduationCap,
  HeartPulse,
  LayoutGrid,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Scale,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { useUnreadMessagesOptimized } from "@/hooks/useUnreadMessagesOptimized";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useSession } from "@/hooks/useSession";
import { useOfflineUniversal } from "@/hooks/useOfflineUniversal";
import { OfflineStatusIndicator } from "@/components/offline/OfflineStatusIndicator";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function OwnerShell({ title, subtitle, schoolSlug, children }: Props) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useSession();
  
  // Use optimized tenant hook that caches and applies branding automatically
  const tenant = useTenantOptimized(schoolSlug);
  const schoolId = tenant.schoolId;
  const schoolName = tenant.school?.name || "";

  // Offline support
  const offline = useOfflineUniversal({
    schoolId,
    userId: user?.id ?? null,
    role: "school_owner",
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  const { unreadCount } = useUnreadMessagesOptimized(schoolId, user?.id ?? null);

  const basePath = `/${schoolSlug}/school_owner`;

  const navItems = [
    { to: basePath, icon: LayoutGrid, label: "Overview", end: true },
    { to: `${basePath}/academics`, icon: GraduationCap, label: "Academics Intelligence" },
    { to: `${basePath}/admissions`, icon: TrendingUp, label: "Admissions & Growth" },
    { to: `${basePath}/finance`, icon: Coins, label: "Finance & Profitability" },
    { to: `${basePath}/hr`, icon: Users, label: "HR & Culture" },
    { to: `${basePath}/wellbeing`, icon: HeartPulse, label: "Student Wellbeing" },
    { to: `${basePath}/compliance`, icon: Scale, label: "Compliance & Governance" },
    { to: `${basePath}/campuses`, icon: Building2, label: "Multi-Campus View" },
    { to: `${basePath}/brand`, icon: Star, label: "Brand & Experience" },
    { to: `${basePath}/security`, icon: Shield, label: "System & Security" },
    { to: `${basePath}/support`, icon: LifeBuoy, label: "Support Tickets" },
    { to: `${basePath}/advisor`, icon: Brain, label: "AI Strategy Advisor" },
    { to: `${basePath}/ai`, icon: Sparkles, label: "AI Command Center" },
    { to: `${basePath}/messages`, icon: MessageSquare, label: "Messages", badge: unreadCount },
  ];

  const bottomNavItems = [
    { to: basePath, icon: LayoutGrid, label: "Overview" },
    { to: `${basePath}/finance`, icon: Coins, label: "Finance" },
    { to: `${basePath}/academics`, icon: GraduationCap, label: "Academics" },
    { to: `${basePath}/advisor`, icon: Brain, label: "AI Advisor" },
  ];

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-primary">
            {schoolName || "EDUVERSE"}
          </p>
          <p className="text-xs text-muted-foreground">School Owner • CEO View</p>
        </div>
        <div className="flex items-center gap-2">
          <OfflineStatusIndicator
            isOnline={offline.isOnline}
            isSyncing={offline.isSyncing}
            stats={offline.stats}
            lastSyncAt={offline.lastSyncAt}
            syncProgress={offline.syncProgress}
            storageInfo={offline.storageInfo}
            onSync={offline.syncPendingItems}
            variant="compact"
          />
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role="school_owner" />
          <Button
            variant="soft"
            size="icon"
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="mt-6 flex-1">
        <nav className="space-y-1 pr-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {"badge" in item && item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/10">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Executive Access</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Full visibility into institutional performance, finances, and strategy.
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <GlobalCommandPalette basePath={basePath} />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-4">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OfflineStatusIndicator
            isOnline={offline.isOnline}
            isSyncing={offline.isSyncing}
            stats={offline.stats}
            lastSyncAt={offline.lastSyncAt}
            syncProgress={offline.syncProgress}
            storageInfo={offline.storageInfo}
            onSync={offline.syncPendingItems}
            variant="compact"
          />
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role="school_owner" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[300px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        {/* Desktop Sidebar */}
        <aside className="sticky top-6 hidden self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-surface p-4 shadow-elevated lg:block">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="min-w-0">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === basePath}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors relative"
            activeClassName="text-primary-foreground bg-primary shadow-sm"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Floating offline indicator for desktop */}
      <div className="hidden lg:block">
        <OfflineStatusIndicator
          isOnline={offline.isOnline}
          isSyncing={offline.isSyncing}
          stats={offline.stats}
          lastSyncAt={offline.lastSyncAt}
          syncProgress={offline.syncProgress}
          storageInfo={offline.storageInfo}
          onSync={offline.syncPendingItems}
          variant="floating"
        />
      </div>
    </div>
  );
}
