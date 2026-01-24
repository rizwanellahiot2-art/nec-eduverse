import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

export function StudentMessagesModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  if (tenant.status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (tenant.status === "error" || !schoolId) {
    return <p className="text-sm text-muted-foreground">School not found.</p>;
  }

  return <MessagesModule schoolId={schoolId} isStudentPortal={true} />;
}
