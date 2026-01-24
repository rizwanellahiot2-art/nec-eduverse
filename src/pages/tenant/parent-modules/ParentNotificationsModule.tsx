import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { Bell, CheckCheck, Settings } from "lucide-react";
import { NotificationPreferencesCard } from "@/components/notifications/NotificationPreferencesCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ParentNotificationsModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const ParentNotificationsModule = ({ child, schoolId }: ParentNotificationsModuleProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!child || !currentUserId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("parent_notifications")
      .select("id, title, content, notification_type, is_read, created_at")
      .eq("parent_user_id", currentUserId)
      .eq("student_id", child.student_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch notifications:", error);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  }, [child, currentUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!child || !currentUserId) return;

    const channel = supabase
      .channel(`parent-notifications-${child.student_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parent_notifications",
          filter: `student_id=eq.${child.student_id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, currentUserId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("parent_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!currentUserId || !child) return;

    await supabase
      .from("parent_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("parent_user_id", currentUserId)
      .eq("student_id", child.student_id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "attendance_alert":
        return "destructive";
      case "fee_reminder":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view notifications.
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Alerts and updates for {child.first_name || "your child"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                All Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} unread</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications yet.</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          notification.is_read ? "bg-background" : "bg-accent/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{notification.title}</p>
                              <Badge variant={typeColor(notification.notification_type)}>
                                {notification.notification_type.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {notification.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notification.created_at), "MMMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          {schoolId && <NotificationPreferencesCard schoolId={schoolId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentNotificationsModule;
