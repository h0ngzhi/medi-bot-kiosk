import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthData {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  height?: number;
  weight?: number;
  bmi?: number;
}

interface Programme {
  id: string;
  title: string;
  description: string;
  category: string;
  event_date: string;
  event_time: string;
  location: string;
  is_online: boolean;
  languages: string[];
  conducted_by: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { healthData, language = "en" } = await req.json() as { healthData: HealthData; language?: string };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch upcoming active programmes
    const now = new Date().toISOString();
    const { data: programmes, error: progError } = await supabase
      .from("community_programmes")
      .select("id, title, description, category, event_date, event_time, location, is_online, languages, conducted_by")
      .eq("is_active", true)
      .gte("event_date", now.split("T")[0])
      .order("event_date", { ascending: true })
      .limit(20);

    if (progError) {
      console.error("Error fetching programmes:", progError);
      throw new Error("Failed to fetch programmes");
    }

    if (!programmes || programmes.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [], message: "No upcoming programmes available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build health context
    const healthContext = buildHealthContext(healthData);
    
    // Build prompt for AI
    const systemPrompt = `You are a health programme recommendation assistant for a Singapore community health kiosk serving elderly users.

Based on the user's health screening results, recommend the most relevant community programmes from the available list.

Guidelines:
- Prioritize programmes that address the user's specific health concerns
- Consider programmes for active ageing, chronic disease management, and mental wellness
- If blood pressure is high (systolic >= 140 or diastolic >= 90), recommend hypertension/heart health programmes
- If BMI is high (>= 25), recommend exercise, nutrition, or weight management programmes
- If BMI is low (< 18.5), recommend nutrition programmes
- Always include at least 1-2 general wellness programmes for variety
- Maximum 3 recommendations
- Be encouraging and positive in your reasoning

Respond in ${getLanguageName(language)}.`;

    const userPrompt = `User's Latest Health Screening Results:
${healthContext}

Available Community Programmes:
${JSON.stringify(programmes.map(p => ({
  id: p.id,
  title: p.title,
  description: p.description,
  category: p.category,
  date: p.event_date,
  time: p.event_time,
  location: p.is_online ? "Online" : p.location
})), null, 2)}

Please recommend the most suitable programmes and explain why each is beneficial for this user.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_programmes",
              description: "Return recommended programmes with reasons",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        programme_id: { type: "string", description: "The ID of the recommended programme" },
                        reason: { type: "string", description: "A short, encouraging explanation of why this programme is recommended (1-2 sentences)" },
                        priority: { type: "number", description: "Priority ranking 1-3, where 1 is most relevant" }
                      },
                      required: ["programme_id", "reason", "priority"],
                      additionalProperties: false
                    },
                    maxItems: 3
                  },
                  summary: { type: "string", description: "A brief encouraging summary about the user's health and the recommendations (1-2 sentences)" }
                },
                required: ["recommendations", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_programmes" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI recommendation failed");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "recommend_programmes") {
      throw new Error("Invalid AI response format");
    }

    const aiRecommendations = JSON.parse(toolCall.function.arguments);
    
    // Enrich recommendations with full programme data
    const enrichedRecommendations = aiRecommendations.recommendations
      .map((rec: { programme_id: string; reason: string; priority: number }) => {
        const programme = programmes.find(p => p.id === rec.programme_id);
        if (!programme) return null;
        return {
          ...programme,
          reason: rec.reason,
          priority: rec.priority
        };
      })
      .filter(Boolean)
      .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority);

    return new Response(
      JSON.stringify({
        recommendations: enrichedRecommendations,
        summary: aiRecommendations.summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildHealthContext(data: HealthData): string {
  const parts: string[] = [];
  
  if (data.systolic !== undefined && data.diastolic !== undefined) {
    const bpStatus = data.systolic >= 140 || data.diastolic >= 90 ? "High" : 
                     data.systolic >= 120 || data.diastolic >= 80 ? "Elevated" : "Normal";
    parts.push(`Blood Pressure: ${data.systolic}/${data.diastolic} mmHg (${bpStatus})`);
  }
  
  if (data.pulse !== undefined) {
    parts.push(`Pulse: ${data.pulse} bpm`);
  }
  
  if (data.height !== undefined) {
    parts.push(`Height: ${data.height} cm`);
  }
  
  if (data.weight !== undefined) {
    parts.push(`Weight: ${data.weight} kg`);
  }
  
  if (data.bmi !== undefined) {
    const bmiStatus = data.bmi >= 30 ? "Obese" :
                      data.bmi >= 25 ? "Overweight" :
                      data.bmi < 18.5 ? "Underweight" : "Normal";
    parts.push(`BMI: ${data.bmi} (${bmiStatus})`);
  }
  
  return parts.join("\n");
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: "English",
    zh: "Chinese (Simplified)",
    ms: "Malay",
    ta: "Tamil"
  };
  return languages[code] || "English";
}
