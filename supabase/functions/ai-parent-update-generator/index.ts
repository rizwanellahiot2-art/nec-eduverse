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
    const { studentId, schoolId, updateType = "daily" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine date range based on update type
    const now = new Date();
    let startDate: Date;
    if (updateType === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (updateType === "monthly") {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
    }

    // Fetch student data
    const [
      studentRes,
      attendanceRes,
      marksRes,
      behaviorRes,
      submissionsRes,
      guardiansRes,
    ] = await Promise.all([
      supabase.from("students").select("*, student_enrollments(class_section_id, class_sections(name, academic_classes(name)))").eq("id", studentId).single(),
      supabase.from("attendance_entries")
        .select("status, created_at, attendance_sessions(period_label)")
        .eq("student_id", studentId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("student_marks")
        .select("marks, created_at, academic_assessments(title, max_marks, subject_id, subjects(name))")
        .eq("student_id", studentId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("behavior_notes")
        .select("note_type, title, content, created_at")
        .eq("student_id", studentId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("assignment_submissions")
        .select("status, marks_obtained, assignments(title, max_marks)")
        .eq("student_id", studentId)
        .gte("submitted_at", startDate.toISOString()),
      supabase.from("student_guardians")
        .select("user_id")
        .eq("student_id", studentId),
    ]);

    const student = studentRes.data;
    const attendance = attendanceRes.data || [];
    const marks = marksRes.data || [];
    const behavior = behaviorRes.data || [];
    const submissions = submissionsRes.data || [];
    const guardians = guardiansRes.data || [];

    if (!student) {
      throw new Error("Student not found");
    }

    const studentName = `${student.first_name} ${student.last_name || ""}`.trim();
    const className = (student as any).student_enrollments?.[0]?.class_sections?.academic_classes?.name || "";
    const sectionName = (student as any).student_enrollments?.[0]?.class_sections?.name || "";

    // Calculate metrics
    const presentDays = attendance.filter((a: any) => a.status === "present").length;
    const lateDays = attendance.filter((a: any) => a.status === "late").length;
    const absentDays = attendance.filter((a: any) => a.status === "absent").length;
    const attendanceStatus = absentDays === 0 ? "Perfect" : absentDays <= 2 ? "Good" : "Needs Attention";

    const validMarks = marks.filter((m: any) => m.academic_assessments?.max_marks);
    const avgPercentage = validMarks.length > 0
      ? validMarks.reduce((sum: number, m: any) => sum + (m.marks / m.academic_assessments.max_marks) * 100, 0) / validMarks.length
      : null;

    const positiveBehavior = behavior.filter((b: any) => b.note_type === "praise" || b.note_type === "positive");
    const negativeBehavior = behavior.filter((b: any) => b.note_type === "warning" || b.note_type === "concern");

    const contextData = `
Parent Update for: ${studentName}
Class: ${className} ${sectionName}
Period: ${updateType === "daily" ? "Today" : updateType === "weekly" ? "This Week" : "This Month"}

ATTENDANCE:
- Present Days: ${presentDays}
- Late Arrivals: ${lateDays}
- Absences: ${absentDays}
- Status: ${attendanceStatus}

ACADEMIC PERFORMANCE:
- Assessments Taken: ${marks.length}
- Average Score: ${avgPercentage ? avgPercentage.toFixed(1) + "%" : "No assessments"}
- Recent Results: ${marks.slice(0, 3).map((m: any) => `${m.academic_assessments?.title}: ${m.marks}/${m.academic_assessments?.max_marks}`).join(", ") || "None"}

BEHAVIOR:
- Positive Notes: ${(positiveBehavior as any[]).length}
- Concerns: ${(negativeBehavior as any[]).length}
- Recent Notes: ${behavior.slice(0, 2).map((b: any) => b.title || b.content?.slice(0, 50)).join("; ") || "None"}

ASSIGNMENTS:
- Completed: ${submissions.filter((s: any) => s.status === "graded" || s.status === "submitted").length}
- Pending: ${submissions.filter((s: any) => s.status === "pending" || s.status === "missing").length}
`;

    const systemPrompt = `You are a caring school communication assistant creating parent updates. Write a warm, informative update for parents.

Return a JSON object with this structure:
{
  "ai_summary": "A warm 2-3 sentence summary of how their child is doing",
  "focus_trend": "improving" | "stable" | "needs_attention",
  "performance_change_percent": number (-100 to 100, 0 if no change),
  "key_insights": ["3-4 key points parents should know"],
  "recommendations": ["1-2 actionable suggestions for parents"],
  "participation_level": "excellent" | "good" | "moderate" | "low",
  "celebration_moment": "Something positive to highlight (or null)",
  "concern_areas": ["Any areas of concern (or empty array)"]
}

Tone guidelines:
1. Be warm and supportive, not clinical
2. Start with positives before concerns
3. Be specific with examples
4. Encourage parent involvement
5. Never be alarmist

Return ONLY valid JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextData },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    let updateData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      updateData = JSON.parse(jsonStr.trim());
    } catch {
      updateData = { 
        ai_summary: "Your child had a productive day at school.",
        focus_trend: "stable",
        key_insights: ["Regular attendance maintained"],
        recommendations: ["Continue supporting homework time"],
      };
    }

    // Save update for each guardian
    const savedUpdates = [];
    for (const guardian of guardians) {
      if (!guardian.user_id) continue;

      const { data: saved } = await supabase.from("ai_parent_updates").insert({
        school_id: schoolId,
        student_id: studentId,
        parent_user_id: guardian.user_id,
        update_type: updateType,
        update_date: now.toISOString().slice(0, 10),
        attendance_status: attendanceStatus,
        participation_level: updateData.participation_level || "good",
        teacher_notes: behavior.slice(0, 3).map((b: any) => b.content || b.title),
        behavior_remarks: (negativeBehavior as any[]).map((b: any) => b.content || b.title),
        ai_summary: updateData.ai_summary,
        focus_trend: updateData.focus_trend,
        performance_change_percent: updateData.performance_change_percent || 0,
        key_insights: updateData.key_insights || [],
        recommendations: updateData.recommendations || [],
      }).select().single();

      if (saved) savedUpdates.push(saved);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updateData,
      updates_created: savedUpdates.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-parent-update-generator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
