import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthData {
  type: 'bp' | 'weight';
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  age?: number;
  gender?: 'male' | 'female';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { healthData } = await req.json() as { healthData: HealthData };

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build context based on screening type
    let prompt = '';
    
    if (healthData.type === 'bp') {
      prompt = `You are a medical assessment AI. Analyze these blood pressure readings and determine severity.

Patient Info:
- Age: ${healthData.age ?? 'Unknown'} years old
- Gender: ${healthData.gender ?? 'Unknown'}
- Systolic: ${healthData.systolic} mmHg
- Diastolic: ${healthData.diastolic} mmHg
- Pulse: ${healthData.pulse} bpm

Guidelines for Blood Pressure (age-adjusted):
- For adults under 65:
  * Normal: Systolic < 120 AND Diastolic < 80
  * Elevated: Systolic 120-129 AND Diastolic < 80
  * High (Stage 1): Systolic 130-139 OR Diastolic 80-89
  * High (Stage 2): Systolic ≥ 140 OR Diastolic ≥ 90
- For seniors 65+:
  * Normal: Systolic < 130 AND Diastolic < 80
  * Elevated: Systolic 130-139 AND Diastolic < 85
  * High: Systolic ≥ 150 OR Diastolic ≥ 90

Guidelines for Pulse:
- Normal: 60-100 bpm
- Low (Bradycardia): < 60 bpm (may be normal for fit individuals)
- High (Tachycardia): > 100 bpm

Return a JSON object with:
{
  "status": "normal" | "warning" | "high",
  "reason": "Brief explanation of the assessment",
  "recommendations": ["Array of 1-2 brief health recommendations"]
}

Be realistic - not everyone has perfect readings. Consider the patient's age and gender when assessing.`;
    } else {
      prompt = `You are a medical assessment AI. Analyze these body measurements and determine BMI severity.

Patient Info:
- Age: ${healthData.age ?? 'Unknown'} years old
- Gender: ${healthData.gender ?? 'Unknown'}
- Height: ${healthData.height} cm
- Weight: ${healthData.weight} kg
- BMI: ${healthData.bmi} kg/m²

Guidelines for BMI (Asian WHO Standards - adjusted by gender):
For Males:
- Underweight: BMI < 18.5
- Normal: BMI 18.5-22.9
- At Risk (Overweight): BMI 23-24.9
- Obese Class I: BMI 25-29.9
- Obese Class II: BMI ≥ 30

For Females:
- Underweight: BMI < 18.5
- Normal: BMI 18.5-22.9 (may be lower threshold ~18 for younger women)
- At Risk (Overweight): BMI 23-24.9
- Obese Class I: BMI 25-29.9
- Obese Class II: BMI ≥ 30

Age Considerations:
- For elderly (65+): Slightly higher BMI (23-27) may be protective
- Muscle mass decreases with age, so BMI alone may not reflect health accurately

Return a JSON object with:
{
  "status": "normal" | "warning" | "high",
  "reason": "Brief explanation of the assessment",
  "recommendations": ["Array of 1-2 brief health recommendations"]
}

Be realistic - consider body composition differences between genders and age groups.`;
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // Parse the JSON response
    let assessment;
    try {
      assessment = JSON.parse(textContent);
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        assessment = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse Gemini response');
      }
    }

    return new Response(
      JSON.stringify(assessment),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assess-health-severity:', error);
    
    // Return a fallback assessment
    return new Response(
      JSON.stringify({
        status: 'normal',
        reason: 'Unable to perform AI assessment. Showing default status.',
        recommendations: ['Please consult a healthcare professional for accurate assessment.']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
