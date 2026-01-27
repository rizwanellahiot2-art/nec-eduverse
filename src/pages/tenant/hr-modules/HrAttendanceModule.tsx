import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineStaffMembers } from "@/hooks/useOfflineData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, RefreshCw, WifiOff } from "lucide-react";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { exportToCSV } from "@/lib/csv";

export function HrAttendanceModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => tenant.status === "ready" ? tenant.schoolId : null, [tenant.status, tenant.schoolId]);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Offline staff data
  const { 
    data: cachedStaff, 
    isOffline, 
    isUsingCache,
    refresh: refreshStaff 
  } = useOfflineStaffMembers(schoolId);

  const { data: attendance = [], isLoading, refetch } = useQuery({
    queryKey: ["hr_staff_attendance", schoolId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_staff_attendance")
        .select("*")
        .eq("school_id", schoolId!)
        .eq("attendance_date", selectedDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !isOffline,
  });

  const markMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("hr_staff_attendance").upsert({
        school_id: schoolId,
        user_id: userId,
        attendance_date: selectedDate,
        status,
        recorded_by: (await supabase.auth.getUser()).data.user?.id
      }, { onConflict: "school_id,user_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr_staff_attendance"] });
      toast.success("Attendance marked");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to mark attendance");
    }
  });

  // Build attendance map
  const attendanceByUserId = useMemo(() => {
    const map = new Map<string, typeof attendance[0]>();
    attendance.forEach(a => map.set(a.user_id, a));
    return map;
  }, [attendance]);

  const handleExport = () => {
    const rows = cachedStaff.map(s => {
      const att = attendanceByUserId.get(s.userId);
      return {
        Name: s.displayName || s.email,
        Email: s.email,
        Date: selectedDate,
        Status: att?.status || "Not Marked",
      };
    });
    exportToCSV(rows, `staff-attendance-${selectedDate}`);
    toast.success("Exported to CSV");
  };

  const handleRefresh = () => {
    if (!isOffline) {
      refetch();
      refreshStaff();
    }
  };

  if (isLoading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={handleRefresh} />
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Staff Attendance</h1>
        <div className="flex gap-2">
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {!isOffline && (
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cachedStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isOffline ? (
                <div className="flex flex-col items-center gap-2">
                  <WifiOff className="h-6 w-6" />
                  <span>No cached staff data available</span>
                </div>
              ) : (
                "No staff members found."
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cachedStaff.map((staff) => {
                  const att = attendanceByUserId.get(staff.userId);
                  return (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.displayName || staff.email}</TableCell>
                      <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                      <TableCell>
                        {att ? (
                          <Badge 
                            variant={att.status === "present" ? "default" : att.status === "absent" ? "destructive" : "secondary"}
                          >
                            {att.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Marked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isOffline && (
                          <Select
                            value={att?.status || ""}
                            onValueChange={(status) => markMutation.mutate({ userId: staff.userId, status })}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Mark" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="half_day">Half Day</SelectItem>
                              <SelectItem value="leave">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
