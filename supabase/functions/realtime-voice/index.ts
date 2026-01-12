import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept WebSocket upgrades
  const upgradeHeader = req.headers.get("upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426, headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return new Response("OpenAI API key not configured", { status: 500, headers: corsHeaders });
  }

  console.log("WebSocket upgrade requested");

  // Upgrade to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let openaiSocket: WebSocket | null = null;
  let sessionCreated = false;

  clientSocket.onopen = () => {
    console.log("Client WebSocket connected");

    // Connect to OpenAI Realtime API
    openaiSocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17", [
      "realtime",
      `openai-insecure-api-key.${OPENAI_API_KEY}`,
      "openai-beta.realtime-v1",
    ]);

    openaiSocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openaiSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("OpenAI message type:", data.type);

      // When session is created, send session update with tools
      if (data.type === "session.created" && !sessionCreated) {
        sessionCreated = true;
        console.log("Session created, sending configuration");

        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are a helpful voice assistant for a health kiosk application in Singapore. 
            You help elderly users navigate the app using voice commands.
            
            Available pages you can navigate to:
            - Home / Idle Screen: The starting screen with slideshow (route: home)
            - Scan Card: Scan NRIC/CHAS card to login (route: scan)
            - Language Selection: Choose preferred language (route: language)
            - Dashboard: Main home page with quick actions and overview (route: dashboard)
            - Health Screenings: View health screening results like blood pressure and weight, with AI-powered programme recommendations (route: health-screenings)
            - Find Care / Clinics: Find nearby CHAS clinics, polyclinics, and hospitals on a map with opening hours (route: find-care)
            - Community Programmes: Browse and sign up for community health programmes and activities (route: community-programmes)
            - Profile / Rewards: View user profile, CHAS card, points and redeem rewards (route: profile)
            - Admin Programmes: Staff page to manage community programmes (route: admin-programmes)
            - Admin Slideshow: Staff page to manage idle screen slideshow (route: admin-slideshow)
            
            When users want to go somewhere, use the navigate_to tool with the appropriate route.
            Keep your responses brief and clear, suitable for elderly users.
            Speak in a warm, friendly, and patient tone.
            Speak slightly slower than normal for better comprehension.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.6,
              prefix_padding_ms: 500,
              silence_duration_ms: 1800,
            },
            tools: [
              {
                type: "function",
                name: "navigate_to",
                description: "Navigate to a specific page in the health kiosk app",
                parameters: {
                  type: "object",
                  properties: {
                    page: {
                      type: "string",
                      enum: [
                        "home",
                        "scan",
                        "language",
                        "dashboard",
                        "health-screenings",
                        "find-care",
                        "community-programmes",
                        "profile",
                        "admin-programmes",
                        "admin-slideshow",
                      ],
                      description: "The page to navigate to",
                    },
                  },
                  required: ["page"],
                },
              },
            ],
            tool_choice: "auto",
            temperature: 0.7,
            max_response_output_tokens: 300,
          },
        };

        openaiSocket!.send(JSON.stringify(sessionUpdate));
      }

      // Forward all messages to client
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    };

    openaiSocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
    };

    openaiSocket.onclose = (event) => {
      console.log("OpenAI WebSocket closed:", event.code, event.reason);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close();
      }
    };
  };

  clientSocket.onmessage = (event) => {
    // Forward messages from client to OpenAI
    if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.send(event.data);
    }
  };

  clientSocket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  clientSocket.onclose = () => {
    console.log("Client WebSocket closed");
    if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.close();
    }
  };

  return response;
});
