import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log("Programme signup webhook triggered:", JSON.stringify(payload));

    const {
      participant_name,
      participant_phone,
      programme_title,
      programme_date,
      programme_location,
      admin_email,
      admin_phone,
      webhook_url,
    } = payload;

    // If no webhook URL is configured, just log and return success
    if (!webhook_url) {
      console.log("No n8n webhook URL configured, skipping notification");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Signup recorded, no webhook configured" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Send notification to n8n webhook
    console.log("Sending to n8n webhook:", webhook_url);
    
    const n8nPayload = {
      event: "programme_signup",
      timestamp: new Date().toISOString(),
      participant: {
        name: participant_name,
        phone: participant_phone,
      },
      programme: {
        title: programme_title,
        date: programme_date,
        location: programme_location,
      },
      admin: {
        email: admin_email,
        phone: admin_phone,
      },
    };

    const webhookResponse = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!webhookResponse.ok) {
      console.error("n8n webhook failed:", webhookResponse.status, await webhookResponse.text());
      // Don't fail the signup if webhook fails
    } else {
      console.log("n8n webhook successful");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Signup notification sent" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", errorMessage);
    
    // Return success anyway - don't block signup due to webhook failure
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Signup recorded, webhook notification failed",
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  }
});
