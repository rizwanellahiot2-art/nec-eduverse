import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChildInfo {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  class_name: string | null;
  section_name: string | null;
}

export function useMyChildren(schoolId: string | null) {
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const fetchChildren = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get student IDs for this parent
        const { data: studentIds, error: rpcError } = await supabase
          .rpc("my_children", { _school_id: schoolId });

        if (rpcError) throw rpcError;

        if (!studentIds || studentIds.length === 0) {
          setChildren([]);
          setLoading(false);
          return;
        }

        // Fetch student details with enrollment info
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds);

        if (studentsError) throw studentsError;

        // Fetch active enrollments
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("student_enrollments")
          .select("student_id, class_section_id")
          .in("student_id", studentIds)
          .is("end_date", null)
          .order("start_date", { ascending: false });

        if (enrollmentsError) throw enrollmentsError;

        // Get unique section IDs
        const sectionIds = [...new Set(enrollments?.map((e) => e.class_section_id) || [])];

        // Fetch sections
        const { data: sections, error: sectionsError } = await supabase
          .from("class_sections")
          .select("id, name, class_id")
          .in("id", sectionIds);

        if (sectionsError) throw sectionsError;

        // Fetch classes
        const classIds = [...new Set(sections?.map((s) => s.class_id) || [])];
        const { data: classes, error: classesError } = await supabase
          .from("academic_classes")
          .select("id, name")
          .in("id", classIds);

        if (classesError) throw classesError;

        // Build lookup maps
        const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);
        const sectionMap = new Map(
          sections?.map((s) => [s.id, { name: s.name, class_id: s.class_id }]) || []
        );
        const enrollmentMap = new Map(
          enrollments?.map((e) => [e.student_id, e.class_section_id]) || []
        );

        // Build final child info
        const childInfos: ChildInfo[] = (students || []).map((s) => {
          const sectionId = enrollmentMap.get(s.id);
          const section = sectionId ? sectionMap.get(sectionId) : null;
          const className = section ? classMap.get(section.class_id) : null;

          return {
            student_id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            class_name: className || null,
            section_name: section?.name || null,
          };
        });

        setChildren(childInfos);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch children");
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [schoolId]);

  return { children, loading, error };
}
