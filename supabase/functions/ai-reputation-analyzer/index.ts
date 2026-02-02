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

    // Fetch comprehensive school metrics
    const [
      studentsRes,
      attendanceRes,
      marksRes,
      leadsRes,
      invoicesRes,
      messagesRes,
      behaviorRes,
    ] = await Promise.all([
      supabase.from("students").select("id, status").eq("school_id", schoolId),
      supabase.from("attendance_entries")
        .select("status")
        .eq("school_id", schoolId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("student_marks")
        .select("marks, academic_assessments(max_marks)")
        .eq("school_id", schoolId)
        .not("marks", "is", null),
      supabase.from("crm_leads")
        .select("status, created_at")
        .eq("school_id", schoolId),
      supabase.from("finance_invoices")
        .select("status, total")
        .eq("school_id", schoolId),
      supabase.from("admin_messages")
        .select("priority, status, subject")
        .eq("school_id", schoolId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
      supabase.from("behavior_notes")
        .select("note_type")
        .eq("school_id", schoolId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const students = studentsRes.data || [];
    const attendance = attendanceRes.data || [];
    const marks = marksRes.data || [];
    const leads = leadsRes.data || [];
    const invoices = invoicesRes.data || [];
    const messages = messagesRes.data || [];
    const behavior = behaviorRes.data || [];

    // Calculate metrics
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === "enrolled" || s.status === "active").length;
    const studentSuccessRate = totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0;

    const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
    const attendanceConsistency = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;

    const validMarks = marks.filter((m: any) => m.academic_assessments?.max_marks);
    const academicPerformance = validMarks.length > 0
      ? validMarks.reduce((sum: number, m: any) => sum + (m.marks / m.academic_assessments.max_marks) * 100, 0) / validMarks.length
      : 0;

    const wonLeads = leads.filter(l => l.status === "won").length;
    const conversionRate = leads.length > 0 ? (wonLeads / leads.length) * 100 : 0;

    const paidInvoices = invoices.filter(i => i.status === "paid").length;
    const collectionRate = invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 0;

    const complaints = messages.filter(m => m.priority === "urgent" || m.subject?.toLowerCase().includes("complaint")).length;
    const complaintRatio = totalStudents > 0 ? (complaints / totalStudents) * 100 : 0;

    const positiveBehavior = behavior.filter(b => b.note_type === "praise" || b.note_type === "positive").length;
    const negativeBehavior = behavior.filter(b => b.note_type === "warning" || b.note_type === "concern").length;
    const engagementLevel = behavior.length > 0 ? ((positiveBehavior - negativeBehavior) / behavior.length + 1) * 50 : 50;

    const contextData = `
School Reputation Analysis Data:

STUDENT METRICS:
- Total Students: ${totalStudents}
- Active Students: ${activeStudents}
- Student Success Rate: ${studentSuccessRate.toFixed(1)}%

ACADEMIC PERFORMANCE:
- Average Academic Score: ${academicPerformance.toFixed(1)}%
- Attendance Consistency: ${attendanceConsistency.toFixed(1)}%

ADMISSIONS:
- Total Leads: ${leads.length}
- Conversion Rate: ${conversionRate.toFixed(1)}%

FINANCIAL:
- Collection Rate: ${collectionRate.toFixed(1)}%

ENGAGEMENT:
- Complaints (30 days): ${complaints}
- Complaint Ratio: ${complaintRatio.toFixed(2)}%
- Positive Behavior Notes: ${positiveBehavior}
- Negative Behavior Notes: ${negativeBehavior}
- Engagement Score: ${engagementLevel.toFixed(1)}
`;

    const systemPrompt = `You are an AI school reputation analyst. Analyze the provided metrics and generate a comprehensive reputation report.

Return a JSON object with this structure:
{
  "reputation_score": 0-100,
  "parent_satisfaction_index": 0-100,
  "nps_score": -100 to 100,
  "main_strengths": ["array of 3-5 key strengths"],
  "risk_factors": ["array of concerning areas"],
  "trust_factors": ["factors building parent trust"],
  "ai_recommendations": ["5-7 specific actionable recommendations"],
  "brand_sentiment": "positive" | "neutral" | "negative",
  "trend_direction": "improving" | "stable" | "declining",
  "priority_actions": ["top 3 immediate actions needed"],
  "competitive_positioning": "Brief analysis of market position"
}

Consider:
1. High attendance and academic scores improve reputation
2. High complaint ratio damages trust
3. Good collection rates indicate parent satisfaction
4. Conversion rates show market perception
5. Engagement levels reflect school culture

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
    
    let reputationData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      reputationData = JSON.parse(jsonStr.trim());
    } catch {
      reputationData = { error: "Failed to parse AI response" };
    }

    // Save the report
    if (reputationData && !reputationData.error) {
      const reportMonth = new Date().toISOString().slice(0, 7) + "-01";
      await supabase.from("ai_school_reputation").upsert({
        school_id: schoolId,
        report_month: reportMonth,
        reputation_score: reputationData.reputation_score || 0,
        parent_satisfaction_index: reputationData.parent_satisfaction_index || 0,
        main_strengths: reputationData.main_strengths || [],
        risk_factors: reputationData.risk_factors || [],
        trust_factors: reputationData.trust_factors || [],
        ai_recommendations: reputationData.ai_recommendations || [],
        attendance_consistency: attendanceConsistency,
        student_success_rate: studentSuccessRate,
        engagement_level: engagementLevel,
        complaint_ratio: complaintRatio,
        nps_score: reputationData.nps_score || 0,
      }, { onConflict: "school_id,report_month" });
    }

    return new Response(JSON.stringify({ success: true, reputationData, metrics: {
      attendanceConsistency,
      studentSuccessRate,
      academicPerformance,
      conversionRate,
      collectionRate,
      complaintRatio,
      engagementLevel,
    }}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-reputation-analyzer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
