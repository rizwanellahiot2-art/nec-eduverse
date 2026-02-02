import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schoolId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all students with their data
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, status")
      .eq("school_id", schoolId)
      .in("status", ["enrolled", "active"]);

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ success: true, warnings: [], message: "No active students found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const warnings: any[] = [];

    // Analyze each student
    for (const student of students.slice(0, 50)) { // Limit to 50 for performance
      const [attendanceRes, marksRes, submissionsRes, behaviorRes] = await Promise.all([
        supabase.from("attendance_entries")
          .select("status")
          .eq("student_id", student.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("student_marks")
          .select("marks, academic_assessments(max_marks)")
          .eq("student_id", student.id)
          .not("marks", "is", null)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("assignment_submissions")
          .select("status")
          .eq("student_id", student.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("behavior_notes")
          .select("note_type")
          .eq("student_id", student.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const attendance = attendanceRes.data || [];
      const marks = marksRes.data || [];
      const submissions = submissionsRes.data || [];
      const behavior = behaviorRes.data || [];

      // Calculate risk indicators
      const totalAttendance = attendance.length;
      const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
      const absentCount = attendance.filter((a: any) => a.status === "absent").length;
      const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 100;

      const validMarks = marks.filter((m: any) => m.academic_assessments?.max_marks);
      const avgPercentage = validMarks.length > 0
        ? validMarks.reduce((sum: number, m: any) => sum + (m.marks / m.academic_assessments.max_marks) * 100, 0) / validMarks.length
        : 0;

      const missingSubmissions = submissions.filter((s: any) => s.status === "missing" || s.status === "not_submitted").length;
      const negativeBehavior = behavior.filter((b: any) => b.note_type === "warning" || b.note_type === "concern").length;

      const studentName = `${student.first_name} ${student.last_name || ""}`.trim();

      // Dropout Risk Check
      if (attendanceRate < 70 || absentCount > 10) {
        warnings.push({
          student_id: student.id,
          student_name: studentName,
          warning_type: "dropout_risk",
          severity: attendanceRate < 50 ? "critical" : attendanceRate < 60 ? "high" : "medium",
          title: `Dropout Risk: ${studentName}`,
          description: `Attendance rate is ${attendanceRate.toFixed(0)}% with ${absentCount} absences in the last 30 days.`,
          detected_patterns: [
            `Attendance rate: ${attendanceRate.toFixed(0)}%`,
            `Absences: ${absentCount}`,
          ],
          recommended_actions: [
            "Schedule parent meeting",
            "Assign a mentor teacher",
            "Review home situation",
          ],
        });
      }

      // Academic Decline Check
      if (validMarks.length >= 3 && avgPercentage < 40) {
        warnings.push({
          student_id: student.id,
          student_name: studentName,
          warning_type: "academic_decline",
          severity: avgPercentage < 30 ? "critical" : "high",
          title: `Academic Decline: ${studentName}`,
          description: `Average performance has dropped to ${avgPercentage.toFixed(0)}%.`,
          detected_patterns: [
            `Current average: ${avgPercentage.toFixed(0)}%`,
            `Assessments analyzed: ${validMarks.length}`,
          ],
          recommended_actions: [
            "Provide remedial classes",
            "Assign peer tutor",
            "Review learning style",
          ],
        });
      }

      // Emotional Stress Check
      if (negativeBehavior >= 3) {
        warnings.push({
          student_id: student.id,
          student_name: studentName,
          warning_type: "emotional_stress",
          severity: negativeBehavior >= 5 ? "high" : "medium",
          title: `Emotional Concern: ${studentName}`,
          description: `${negativeBehavior} concerning behavior notes in the last 30 days.`,
          detected_patterns: [
            `Negative behavior notes: ${negativeBehavior}`,
          ],
          recommended_actions: [
            "Schedule counseling session",
            "Inform parents",
            "Monitor closely",
          ],
        });
      }

      // Engagement Drop Check
      if (missingSubmissions >= 3) {
        warnings.push({
          student_id: student.id,
          student_name: studentName,
          warning_type: "engagement_drop",
          severity: missingSubmissions >= 5 ? "high" : "medium",
          title: `Engagement Drop: ${studentName}`,
          description: `${missingSubmissions} missing or late submissions in the last 30 days.`,
          detected_patterns: [
            `Missing submissions: ${missingSubmissions}`,
          ],
          recommended_actions: [
            "Check with class teacher",
            "Review workload",
            "Contact parents",
          ],
        });
      }
    }

    // Save warnings to database
    for (const warning of warnings) {
      // Check if similar warning already exists
      const { data: existing } = await supabase
        .from("ai_early_warnings")
        .select("id")
        .eq("school_id", schoolId)
        .eq("student_id", warning.student_id)
        .eq("warning_type", warning.warning_type)
        .eq("status", "active")
        .maybeSingle();

      if (!existing) {
        await supabase.from("ai_early_warnings").insert({
          school_id: schoolId,
          student_id: warning.student_id,
          warning_type: warning.warning_type,
          severity: warning.severity,
          title: warning.title,
          description: warning.description,
          detected_patterns: warning.detected_patterns,
          recommended_actions: warning.recommended_actions,
          status: "active",
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      warnings_generated: warnings.length,
      warnings: warnings.slice(0, 20), // Return top 20 for UI
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-early-warning error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
