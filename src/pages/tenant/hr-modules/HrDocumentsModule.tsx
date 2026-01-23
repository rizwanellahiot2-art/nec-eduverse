 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useTenant } from "@/hooks/useTenant";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { toast } from "sonner";
 import { useParams } from "react-router-dom";
 import { useState } from "react";
 
 export function HrDocumentsModule() {
   const { schoolSlug } = useParams();
   const tenant = useTenant(schoolSlug);
   const queryClient = useQueryClient();
   const [uploading, setUploading] = useState(false);
 
   const { data: documents } = useQuery({
     queryKey: ["hr_documents", tenant.schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("hr_documents")
         .select("*")
         .eq("school_id", tenant.schoolId)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
     enabled: tenant.status === "ready"
   });
 
   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     setUploading(true);
     try {
       const fileName = `${tenant.schoolId}/${Date.now()}_${file.name}`;
       const { error: uploadError } = await supabase.storage.from("hr-documents").upload(fileName, file);
       if (uploadError) throw uploadError;
 
       const { data: urlData } = supabase.storage.from("hr-documents").getPublicUrl(fileName);
 
       const { error: dbError } = await supabase.from("hr_documents").insert({
         school_id: tenant.schoolId,
         user_id: (await supabase.auth.getUser()).data.user?.id || "",
         document_type: "general",
         document_name: file.name,
         file_url: urlData.publicUrl,
         uploaded_by: (await supabase.auth.getUser()).data.user?.id
       });
       if (dbError) throw dbError;
 
       toast.success("Document uploaded");
       queryClient.invalidateQueries({ queryKey: ["hr_documents"] });
     } catch (error: any) {
       toast.error(error.message);
     } finally {
       setUploading(false);
     }
   };
 
   return (
     <div className="space-y-6">
       <div>
         <Input type="file" onChange={handleUpload} disabled={uploading} />
       </div>
 
       <div className="space-y-3">
         {documents?.map((doc) => (
           <div key={doc.id} className="rounded-2xl bg-accent p-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-medium">{doc.document_name}</p>
                 <p className="text-sm text-muted-foreground capitalize">{doc.document_type}</p>
               </div>
               <Button size="sm" variant="outline" asChild>
                 <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                   View
                 </a>
               </Button>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 }