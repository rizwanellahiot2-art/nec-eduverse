 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { toast } from "sonner";
 import { useParams } from "react-router-dom";
 
 export function HrAttendanceModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
   const queryClient = useQueryClient();
   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
 
   const { data: attendance } = useQuery({
     queryKey: ["hr_staff_attendance", tenant.schoolId, selectedDate],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_staff_attendance")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .eq("attendance_date", selectedDate)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   const markMutation = useMutation({
     mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
        const { error } = await supabase.from("hr_staff_attendance").upsert({
          school_id: tenant.schoolId,
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
     }
   });
 
   return (
     <div className="space-y-6">
       <div className="flex gap-4">
         <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
         <Button>Export CSV</Button>
       </div>
 
       <div className="rounded-2xl bg-accent p-6">
         <p className="text-sm text-muted-foreground">
           Staff attendance for {selectedDate}. {attendance?.length || 0} records.
         </p>
         <div className="mt-4 space-y-2">
           {attendance?.map((att) => (
             <div key={att.id} className="flex items-center justify-between rounded-lg bg-background p-3">
               <p className="font-medium">{att.user_id}</p>
               <span
                 className={`rounded-lg px-3 py-1 text-sm font-medium ${att.status === "present" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
               >
                 {att.status}
               </span>
             </div>
           ))}
         </div>
       </div>
     </div>
   );
 }