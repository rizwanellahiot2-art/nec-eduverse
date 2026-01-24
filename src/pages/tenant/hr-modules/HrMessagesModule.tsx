import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

export function HrMessagesModule() {
  const { schoolSlug } = useParams();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolSlug) return;

    const fetchSchool = async () => {
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("slug", schoolSlug)
        .maybeSingle();

      setSchoolId(school?.id ?? null);
      setLoading(false);
    };

    fetchSchool();
  }, [schoolSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!schoolId) {
    return <p className="text-sm text-muted-foreground">School not found.</p>;
  }

  return <MessagesModule schoolId={schoolId} isStudentPortal={false} />;
}
