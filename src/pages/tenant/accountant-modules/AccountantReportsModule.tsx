 import { Button } from "@/components/ui/button";
 import { BarChart3, TrendingUp, FileText } from "lucide-react";
 
 export function AccountantReportsModule() {
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
         {[
           { title: "Profit & Loss", description: "View P&L statement for selected period", icon: TrendingUp },
           { title: "Balance Sheet", description: "Current assets, liabilities, and equity", icon: BarChart3 },
           { title: "Tax Report", description: "Generate tax reports and summaries", icon: FileText },
           { title: "Cash Flow", description: "Track income and expenses over time", icon: TrendingUp }
         ].map((report) => (
           <div key={report.title} className="rounded-2xl bg-accent p-6">
             <div className="flex items-center gap-3">
               <report.icon className="h-6 w-6 text-accent-foreground" />
               <div>
                 <p className="font-medium text-accent-foreground">{report.title}</p>
                 <p className="text-sm text-muted-foreground">{report.description}</p>
               </div>
             </div>
             <Button size="sm" className="mt-4" variant="outline">
               Generate
             </Button>
           </div>
         ))}
       </div>
 
       <div className="rounded-2xl bg-accent p-6">
         <p className="font-medium">Export Options</p>
         <div className="mt-4 flex gap-2">
           <Button variant="outline" size="sm">
             Export CSV
           </Button>
           <Button variant="outline" size="sm">
             Export PDF
           </Button>
           <Button variant="outline" size="sm">
             Export Excel
           </Button>
         </div>
       </div>
     </div>
   );
 }