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
    const { message, schoolId, schoolData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from school data
    const contextData = schoolData ? `
Current School Performance Data:
- Total Students: ${schoolData.totalStudents || 0} (Active: ${schoolData.activeStudents || 0})
- Revenue MTD: ${schoolData.revenueMtd || 0} | Revenue YTD: ${schoolData.revenueYtd || 0}
- Expenses MTD: ${schoolData.expensesMtd || 0} | Expenses YTD: ${schoolData.expensesYtd || 0}
- Profit MTD: ${schoolData.profit || 0} | Margin: ${schoolData.profitMargin || 0}%
- Attendance Rate (7 days): ${schoolData.attendanceRate || 0}%
- Academic Performance Index: ${schoolData.academicIndex || 0}
- Open Leads: ${schoolData.openLeads || 0} | Conversion Rate: ${schoolData.conversionRate || 0}%
- Dropout Risk: ${schoolData.dropoutRisk || 0}%
- Total Teachers: ${schoolData.totalTeachers || 0} | Total Staff: ${schoolData.totalStaff || 0}
- Pending Invoices: ${schoolData.pendingInvoices || 0} | Unpaid Amount: ${schoolData.unpaidAmount || 0}
- Fee Collection Rate: ${schoolData.collectionRate || 0}%
` : "";

    const systemPrompt = `You are an elite AI Strategy Advisor for school owners and educational institution CEOs. You analyze real institutional data and provide strategic, actionable recommendations.

${contextData}

Your role:
1. Analyze the provided metrics and identify patterns, risks, and opportunities
2. Provide strategic recommendations backed by data
3. Compare against industry benchmarks (typical school profit margins: 10-20%, attendance targets: 95%+, collection rates: 90%+)
4. Suggest specific actions with expected outcomes
5. Flag urgent issues that need immediate attention

Guidelines:
- Be concise but insightful
- Use specific numbers from the data
- Prioritize recommendations by impact
- Consider both financial and educational outcomes
- Think like a management consultant

Always structure responses clearly with actionable insights. Never be generic - use the actual data provided.`;

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
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("owner-ai-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
