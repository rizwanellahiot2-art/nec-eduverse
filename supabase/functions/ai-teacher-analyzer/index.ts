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
    const { schoolId, teacherUserId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch teacher-specific data
    const [
      assignmentsRes,
      sessionsRes,
      marksRes,
      homeworkRes,
      behaviorRes,
    ] = await Promise.all([
      supabase.from("teacher_assignments")
        .select("class_section_id, subject_id")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", teacherUserId),
      supabase.from("attendance_sessions")
        .select("id, class_section_id, attendance_entries(status)")
        .eq("school_id", schoolId)
        .eq("created_by", teacherUserId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("student_marks")
        .select("marks, academic_assessments(max_marks, teacher_user_id)")
        .eq("school_id", schoolId)
        .not("marks", "is", null),
      supabase.from("homework")
        .select("id, status")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", teacherUserId),
      supabase.from("behavior_notes")
        .select("note_type, student_id")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", teacherUserId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const assignments = assignmentsRes.data || [];
    const sessions = sessionsRes.data || [];
    const allMarks = marksRes.data || [];
    const homework = homeworkRes.data || [];
    const behavior = behaviorRes.data || [];

    // Filter marks for this teacher
    const teacherMarks = allMarks.filter((m: any) => m.academic_assessments?.teacher_user_id === teacherUserId);

    // Calculate metrics
    const classesAssigned = assignments.length;
    const sessionsCreated = sessions.length;
    
    // Attendance impact - how many students present in teacher's sessions
    let totalEntries = 0;
    let presentEntries = 0;
    sessions.forEach((s: any) => {
      const entries = s.attendance_entries || [];
      totalEntries += entries.length;
      presentEntries += entries.filter((e: any) => e.status === "present" || e.status === "late").length;
    });
    const attendanceImpact = totalEntries > 0 ? (presentEntries / totalEntries) * 100 : 0;

    // Student improvement (average marks)
    const avgMark = teacherMarks.length > 0
      ? teacherMarks.reduce((sum: number, m: any) => sum + (m.marks / (m.academic_assessments?.max_marks || 100)) * 100, 0) / teacherMarks.length
      : 0;

    // Homework completion
    const homeworkCount = homework.length;
    const activeHomework = homework.filter(h => h.status === "active").length;

    // Behavior engagement
    const positiveBehavior = behavior.filter(b => b.note_type === "praise" || b.note_type === "positive").length;
    const uniqueStudents = new Set(behavior.map(b => b.student_id)).size;

    const contextData = `
Teacher Performance Analysis:

WORKLOAD:
- Classes Assigned: ${classesAssigned}
- Attendance Sessions (30 days): ${sessionsCreated}
- Homework Assigned: ${homeworkCount}
- Active Homework: ${activeHomework}

STUDENT OUTCOMES:
- Average Student Score: ${avgMark.toFixed(1)}%
- Attendance Rate in Classes: ${attendanceImpact.toFixed(1)}%

ENGAGEMENT:
- Behavior Notes Written: ${behavior.length}
- Positive Notes: ${positiveBehavior}
- Unique Students Engaged: ${uniqueStudents}
`;

    const systemPrompt = `You are an AI teacher performance analyst. Evaluate the teacher based on the provided metrics.

Return a JSON object with this structure:
{
  "overall_score": 0-100,
  "student_improvement_score": 0-100,
  "engagement_score": 0-100,
  "attendance_impact_score": 0-100,
  "feedback_sentiment_score": 0-100,
  "performance_tier": "top" | "above_average" | "average" | "needs_improvement" | "critical",
  "needs_training": true/false,
  "subject_difficulty_rating": "easy" | "moderate" | "challenging",
  "ai_insights": ["3-5 key insights about performance"],
  "improvement_areas": ["specific areas for improvement"],
  "strengths": ["teacher's key strengths"],
  "recommended_training": ["specific training recommendations if needed"]
}

Consider:
1. Higher session count shows active engagement
2. Student marks improvement indicates teaching quality
3. Attendance in classes reflects teacher effectiveness
4. Positive behavior notes show student relationships
5. Homework creation shows curriculum engagement

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
    
    let performanceData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      performanceData = JSON.parse(jsonStr.trim());
    } catch {
      performanceData = { error: "Failed to parse AI response" };
    }

    // Save the analysis
    if (performanceData && !performanceData.error) {
      const analysisMonth = new Date().toISOString().slice(0, 7) + "-01";
      await supabase.from("ai_teacher_performance").upsert({
        school_id: schoolId,
        teacher_user_id: teacherUserId,
        analysis_month: analysisMonth,
        overall_score: performanceData.overall_score || 0,
        student_improvement_score: performanceData.student_improvement_score || 0,
        engagement_score: performanceData.engagement_score || 0,
        attendance_impact_score: performanceData.attendance_impact_score || 0,
        feedback_sentiment_score: performanceData.feedback_sentiment_score || 0,
        performance_tier: performanceData.performance_tier || "average",
        needs_training: performanceData.needs_training || false,
        subject_difficulty_rating: performanceData.subject_difficulty_rating || "moderate",
        ai_insights: performanceData.ai_insights || [],
        improvement_areas: performanceData.improvement_areas || [],
      }, { onConflict: "school_id,teacher_user_id,analysis_month" });
    }

    return new Response(JSON.stringify({ success: true, performanceData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-teacher-analyzer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
