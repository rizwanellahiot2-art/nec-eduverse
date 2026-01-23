 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { useParams } from "react-router-dom";
 
 export function HrReviewsModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
 
   const { data: reviews } = useQuery({
     queryKey: ["hr_performance_reviews", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_performance_reviews")
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
       <Button>Create Review</Button>
 
       <div className="space-y-3">
         {reviews?.map((review) => (
           <div key={review.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">Review {review.id.slice(0, 8)}</p>
                 <p className="text-sm text-muted-foreground">
                   {review.review_period_start} → {review.review_period_end}
                 </p>
                 {review.rating && <p className="mt-1 text-sm">Rating: {review.rating}/5</p>}
                 <p className="mt-1 text-xs capitalize">{review.status}</p>
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