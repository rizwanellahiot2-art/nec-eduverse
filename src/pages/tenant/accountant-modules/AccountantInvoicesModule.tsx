 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function AccountantInvoicesModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: invoices } = useQuery({
     queryKey: ["finance_invoices", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("finance_invoices")
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
       <Button>Generate Invoice</Button>
 
       <div className="space-y-3">
         {invoices?.map((invoice) => (
           <div key={invoice.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">Invoice #{invoice.invoice_no}</p>
                 <p className="text-sm text-muted-foreground">
                   Date: {invoice.issue_date} • Due: {invoice.due_date || "N/A"}
                 </p>
                 <p className="mt-1 text-lg font-semibold">{invoice.total.toFixed(2)}</p>
                 <p className="text-xs capitalize">{invoice.status}</p>
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