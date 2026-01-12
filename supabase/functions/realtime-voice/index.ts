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
            modalities: ["text"], // TEXT ONLY - no audio output
            instructions: `You are a SILENT navigation assistant for a health kiosk. Your ONLY job is to understand which page the user wants to visit and call the navigate_to function.

IMPORTANT RULES:
1. ALWAYS call the navigate_to function when you understand the user's intent
2. NEVER generate text or audio responses
3. Match user requests to the closest page

Available pages and common phrases:
- "home" - home, start, beginning, main screen
- "scan" - scan, card, login, sign in
- "language" - language, change language
- "dashboard" - dashboard, my page, overview
- "health-screenings" - health, screenings, results, blood pressure, checkup
- "find-care" - find care, clinic, doctor, hospital, nearby
- "community-programmes" - community, programmes, activities, events, classes
- "profile" - profile, my profile, rewards, points
- "admin-programmes" - admin programmes, manage programmes (staff only)
- "admin-slideshow" - admin slideshow, manage slideshow (staff only)

When user says anything related to navigation, IMMEDIATELY call navigate_to with the best matching page.`,
            input_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
              create_response: false, // Don't auto-create response - we'll do it manually
            },
            tools: [
              {
                type: "function",
                name: "navigate_to",
                description: "Navigate to a page in the health kiosk app. Call this function immediately when you understand the user's intent.",
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
            temperature: 0.1,
            max_response_output_tokens: 50,
          },
        };

        openaiSocket!.send(JSON.stringify(sessionUpdate));
      }

      // When speech stops (VAD detected end of speech), manually create a text-only response
      if (data.type === "input_audio_buffer.speech_stopped") {
        console.log("Speech stopped, triggering text-only response");
        
        // First commit the audio buffer
        openaiSocket!.send(JSON.stringify({
          type: "input_audio_buffer.commit"
        }));
        
        // Then create a response with text-only output (no audio)
        openaiSocket!.send(JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["text"], // Force text-only output
            output_audio_format: null, // No audio output
          }
        }));
      }

      // Forward relevant messages to client (skip audio deltas since we're text-only)
      if (data.type !== "response.audio.delta" && 
          data.type !== "response.audio.done" &&
          data.type !== "response.audio_transcript.delta" &&
          data.type !== "response.audio_transcript.done") {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        }
      } else {
        // Still forward function calls even if they come with audio events
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        }
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