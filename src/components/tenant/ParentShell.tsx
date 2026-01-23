import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Calendar,
  GraduationCap,
  Receipt,
  MessageSquare,
  Clock,
  Bell,
  LifeBuoy,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChildInfo } from "@/hooks/useMyChildren";

interface ParentShellProps {
  children: ReactNode;
  schoolName: string;
  schoolSlug: string;
  childList: ChildInfo[];
  selectedChild: ChildInfo | null;
  onSelectChild: (child: ChildInfo) => void;
  onLogout: () => void;
}

const navItems = [
  { label: "Home", icon: Home, path: "" },
  { label: "Attendance", icon: Calendar, path: "attendance" },
  { label: "Grades", icon: GraduationCap, path: "grades" },
  { label: "Fees", icon: Receipt, path: "fees" },
  { label: "Messages", icon: MessageSquare, path: "messages" },
  { label: "Timetable", icon: Clock, path: "timetable" },
  { label: "Notifications", icon: Bell, path: "notifications" },
  { label: "Support", icon: LifeBuoy, path: "support" },
];

export function ParentShell({
  children,
  schoolName,
  schoolSlug,
  childList,
  selectedChild,
  onSelectChild,
  onLogout,
}: ParentShellProps) {
  const basePath = `/${schoolSlug}/parent`;

  const formatChildName = (child: ChildInfo) => {
    const name = [child.first_name, child.last_name].filter(Boolean).join(" ") || "Student";
    const classSection = [child.class_name, child.section_name].filter(Boolean).join(" / ");
    return classSection ? `${name} • ${classSection}` : name;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
                P
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold truncate">{schoolName}</p>
                <p className="text-xs text-muted-foreground">Parent Portal</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Child Selector */}
            {childList.length > 1 && (
              <SidebarGroup>
                <SidebarGroupLabel>Viewing Child</SidebarGroupLabel>
                <SidebarGroupContent>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                          {selectedChild
                            ? formatChildName(selectedChild)
                            : "Select child"}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {childList.map((child) => (
                        <DropdownMenuItem
                          key={child.student_id}
                          onClick={() => onSelectChild(child)}
                        >
                          {formatChildName(child)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path ? `${basePath}/${item.path}` : basePath}
                          end={item.path === ""}
                          className={({ isActive }) =>
                            isActive ? "bg-accent text-accent-foreground" : ""
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur">
            <SidebarTrigger />
            {selectedChild && (
              <p className="text-sm text-muted-foreground">
                Viewing: <span className="font-medium text-foreground">{formatChildName(selectedChild)}</span>
              </p>
            )}
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
