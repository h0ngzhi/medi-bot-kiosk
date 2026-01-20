import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 5;

  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

// Generate a simple time-based token
function generateToken(secret: string): string {
  const timestamp = Date.now();
  const data = `${timestamp}:${secret}`;
  // Simple base64 encoding with timestamp
  return btoa(`owner_dashboard:${timestamp}:${btoa(data).slice(0, 16)}`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many attempts. Please try again in a minute.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the correct password from environment
    const correctPassword = Deno.env.get('OWNER_DASHBOARD_PASSWORD');
    
    if (!correctPassword) {
      console.error('OWNER_DASHBOARD_PASSWORD environment variable not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const encoder = new TextEncoder();
    const providedBytes = encoder.encode(password);
    const correctBytes = encoder.encode(correctPassword);

    let isMatch = providedBytes.length === correctBytes.length;
    const maxLength = Math.max(providedBytes.length, correctBytes.length);
    
    for (let i = 0; i < maxLength; i++) {
      const a = providedBytes[i] || 0;
      const b = correctBytes[i] || 0;
      if (a !== b) isMatch = false;
    }

    if (isMatch) {
      const token = generateToken(correctPassword);
      return new Response(
        JSON.stringify({ success: true, token }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Incorrect password' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in verify-owner-dashboard-access:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
