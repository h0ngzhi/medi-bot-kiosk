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
            modalities: ["text"], // No audio output - just listen and act
            instructions: `You are a silent navigation assistant. Your ONLY job is to understand what page the user wants to go to and call the navigate_to function. 
            
            NEVER respond with text or speech. Just call the function silently.
            
            Available pages:
            - home: Starting screen with slideshow
            - scan: Scan NRIC/CHAS card to login
            - language: Choose preferred language
            - dashboard: Main home page
            - health-screenings: Health screening results
            - find-care: Find nearby clinics on a map
            - community-programmes: Community health programmes
            - profile: User profile and rewards
            - admin-programmes: Staff programme management
            - admin-slideshow: Staff slideshow management
            
            Listen for navigation requests and immediately call navigate_to. Do not speak or respond with text.`,
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
              silence_duration_ms: 1500,
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
            tool_choice: "required", // Always use the tool
            temperature: 0.3,
            max_response_output_tokens: 50, // Minimal tokens since we don't need text
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
