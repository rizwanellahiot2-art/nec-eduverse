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
    const { schoolId, constraints } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch school data
    const [
      sectionsRes,
      subjectsRes,
      teachersRes,
      periodsRes,
      assignmentsRes,
    ] = await Promise.all([
      supabase.from("class_sections")
        .select("id, name, room, class_id, academic_classes(name)")
        .eq("school_id", schoolId),
      supabase.from("subjects")
        .select("id, name, periods_per_week")
        .eq("school_id", schoolId),
      supabase.from("user_roles")
        .select("user_id, profiles(display_name)")
        .eq("school_id", schoolId)
        .eq("role", "teacher"),
      supabase.from("timetable_periods")
        .select("*")
        .eq("school_id", schoolId)
        .order("sort_order"),
      supabase.from("teacher_assignments")
        .select("teacher_user_id, class_section_id, subject_id")
        .eq("school_id", schoolId),
    ]);

    const sections = sectionsRes.data || [];
    const subjects = subjectsRes.data || [];
    const teachers = teachersRes.data || [];
    const periods = periodsRes.data || [];
    const assignments = assignmentsRes.data || [];

    const contextData = `
School Timetable Generation Request:

SECTIONS (${sections.length}):
${sections.map((s: any) => `- ${s.academic_classes?.name} ${s.name} (Room: ${s.room || 'TBD'})`).join("\n")}

SUBJECTS (${subjects.length}):
${subjects.map((s: any) => `- ${s.name} (${s.periods_per_week || 5} periods/week)`).join("\n")}

TEACHERS (${teachers.length}):
${teachers.map((t: any) => `- ${t.profiles?.display_name || t.user_id}`).join("\n")}

PERIODS PER DAY (${periods.length}):
${periods.map(p => `- ${p.label}: ${p.start_time} - ${p.end_time}`).join("\n")}

EXISTING ASSIGNMENTS:
${assignments.slice(0, 20).map(a => `- Teacher ${a.teacher_user_id} teaches in section ${a.class_section_id}`).join("\n")}

CONSTRAINTS:
- Max classes per teacher per day: ${constraints?.maxClassesPerTeacher || 6}
- Include breaks: ${constraints?.includeBreaks !== false}
- Days: Monday to Friday
- Avoid teacher double-booking
- Balance subjects across the week
`;

    const systemPrompt = `You are an expert timetable generator for schools. Create an optimized, clash-free timetable based on the provided data.

Return a JSON object with this structure:
{
  "timetable": [
    {
      "section_id": "uuid",
      "day": "monday" | "tuesday" | "wednesday" | "thursday" | "friday",
      "period_index": 0-7,
      "subject_name": "Math",
      "teacher_id": "uuid or null",
      "room": "Room 101"
    }
  ],
  "conflicts_found": 0,
  "optimization_score": 0-100,
  "notes": ["Any important notes about the generated timetable"]
}

Rules:
1. No teacher should be in two classes at the same time
2. No room should be double-booked
3. Distribute subjects evenly across the week
4. Consider teacher workload balance
5. Keep related subjects in logical order (e.g., Math before Physics)

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    let timetableData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      timetableData = JSON.parse(jsonStr.trim());
    } catch {
      timetableData = { error: "Failed to parse AI response", raw: content };
    }

    // Save the suggestion
    if (timetableData && !timetableData.error) {
      await supabase.from("ai_timetable_suggestions").insert({
        school_id: schoolId,
        suggestion_data: timetableData,
        conflicts_found: timetableData.conflicts_found || 0,
        optimization_score: timetableData.optimization_score || 0,
        status: "draft",
      });
    }

    return new Response(JSON.stringify({ success: true, timetableData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-timetable-generator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
