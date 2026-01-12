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
  let responseInProgress = false;

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
            modalities: ["text"], // TEXT ONLY
            instructions: `You are a SILENT navigation assistant for a health kiosk. Your ONLY job is to call the navigate_to function based on what the user says. 

CRITICAL RULES:
1. ALWAYS call navigate_to - never respond with text
2. Match the user's request to the best page

Pages:
- home: main start screen
- scan: scan card to login  
- language: change language
- dashboard: main dashboard
- health-screenings: health results, blood pressure
- find-care: find clinic, doctor, hospital
- community-programmes: community activities, programmes, events
- profile: my profile, rewards, points
- admin-programmes: manage programmes (staff)
- admin-slideshow: manage slideshow (staff)

Just call navigate_to immediately. No text response.`,
            input_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000,
            },
            tools: [
              {
                type: "function",
                name: "navigate_to",
                description: "Navigate to a page. Always call this function.",
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
            tool_choice: "required",
            temperature: 0.6,
            max_response_output_tokens: 50,
          },
        };

        openaiSocket!.send(JSON.stringify(sessionUpdate));
      }

      // Track response state
      if (data.type === "response.created") {
        responseInProgress = true;
        console.log("Response started");
      }
      
      if (data.type === "response.done") {
        responseInProgress = false;
        console.log("Response completed");
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