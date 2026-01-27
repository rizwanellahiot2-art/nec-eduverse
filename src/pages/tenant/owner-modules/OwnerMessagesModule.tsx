import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

interface Props {
  schoolId: string | null;
}

export function OwnerMessagesModule({ schoolId }: Props) {
  if (!schoolId) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return <MessagesModule schoolId={schoolId} isStudentPortal={false} />;
}
