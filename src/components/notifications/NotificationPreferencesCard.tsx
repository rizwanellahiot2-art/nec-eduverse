import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Bell, BookOpen, ClipboardCheck, Clock, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationPreference {
  id: string;
  student_id: string;
  notify_absent: boolean;
  notify_late: boolean;
  notify_grades: boolean;
  notify_homework: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface Props {
  schoolId: string;
}

export function NotificationPreferencesCard({ schoolId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [preferences, setPreferences] = useState<Map<string, NotificationPreference>>(new Map());

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);

    // Get current user's children
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);
      return;
    }

    // Get children via student_guardians
    const { data: guardianLinks } = await supabase
      .from("student_guardians")
      .select("student_id")
      .eq("user_id", user.user.id);

    if (!guardianLinks?.length) {
      setLoading(false);
      return;
    }

    const studentIds = guardianLinks.map((g) => g.student_id);

    // Get student details
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds)
      .eq("school_id", schoolId);

    setChildren(students || []);

    // Get existing preferences
    const { data: prefs } = await supabase
      .from("parent_notification_preferences")
      .select("*")
      .eq("user_id", user.user.id)
      .in("student_id", studentIds);

    const prefsMap = new Map<string, NotificationPreference>();
    prefs?.forEach((p) => {
      prefsMap.set(p.student_id, p as NotificationPreference);
    });
    setPreferences(prefsMap);

    setLoading(false);
  };

  const updatePreference = async (
    studentId: string,
    field: keyof Pick<NotificationPreference, "notify_absent" | "notify_late" | "notify_grades" | "notify_homework">,
    value: boolean
  ) => {
    setSaving(studentId + field);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const existing = preferences.get(studentId);

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("parent_notification_preferences")
        .update({ [field]: value })
        .eq("id", existing.id);

      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        setPreferences((prev) => {
          const newMap = new Map(prev);
          newMap.set(studentId, { ...existing, [field]: value });
          return newMap;
        });
        toast({ title: "Preferences updated" });
      }
    } else {
      // Insert new
      const newPref = {
        school_id: schoolId,
        user_id: user.user.id,
        student_id: studentId,
        notify_absent: field === "notify_absent" ? value : true,
        notify_late: field === "notify_late" ? value : true,
        notify_grades: field === "notify_grades" ? value : true,
        notify_homework: field === "notify_homework" ? value : true,
      };

      const { data, error } = await supabase
        .from("parent_notification_preferences")
        .insert(newPref)
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      } else {
        setPreferences((prev) => {
          const newMap = new Map(prev);
          newMap.set(studentId, data as NotificationPreference);
          return newMap;
        });
        toast({ title: "Preferences saved" });
      }
    }

    setSaving(null);
  };

  const getPreference = (studentId: string, field: keyof NotificationPreference): boolean => {
    const pref = preferences.get(studentId);
    if (!pref) return true; // Default to true
    return pref[field] as boolean;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (children.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which notifications you'd like to receive for each child
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children.map((child) => (
          <div key={child.id} className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">
              {child.first_name} {child.last_name}
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/30">
                    <X className="h-4 w-4" />
                  </div>
                  <div>
                    <Label htmlFor={`absent-${child.id}`} className="font-medium cursor-pointer">
                      Absence Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">When marked absent</p>
                  </div>
                </div>
                <Switch
                  id={`absent-${child.id}`}
                  checked={getPreference(child.id, "notify_absent")}
                  onCheckedChange={(v) => updatePreference(child.id, "notify_absent", v)}
                  disabled={saving === child.id + "notify_absent"}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <Label htmlFor={`late-${child.id}`} className="font-medium cursor-pointer">
                      Late Arrival Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">When marked late</p>
                  </div>
                </div>
                <Switch
                  id={`late-${child.id}`}
                  checked={getPreference(child.id, "notify_late")}
                  onCheckedChange={(v) => updatePreference(child.id, "notify_late", v)}
                  disabled={saving === child.id + "notify_late"}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <Label htmlFor={`grades-${child.id}`} className="font-medium cursor-pointer">
                      Grade Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">New grades posted</p>
                  </div>
                </div>
                <Switch
                  id={`grades-${child.id}`}
                  checked={getPreference(child.id, "notify_grades")}
                  onCheckedChange={(v) => updatePreference(child.id, "notify_grades", v)}
                  disabled={saving === child.id + "notify_grades"}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <Label htmlFor={`homework-${child.id}`} className="font-medium cursor-pointer">
                      Homework Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">New assignments</p>
                  </div>
                </div>
                <Switch
                  id={`homework-${child.id}`}
                  checked={getPreference(child.id, "notify_homework")}
                  onCheckedChange={(v) => updatePreference(child.id, "notify_homework", v)}
                  disabled={saving === child.id + "notify_homework"}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
