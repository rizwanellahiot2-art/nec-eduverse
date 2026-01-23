 import { Users, Calendar, ClipboardList, Coins, FileText, Star } from "lucide-react";
 
 export function HrHomeModule() {
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
         {[
           { label: "Total Staff", value: "—", icon: Users },
           { label: "Pending Leaves", value: "—", icon: Calendar },
           { label: "Today Present", value: "—", icon: ClipboardList }
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
         <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
           {[
             { label: "Add Staff", icon: Users },
             { label: "Leave Requests", icon: Calendar },
             { label: "Mark Attendance", icon: ClipboardList },
             { label: "Payroll", icon: Coins },
             { label: "Contracts", icon: FileText },
             { label: "Reviews", icon: Star }
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