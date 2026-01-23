 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function AccountantFeesModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: feePlans } = useQuery({
     queryKey: ["fee_plans", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("fee_plans")
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
       <Button>Create Fee Plan</Button>
 
       <div className="space-y-3">
         {feePlans?.map((plan) => (
           <div key={plan.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">{plan.name}</p>
                 <p className="text-sm text-muted-foreground">Currency: {plan.currency}</p>
                 <p className="mt-1 text-xs">{plan.is_active ? "Active" : "Inactive"}</p>
               </div>
               <Button size="sm" variant="outline">
                 Manage
               </Button>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }