 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function AccountantPaymentsModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: payments } = useQuery({
     queryKey: ["finance_payments", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("finance_payments")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .order("paid_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   return (
     <div className="space-y-6">
       <Button>Record Payment</Button>
 
       <div className="space-y-3">
         {payments?.map((payment) => (
           <div key={payment.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">Payment {payment.id.slice(0, 8)}</p>
                 <p className="text-sm text-muted-foreground">Paid: {new Date(payment.paid_at).toLocaleDateString()}</p>
                 <p className="mt-1 text-lg font-semibold">{payment.amount.toFixed(2)}</p>
                 {payment.reference && <p className="text-xs">Ref: {payment.reference}</p>}
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