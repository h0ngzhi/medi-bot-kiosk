import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, AudioQueue, createWavFromPCM } from '@/utils/audioUtils';

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

  const handleNavigate = useCallback((page: string) => {
    const routes: Record<string, string> = {
      'dashboard': '/dashboard',
      'health-screenings': '/health',
      'medications': '/medications',
      'teleconsult': '/teleconsult',
      'community-programmes': '/community',
      'profile': '/profile'
    };
    
    const route = routes[page];
    if (route) {
      console.log('Navigating to:', route);
      navigate(route);
      toast({
        title: 'Navigating',
        description: `Going to ${page.replace('-', ' ')}`,
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
        setIsSpeaking(true);
        // Decode base64 audio and play
        const binaryString = atob(data.delta);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioQueueRef.current?.addToQueue(bytes);
        break;

      case 'response.audio.done':
        setIsSpeaking(false);
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

  useEffect(() => {
    if (isOpen && !isConnected) {
      connect();
    }
    
    return () => {
      if (!isOpen) {
        disconnect();
      }
    };
  }, [isOpen, isConnected, connect, disconnect]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-card-foreground">Voice Assistant</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center mb-8">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isSpeaking 
              ? 'bg-primary/20 animate-pulse' 
              : isListening 
                ? 'bg-green-500/20' 
                : 'bg-muted'
          }`}>
            <div className={`absolute inset-0 rounded-full ${
              isSpeaking || isListening ? 'animate-ping opacity-20' : ''
            } ${isSpeaking ? 'bg-primary' : isListening ? 'bg-green-500' : ''}`} />
            
            {isSpeaking ? (
              <Volume2 className="h-16 w-16 text-primary" />
            ) : isListening ? (
              <Mic className="h-16 w-16 text-green-500" />
            ) : isConnected ? (
              <Mic className="h-16 w-16 text-muted-foreground" />
            ) : (
              <MicOff className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
          
          <p className="mt-4 text-lg font-medium text-card-foreground">
            {isSpeaking 
              ? 'Speaking...' 
              : isListening 
                ? 'Listening...' 
                : isConnected 
                  ? 'Say something to navigate' 
                  : 'Connecting...'}
          </p>
        </div>

        {/* Transcript Display */}
        {(transcript || response) && (
          <div className="space-y-3 mb-6">
            {transcript && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">You said:</p>
                <p className="text-card-foreground">{transcript}</p>
              </div>
            )}
            {response && (
              <div className="bg-primary/10 rounded-xl p-4">
                <p className="text-sm text-primary mb-1">Assistant:</p>
                <p className="text-card-foreground">{response}</p>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Try saying:</p>
          <p className="mt-1 text-card-foreground">"Take me to my medications"</p>
          <p className="text-card-foreground">"Show health screenings"</p>
          <p className="text-card-foreground">"Go to community programmes"</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceNavigator;
