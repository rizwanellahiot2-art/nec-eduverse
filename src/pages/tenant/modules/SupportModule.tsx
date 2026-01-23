import { SupportInbox } from "@/pages/tenant/modules/components/SupportInbox";

export function SupportModule({ schoolId }: { schoolId: string }) {
  return <SupportInbox schoolId={schoolId} />;
}
