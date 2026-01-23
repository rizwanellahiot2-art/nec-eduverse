 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function AccountantExpensesModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: expenses } = useQuery({
     queryKey: ["finance_expenses", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("finance_expenses")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .order("expense_date", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   return (
     <div className="space-y-6">
       <Button>Add Expense</Button>
 
       <div className="space-y-3">
         {expenses?.map((expense) => (
           <div key={expense.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">{expense.description}</p>
                 <p className="text-sm text-muted-foreground">
                   {expense.expense_date} • {expense.category}
                 </p>
                 {expense.vendor && <p className="text-sm">Vendor: {expense.vendor}</p>}
                 <p className="mt-1 text-lg font-semibold">{expense.amount.toFixed(2)}</p>
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