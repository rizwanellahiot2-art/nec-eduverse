 import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { useParams } from "react-router-dom";
 
 export function AccountantHomeModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: stats } = useQuery({
     queryKey: ["accountant_stats", tenant.schoolId],
     queryFn: async () => {
       const [invoices, payments, expenses] = await Promise.all([
         supabase.from("finance_invoices").select("total", { count: "exact" }).eq("school_id", tenant.schoolId),
         supabase.from("finance_payments").select("amount", { count: "exact" }).eq("school_id", tenant.schoolId),
         supabase.from("finance_expenses").select("amount", { count: "exact" }).eq("school_id", tenant.schoolId)
       ]);
       return {
         invoiceCount: invoices.count || 0,
         paymentCount: payments.count || 0,
         expenseCount: expenses.count || 0
       };
     },
     enabled: tenant.status === "ready"
   });
 
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
         {[
           { label: "Total Invoices", value: stats?.invoiceCount || "—", icon: FileText },
           { label: "Payments Received", value: stats?.paymentCount || "—", icon: TrendingUp },
           { label: "Total Expenses", value: stats?.expenseCount || "—", icon: TrendingDown }
         ].map((kpi) => (
           <div key={kpi.label} className="rounded-3xl bg-surface p-5 shadow-elevated">
             <div className="flex items-center justify-between">
               <p className="text-sm text-muted-foreground">{kpi.label}</p>
               <kpi.icon className="h-4 w-4 text-muted-foreground" />
             </div>
             <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpi.value}</p>
           </div>
         ))}
       </div>
 
       <div className="rounded-2xl bg-accent p-6">
         <p className="font-display text-lg font-semibold text-accent-foreground">Quick Actions</p>
         <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
           {[
             { label: "Record Payment", icon: DollarSign },
             { label: "Add Expense", icon: TrendingDown },
             { label: "Generate Invoice", icon: FileText }
           ].map((action) => (
             <button
               key={action.label}
               className="flex flex-col items-center gap-2 rounded-xl bg-background p-4 text-sm font-medium transition-all hover:scale-105"
             >
               <action.icon className="h-5 w-5" />
               {action.label}
             </button>
           ))}
         </div>
       </div>
     </div>
   );
 }