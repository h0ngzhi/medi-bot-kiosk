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
  age?: number; // Age in years for age-adjusted thresholds
  gender?: 'male' | 'female'; // Gender for gender-adjusted thresholds
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

    // Build health context with age and gender-adjusted thresholds
    const healthContext = buildHealthContext(healthData);
    
    // Build prompt for AI with age and gender-adjusted guidelines
    const ageContext = healthData.age 
      ? `The user is ${healthData.age} years old.${healthData.age >= 65 ? " As a senior (65+), slightly elevated blood pressure may be acceptable." : ""}`
      : "User age is unknown, use standard adult thresholds.";
    
    const genderContext = healthData.gender
      ? `The user is ${healthData.gender}.`
      : "User gender is unknown.";

    const systemPrompt = `You are a health programme recommendation assistant for a Singapore community health kiosk serving elderly users.

Based on the user's health screening results, recommend the most relevant community programmes from the available list.

${ageContext}
${genderContext}

Guidelines:
- Prioritize programmes that address the user's specific health concerns
- Consider programmes for active ageing, chronic disease management, and mental wellness
- For blood pressure classification (age-adjusted):
  * For adults under 65: High if systolic >= 140 or diastolic >= 90
  * For seniors 65+: High if systolic >= 150 or diastolic >= 90 (slightly relaxed threshold)
  * For all ages: Elevated if systolic 120-139 or diastolic 80-89
- If blood pressure is high, recommend hypertension/heart health programmes
- For BMI classification (Asian WHO standards, gender-considered):
  * For males: Normal 18.5-22.9, At Risk 23-24.9, Overweight 25-29.9, Obese >= 30
  * For females: Normal 18.5-22.9, At Risk 23-24.9 (women may have slightly lower healthy range)
  * For elderly 65+: Slightly higher BMI (23-27) may be protective
  * Underweight < 18.5 for all
- If BMI is high (>= 25 for Asians), recommend exercise, nutrition, or weight management programmes
- If BMI is low (< 18.5), recommend nutrition programmes
- Consider gender-appropriate activities when recommending programmes
- Always include at least 1-2 general wellness programmes for variety
- Maximum 3 recommendations
- Be encouraging and positive in your reasoning

Respond in ${getLanguageName(language)}.

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "recommendations": [
    {
      "programme_id": "the-programme-uuid",
      "reason": "A short, encouraging explanation of why this programme is recommended (1-2 sentences)",
      "priority": 1
    }
  ],
  "summary": "A brief encouraging summary about the user's health and the recommendations (1-2 sentences)"
}`;

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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Calling Gemini API...");

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\n" + userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log("Gemini response received");

    // Extract the text content from Gemini response
    const responseText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("No response from Gemini");
    }

    // Parse the JSON from the response (might be wrapped in markdown code blocks)
    let aiRecommendations;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiRecommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      // Return default recommendations if parsing fails
      const defaultRecs = programmes.slice(0, 3).map((p, i) => ({
        ...p,
        reason: "Recommended for general wellness and community engagement.",
        priority: i + 1
      }));
      return new Response(
        JSON.stringify({
          recommendations: defaultRecs,
          summary: "Based on your health screening, we recommend staying active with community programmes."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Enrich recommendations with full programme data
    const enrichedRecommendations = (aiRecommendations.recommendations || [])
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

    // If no valid recommendations found, return defaults
    if (enrichedRecommendations.length === 0) {
      const defaultRecs = programmes.slice(0, 3).map((p, i) => ({
        ...p,
        reason: "Recommended for general wellness and community engagement.",
        priority: i + 1
      }));
      return new Response(
        JSON.stringify({
          recommendations: defaultRecs,
          summary: aiRecommendations.summary || "Based on your health screening, we recommend staying active with community programmes."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

// Calculate age from date of birth
function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Get age-adjusted BP status
function getBpStatus(systolic: number, diastolic: number, age?: number): string {
  const isSenior = age !== undefined && age >= 65;
  
  // Age-adjusted thresholds for seniors 65+
  const highSystolic = isSenior ? 150 : 140;
  const highDiastolic = 90; // Same for all ages
  
  if (systolic >= highSystolic || diastolic >= highDiastolic) {
    return "High";
  } else if (systolic >= 120 || diastolic >= 80) {
    return "Elevated";
  }
  return "Normal";
}

function buildHealthContext(data: HealthData): string {
  const parts: string[] = [];
  
  // Add age if available
  if (data.age !== undefined) {
    parts.push(`Age: ${data.age} years${data.age >= 65 ? " (Senior)" : ""}`);
  }
  
  // Add gender if available
  if (data.gender) {
    parts.push(`Gender: ${data.gender.charAt(0).toUpperCase() + data.gender.slice(1)}`);
  }
  
  if (data.systolic !== undefined && data.diastolic !== undefined) {
    const bpStatus = getBpStatus(data.systolic, data.diastolic, data.age);
    const thresholdNote = data.age !== undefined && data.age >= 65 
      ? " [Age-adjusted: 150/90 threshold for seniors]" 
      : "";
    parts.push(`Blood Pressure: ${data.systolic}/${data.diastolic} mmHg (${bpStatus})${thresholdNote}`);
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
    // Use Asian BMI thresholds (WHO Asia-Pacific) with gender consideration
    const bmiStatus = data.bmi >= 30 ? "Obese" :
                      data.bmi >= 25 ? "Overweight" :
                      data.bmi >= 23 ? "At Risk" :
                      data.bmi < 18.5 ? "Underweight" : "Normal";
    const genderNote = data.gender ? ` [${data.gender === 'female' ? 'Female' : 'Male'} Asian thresholds]` : " [Asian thresholds]";
    parts.push(`BMI: ${data.bmi} (${bmiStatus})${genderNote}`);
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
