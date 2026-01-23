 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function AccountantPayrollModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
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
         <Button>Run Payroll</Button>
         <Button variant="outline">View Salary Records</Button>
       </div>
 
       <div className="space-y-3">
         {payRuns?.map((run) => (
           <div key={run.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">Pay Run {run.id.slice(0, 8)}</p>
                 <p className="text-sm text-muted-foreground">
                   Period: {run.period_start} → {run.period_end}
                 </p>
                 <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                   <div>
                     <p className="text-muted-foreground">Gross</p>
                     <p className="font-semibold">{run.gross_amount.toFixed(2)}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Deductions</p>
                     <p className="font-semibold">{run.deductions.toFixed(2)}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Net</p>
                     <p className="font-semibold">{run.net_amount.toFixed(2)}</p>
                   </div>
                 </div>
                 <p className="mt-2 text-xs capitalize">{run.status}</p>
               </div>
               <Button size="sm" variant="outline">
                 View
               </Button>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }