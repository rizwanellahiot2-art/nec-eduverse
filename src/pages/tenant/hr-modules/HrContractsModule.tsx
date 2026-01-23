 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function HrContractsModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: contracts } = useQuery({
     queryKey: ["hr_contracts", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_contracts")
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
       <Button>Add Contract</Button>
 
       <div className="space-y-3">
         {contracts?.map((contract) => (
           <div key={contract.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">{contract.position || "Contract"}</p>
                 <p className="text-sm text-muted-foreground">
                   {contract.start_date} → {contract.end_date || "Ongoing"}
                 </p>
                 <p className="mt-1 text-xs capitalize">{contract.status}</p>
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