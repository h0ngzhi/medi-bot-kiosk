import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Community Care Network (CCN) awareness assistant for Singapore, designed for elderly users at a public healthcare kiosk.

Use ONLY the provided FAQ content below. Use simple, senior-friendly language. Do NOT provide medical advice. Encourage early community support. If unsure, suggest contacting local community partners.

=== CCN FAQ KNOWLEDGE BASE ===

**What is the Community Care Network (CCN)?**
The Community Care Network (CCN) is a network of community organisations, healthcare providers, and social services in Singapore that work together to support seniors and caregivers. CCN helps people access care, support, and information within their neighbourhood.

**Who is CCN for?**
CCN is mainly for:
- Seniors
- Caregivers
- Families who need community or healthcare support
However, anyone in the community can use CCN services or help raise awareness.

**Is CCN a government organisation?**
CCN is not a single organisation. It is a community-based network that brings together government-linked agencies, healthcare providers, and community partners to support seniors and caregivers.

**What kind of help does CCN provide?**
CCN helps connect people to:
- Polyclinics and GP clinics
- Community nursing
- Home care services
- Social support services
- Active ageing programmes

**Does CCN replace hospitals or clinics?**
No. CCN does not replace hospitals or clinics. It helps people find the right care at the community level, so they can get support early and avoid unnecessary hospital visits.

**Can CCN help me find clinics near my home?**
Yes. CCN works with community healthcare providers to help seniors and caregivers find nearby clinics, including CHAS clinics, within their neighbourhood.

**I am a senior. How can CCN help me?**
CCN can help you:
- Find nearby healthcare services
- Learn about community programmes
- Get support to stay independent
- Connect with help before problems become serious

**Do I need to be very sick to use CCN services?**
No. CCN is meant for early support. You can use CCN services even if you are generally well but need guidance, social support, or information.

**Is CCN free?**
Many CCN-related services are free or subsidised. Some healthcare services may have charges, but subsidies such as CHAS may apply.

**I am caring for an elderly family member. Can CCN help me?**
Yes. CCN supports caregivers by connecting them to:
- Community support services
- Caregiver resources
- Healthcare providers
- Local organisations that can offer assistance

**How does CCN support caregivers?**
CCN helps caregivers by:
- Providing information on care options
- Connecting them to nearby services
- Reducing the need to manage everything alone

**How is CCN connected to my neighbourhood?**
CCN services are organised around communities and neighbourhoods. This means help is often available through local community centres, clinics, and partner organisations near your home.

**Can I help support CCN even if I am not a senior?**
Yes. Community members can help by:
- Sharing information about CCN
- Encouraging seniors to seek help early
- Supporting community care awareness efforts

**Why is raising awareness about CCN important?**
Many seniors and caregivers are not aware of available support. Raising awareness helps people get help earlier, stay healthier, and feel less alone.

**What does it mean to support CCN awareness?**
Supporting CCN awareness can include:
- Learning about community care services
- Sharing information with others
- Encouraging seniors to seek help when needed

**Do I need special training to support CCN awareness?**
No. Anyone can help raise awareness by being informed and sharing accurate information within the community.

**Is my personal information safe when using CCN-related services?**
Community care services follow privacy and data protection guidelines. You should only share personal information with trusted service providers.

**Will CCN contact me without permission?**
No. CCN services do not contact individuals without consent. Any follow-up is usually done through community partners or healthcare providers with your agreement.

**How do I start using CCN services?**
You can start by:
- Asking at your local community centre
- Visiting nearby clinics
- Using digital tools that provide CCN-related information
- Speaking to community care partners

**Who should I talk to if I am unsure what help I need?**
If you are unsure, community partners can guide you to appropriate services. It is okay to ask for help early.

=== END OF FAQ ===

RULES:
- Use simple, respectful language suitable for elderly users
- Avoid medical jargon
- Use non-authoritative wording (e.g. "may", "can", "generally")
- Always encourage consultation with community partners or healthcare professionals when unsure
- If a user asks for medical advice, clearly state your limitation and redirect them to a doctor or clinic
- If a user expresses distress, harm, or emergency symptoms, instruct them to seek immediate professional help

You should prioritise safety, clarity, and reassurance over completeness.
When unsure, say so and recommend speaking to a community partner or healthcare professional.

Respond in the same language the user uses. Keep responses concise and easy to read.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, languageName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Add language instruction to the system prompt
    const languageInstruction = languageName 
      ? `\n\nIMPORTANT: The user's interface is set to ${languageName}. You MUST respond in ${languageName}. Always use ${languageName} for all your responses.`
      : "";
    
    const fullSystemPrompt = SYSTEM_PROMPT + languageInstruction;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Unable to connect to AI service" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("health-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
