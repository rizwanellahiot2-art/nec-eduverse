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
    const { studentId, schoolId, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch comprehensive student data
    const [
      studentRes,
      attendanceRes,
      marksRes,
      behaviorRes,
      submissionsRes,
    ] = await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).single(),
      supabase.from("attendance_entries")
        .select("status, created_at, session_id")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(90),
      supabase.from("student_marks")
        .select("marks, assessment_id, created_at, academic_assessments(title, max_marks, subject_id)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("behavior_notes")
        .select("note_type, content, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("assignment_submissions")
        .select("status, submitted_at, marks_obtained, assignments(max_marks, due_date)")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(30),
    ]);

    const student = studentRes.data;
    const attendance = attendanceRes.data || [];
    const marks = marksRes.data || [];
    const behavior = behaviorRes.data || [];
    const submissions = submissionsRes.data || [];

    // Calculate attendance rate
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 100;

    // Calculate average marks
    const validMarks = marks.filter((m: any) => m.marks != null && m.academic_assessments?.max_marks);
    const avgPercentage = validMarks.length > 0
      ? validMarks.reduce((sum: number, m: any) => sum + (m.marks / m.academic_assessments.max_marks) * 100, 0) / validMarks.length
      : 0;

    // Calculate late submission ratio
    const lateSubmissions = submissions.filter((s: any) => {
      if (!s.assignments?.due_date || !s.submitted_at) return false;
      return new Date(s.submitted_at) > new Date(s.assignments.due_date);
    }).length;
    const lateRatio = submissions.length > 0 ? (lateSubmissions / submissions.length) * 100 : 0;

    // Analyze behavior patterns
    const positiveBehavior = behavior.filter(b => b.note_type === "praise" || b.note_type === "positive").length;
    const negativeBehavior = behavior.filter(b => b.note_type === "warning" || b.note_type === "concern").length;

    const contextData = `
Student Analysis Data:
- Name: ${student?.first_name} ${student?.last_name}
- Status: ${student?.status}
- Attendance Rate (last 90 days): ${attendanceRate.toFixed(1)}%
- Average Academic Performance: ${avgPercentage.toFixed(1)}%
- Late Submission Rate: ${lateRatio.toFixed(1)}%
- Positive Behavior Notes: ${positiveBehavior}
- Negative Behavior Notes: ${negativeBehavior}
- Total Assessments Taken: ${marks.length}
- Recent Behavior: ${behavior.slice(0, 3).map(b => b.content).join("; ")}
`;

    const systemPrompt = `You are an AI education analyst creating a digital twin profile for a student. Analyze the provided data and return a JSON object with the following structure:

{
  "learning_style": "visual" | "auditory" | "kinesthetic" | "reading_writing" | "unknown",
  "learning_style_confidence": 0-100,
  "strong_subjects": ["array of subjects"],
  "weak_subjects": ["array of subjects"],
  "attention_span_minutes": 15-60,
  "best_learning_time": "morning" | "midday" | "afternoon" | "evening",
  "risk_score": 0-100,
  "burnout_probability": 0-100,
  "dropout_risk": 0-100,
  "focus_drop_detected": true/false,
  "learning_speed": "slow" | "below_average" | "average" | "above_average" | "accelerated",
  "needs_extra_support": true/false,
  "needs_remedial_classes": true/false,
  "needs_counseling": true/false,
  "should_be_accelerated": true/false,
  "emotional_trend": "declining" | "stable" | "improving" | "concerning",
  "key_insights": ["array of 3-5 key insights"],
  "recommended_actions": ["array of specific recommended actions"]
}

Base your analysis on:
1. Attendance patterns - low attendance increases risk
2. Academic performance trends
3. Assignment submission patterns
4. Behavior notes sentiment
5. Overall engagement indicators

Be data-driven but also consider the whole picture. Return ONLY valid JSON.`;

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr.trim());
    } catch {
      analysis = { error: "Failed to parse AI response", raw: content };
    }

    // Upsert to ai_student_profiles
    if (analysis && !analysis.error) {
      await supabase.from("ai_student_profiles").upsert({
        school_id: schoolId,
        student_id: studentId,
        learning_style: analysis.learning_style || "unknown",
        learning_style_confidence: analysis.learning_style_confidence || 0,
        strong_subjects: analysis.strong_subjects || [],
        weak_subjects: analysis.weak_subjects || [],
        attention_span_minutes: analysis.attention_span_minutes || 45,
        best_learning_time: analysis.best_learning_time || "morning",
        risk_score: analysis.risk_score || 0,
        burnout_probability: analysis.burnout_probability || 0,
        dropout_risk: analysis.dropout_risk || 0,
        focus_drop_detected: analysis.focus_drop_detected || false,
        learning_speed: analysis.learning_speed || "average",
        needs_extra_support: analysis.needs_extra_support || false,
        needs_remedial_classes: analysis.needs_remedial_classes || false,
        needs_counseling: analysis.needs_counseling || false,
        should_be_accelerated: analysis.should_be_accelerated || false,
        emotional_trend: analysis.emotional_trend || "stable",
        last_analyzed_at: new Date().toISOString(),
      }, { onConflict: "school_id,student_id" });
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-student-analyzer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
