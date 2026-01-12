import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI } from '@/utils/audioUtils';
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
  const [transcript, setTranscript] = useState('');
  const [commandRecognized, setCommandRecognized] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const pageLabels: Record<string, string> = {
    'home': 'Home',
    'scan': 'Scan Card',
    'language': 'Language',
    'dashboard': 'Dashboard',
    'health-screenings': 'Health Screenings',
    'find-care': 'Find Care',
    'community-programmes': 'Community Programmes',
    'profile': 'Profile',
    'admin-programmes': 'Admin Programmes',
    'admin-slideshow': 'Admin Slideshow'
  };

  const executeNavigation = useCallback((page: string) => {
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
      console.log('Executing navigation to:', route);
      
      // Show visual feedback
      setCommandRecognized(page);
      
      // Navigate after brief visual feedback
      setTimeout(() => {
        navigate(route);
        setCommandRecognized(null);
      }, 800);
    }
  }, [navigate]);

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

      case 'response.function_call_arguments.done':
        // Handle navigation tool call - navigate immediately
        try {
          const args = JSON.parse(data.arguments);
          if (args.page) {
            executeNavigation(args.page);
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
  }, [executeNavigation, toast]);

  const connect = useCallback(async () => {
    try {
      // Initialize audio context for microphone
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

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
            title: 'Voice Guide Ready',
            description: 'Say where you want to go',
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
    
    audioContextRef.current?.close();
    audioContextRef.current = null;
    
    setIsConnected(false);
    setIsListening(false);
    setTranscript('');
    setCommandRecognized(null);
  }, []);

  // Connect when opened, disconnect when closed
  useEffect(() => {
    if (isOpen) {
      if (!isConnected) {
        connect();
      }
    } else {
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
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-background/10" />
      
      {/* Command Recognized Overlay - Full Screen Visual Feedback */}
      {commandRecognized && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-8 shadow-2xl border-4 border-primary flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-12 h-12 text-primary-foreground" strokeWidth={3} />
            </div>
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-1">Navigating to</p>
              <p className="text-3xl font-bold text-card-foreground">{pageLabels[commandRecognized]}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Robot Animation - Bottom Right */}
      <div className="absolute bottom-24 right-4 pointer-events-auto">
        <div className={`relative transition-all duration-500 ${commandRecognized ? 'scale-110' : isListening ? 'scale-105' : 'scale-100'}`}>
          {/* Glow effect behind robot */}
          <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            commandRecognized
              ? 'bg-primary/60 scale-150' 
              : isListening 
                ? 'bg-green-500/30 scale-125' 
                : 'bg-primary/20 scale-100'
          }`} />
          
          {/* Robot Animation */}
          <div className="relative w-40 h-40">
            <Lottie 
              animationData={robotAnimation} 
              loop={true}
              className={`w-full h-full drop-shadow-2xl ${commandRecognized || isListening ? '' : 'opacity-80'}`}
            />
          </div>
          
          {/* Status indicator ring */}
          <div className={`absolute -inset-2 rounded-full border-4 transition-all duration-300 ${
            commandRecognized 
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
                commandRecognized 
                  ? 'bg-primary animate-pulse' 
                  : isListening 
                    ? 'bg-green-500 animate-pulse' 
                    : isConnected 
                      ? 'bg-primary/60' 
                      : 'bg-muted-foreground'
              }`} />
              <span className="text-sm font-medium text-card-foreground">
                {commandRecognized 
                  ? `Going to ${pageLabels[commandRecognized]}...`
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

          {/* Transcript area */}
          {transcript ? (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">You said:</p>
              <p className="text-sm text-card-foreground">{transcript}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Try: "Go to community programmes" or "Show me health screenings"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceNavigator;