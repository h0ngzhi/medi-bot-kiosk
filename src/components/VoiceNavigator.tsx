import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from '@/utils/audioUtils';
import Lottie from 'lottie-react';
import robotAnimation from '@/assets/robot-assistant.json';

interface VoiceNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const VoiceNavigator = ({ isOpen, onClose }: VoiceNavigatorProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const isSpeakingRef = useRef(false); // Track speaking state for mic control

  const handleNavigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      'home': '/',
      'scan': '/scan',
      'language': '/language',
      'dashboard': '/dashboard',
      'health-screenings': '/health',
      'find-care': '/findcare',
      'community-programmes': '/community',
      'profile': '/profile',
      'admin-programmes': '/admin/programmes',
      'admin-slideshow': '/admin/slideshow'
    };
    
    const route = routes[page];
    if (route) {
      console.log('Navigating to:', route);
      navigate(route);
      toast({
        title: 'Navigating',
        description: `Going to ${page.replace(/-/g, ' ')}`,
      });
    }
  }, [navigate, toast]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data.type);

    switch (data.type) {
      case 'session.created':
      case 'session.updated':
        console.log('Session ready');
        break;

      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        setTranscript('');
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        setTranscript(data.transcript || '');
        break;

      case 'response.audio.delta':
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          // Pause microphone while AI is speaking to prevent echo
          recorderRef.current?.pause();
        }
        // Decode base64 audio and play
        const binaryString = atob(data.delta);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioQueueRef.current?.addToQueue(bytes);
        break;

      case 'response.audio.done':
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        // Resume microphone after AI finishes speaking with a small delay
        setTimeout(() => {
          if (recorderRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            recorderRef.current.resume();
          }
        }, 150);
        break;

      case 'response.audio_transcript.delta':
        setResponse(prev => prev + (data.delta || ''));
        break;

      case 'response.audio_transcript.done':
        // Response complete
        break;

      case 'response.function_call_arguments.done':
        // Handle navigation tool call
        try {
          const args = JSON.parse(data.arguments);
          if (args.page) {
            handleNavigate(args.page);
          }
          
          // Send function result back
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: data.call_id,
                output: JSON.stringify({ success: true, navigated_to: args.page })
              }
            }));
            wsRef.current.send(JSON.stringify({ type: 'response.create' }));
          }
        } catch (e) {
          console.error('Error parsing function call:', e);
        }
        break;

      case 'error':
        console.error('API Error:', data.error);
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: data.error?.message || 'An error occurred',
        });
        break;
    }
  }, [handleNavigate, toast]);

  const connect = useCallback(async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);

      // Connect to edge function
      const wsUrl = `wss://yvvnbmsbsrklajmoybwx.supabase.co/functions/v1/realtime-voice`;
      console.log('Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log('WebSocket connected');
        setIsConnected(true);

        // Start audio recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });

        try {
          await recorderRef.current.start();
          toast({
            title: 'Voice Assistant Ready',
            description: 'Speak to navigate the app',
          });
        } catch (error) {
          console.error('Microphone error:', error);
          toast({
            variant: 'destructive',
            title: 'Microphone Error',
            description: 'Please allow microphone access',
          });
        }
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'Failed to connect to voice service',
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
      };
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to start voice assistant',
      });
    }
  }, [handleWebSocketMessage, toast]);

  const disconnect = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    
    wsRef.current?.close();
    wsRef.current = null;
    
    audioQueueRef.current?.clear();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setResponse('');
  }, []);

  // Connect when opened, disconnect when closed
  useEffect(() => {
    if (isOpen) {
      if (!isConnected) {
        connect();
      }
    } else {
      // Always disconnect when not open
      disconnect();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Subtle backdrop - no blur, allows interaction with page behind */}
      <div className="absolute inset-0 bg-background/10" />
      
      {/* Floating Robot Animation - Bottom Right */}
      <div className="absolute bottom-24 right-4 pointer-events-auto">
        <div className={`relative transition-all duration-500 ${isSpeaking ? 'scale-110' : isListening ? 'scale-105' : 'scale-100'}`}>
          {/* Glow effect behind robot */}
          <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            isSpeaking 
              ? 'bg-primary/40 scale-150' 
              : isListening 
                ? 'bg-green-500/30 scale-125' 
                : 'bg-primary/20 scale-100'
          }`} />
          
          {/* Robot Animation */}
          <div className="relative w-40 h-40">
            <Lottie 
              animationData={robotAnimation} 
              loop={true}
              className={`w-full h-full drop-shadow-2xl ${isSpeaking || isListening ? '' : 'opacity-80'}`}
            />
          </div>
          
          {/* Status indicator ring */}
          <div className={`absolute -inset-2 rounded-full border-4 transition-all duration-300 ${
            isSpeaking 
              ? 'border-primary animate-pulse' 
              : isListening 
                ? 'border-green-500 animate-pulse' 
                : isConnected 
                  ? 'border-primary/30' 
                  : 'border-muted'
          }`} />
        </div>
      </div>

      {/* Floating Info Panel - Top area */}
      <div className="absolute top-4 left-4 right-4 pointer-events-auto">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-border/50 max-w-md mx-auto">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isSpeaking 
                  ? 'bg-primary animate-pulse' 
                  : isListening 
                    ? 'bg-green-500 animate-pulse' 
                    : isConnected 
                      ? 'bg-primary/60' 
                      : 'bg-muted-foreground'
              }`} />
              <span className="text-sm font-medium text-card-foreground">
                {isSpeaking 
                  ? 'Speaking...' 
                  : isListening 
                    ? 'Listening...' 
                    : isConnected 
                      ? 'Ready - speak anytime' 
                      : 'Connecting...'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Transcript/Response area - compact */}
          {(transcript || response) ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {transcript && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">You:</p>
                  <p className="text-sm text-card-foreground">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="bg-primary/10 rounded-lg p-2">
                  <p className="text-xs text-primary">Assistant:</p>
                  <p className="text-sm text-card-foreground">{response}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Try: "Show health screenings" or "Find a clinic near me"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceNavigator;
