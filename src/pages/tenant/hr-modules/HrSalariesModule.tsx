 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function HrSalariesModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: salaries } = useQuery({
     queryKey: ["hr_salary_records", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_salary_records")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   const { data: payRuns } = useQuery({
     queryKey: ["hr_pay_runs", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_pay_runs")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   return (
     <div className="space-y-6">
       <div className="flex gap-2">
         <Button>Add Salary Record</Button>
         <Button variant="outline">Run Payroll</Button>
       </div>
 
       <div className="rounded-2xl bg-accent p-6">
         <p className="font-medium">Active Salary Records</p>
         <p className="mt-2 text-sm text-muted-foreground">{salaries?.length || 0} records</p>
       </div>
 
       <div className="rounded-2xl bg-accent p-6">
         <p className="font-medium">Recent Pay Runs</p>
         <p className="mt-2 text-sm text-muted-foreground">{payRuns?.length || 0} pay runs</p>
       </div>
     </div>
   );
 }