import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { AudioRecorder, encodeAudioForAPI } from '@/utils/audioUtils';
import Lottie from 'lottie-react';
import robotAnimation from '@/assets/robot-assistant.json';

interface VoiceNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const translations = {
  en: {
    voiceGuideReady: "Voice Guide Ready",
    sayWhereToGo: "Say where you want to go, or 'sign out' to exit",
    microphoneError: "Microphone Error",
    allowMicAccess: "Please allow microphone access",
    connectionError: "Connection Error",
    failedToConnect: "Failed to connect to voice service",
    failedToStart: "Failed to start voice assistant",
    voiceError: "Voice Error",
    navigatingTo: "Navigating to",
    listening: "Listening...",
    readySpeak: "Ready - speak anytime",
    connecting: "Connecting...",
    goingTo: "Going to",
    youSaid: "You said:",
    tryExample: 'Try: "Go to community programmes" or "Sign out"',
    signingOut: "Signing out...",
    signedOut: "Signed Out",
    pageLabels: {
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
    }
  },
  zh: {
    voiceGuideReady: "语音导航已就绪",
    sayWhereToGo: "请说出您想去的页面，或说'退出'登出",
    microphoneError: "麦克风错误",
    allowMicAccess: "请允许麦克风访问",
    connectionError: "连接错误",
    failedToConnect: "无法连接到语音服务",
    failedToStart: "无法启动语音助手",
    voiceError: "语音错误",
    navigatingTo: "正在前往",
    listening: "正在聆听...",
    readySpeak: "已就绪 - 随时可以说话",
    connecting: "正在连接...",
    goingTo: "前往",
    youSaid: "您说：",
    tryExample: '试试说："去社区活动" 或 "退出"',
    signingOut: "正在退出...",
    signedOut: "已登出",
    pageLabels: {
      'home': '主页',
      'scan': '扫描卡片',
      'language': '语言',
      'dashboard': '仪表板',
      'health-screenings': '健康检查',
      'find-care': '寻找护理',
      'community-programmes': '社区活动',
      'profile': '个人资料',
      'admin-programmes': '管理活动',
      'admin-slideshow': '管理幻灯片'
    }
  },
  ms: {
    voiceGuideReady: "Panduan Suara Sedia",
    sayWhereToGo: "Sebut destinasi anda, atau 'keluar' untuk log keluar",
    microphoneError: "Ralat Mikrofon",
    allowMicAccess: "Sila benarkan akses mikrofon",
    connectionError: "Ralat Sambungan",
    failedToConnect: "Gagal menyambung ke perkhidmatan suara",
    failedToStart: "Gagal memulakan pembantu suara",
    voiceError: "Ralat Suara",
    navigatingTo: "Menuju ke",
    listening: "Mendengar...",
    readySpeak: "Sedia - bercakap bila-bila masa",
    connecting: "Menyambung...",
    goingTo: "Menuju ke",
    youSaid: "Anda berkata:",
    tryExample: 'Cuba: "Pergi ke program komuniti" atau "Log keluar"',
    signingOut: "Melog keluar...",
    signedOut: "Dilog Keluar",
    pageLabels: {
      'home': 'Laman Utama',
      'scan': 'Imbas Kad',
      'language': 'Bahasa',
      'dashboard': 'Papan Pemuka',
      'health-screenings': 'Pemeriksaan Kesihatan',
      'find-care': 'Cari Penjagaan',
      'community-programmes': 'Program Komuniti',
      'profile': 'Profil',
      'admin-programmes': 'Program Pentadbir',
      'admin-slideshow': 'Slaid Pentadbir'
    }
  },
  ta: {
    voiceGuideReady: "குரல் வழிகாட்டி தயார்",
    sayWhereToGo: "எங்கு செல்ல விரும்புகிறீர்கள் என்று சொல்லுங்கள், அல்லது 'வெளியேறு'",
    microphoneError: "மைக்ரோஃபோன் பிழை",
    allowMicAccess: "மைக்ரோஃபோன் அணுகலை அனுமதிக்கவும்",
    connectionError: "இணைப்பு பிழை",
    failedToConnect: "குரல் சேவையுடன் இணைக்க முடியவில்லை",
    failedToStart: "குரல் உதவியாளரை தொடங்க முடியவில்லை",
    voiceError: "குரல் பிழை",
    navigatingTo: "செல்கிறது",
    listening: "கேட்கிறது...",
    readySpeak: "தயார் - எப்போது வேண்டுமானாலும் பேசுங்கள்",
    connecting: "இணைக்கிறது...",
    goingTo: "செல்கிறது",
    youSaid: "நீங்கள் சொன்னது:",
    tryExample: 'முயற்சிக்கவும்: "சமூக நிகழ்ச்சிகளுக்கு செல்" அல்லது "வெளியேறு"',
    signingOut: "வெளியேறுகிறது...",
    signedOut: "வெளியேறியது",
    pageLabels: {
      'home': 'முகப்பு',
      'scan': 'கார்டு ஸ்கேன்',
      'language': 'மொழி',
      'dashboard': 'டாஷ்போர்டு',
      'health-screenings': 'சுகாதார பரிசோதனைகள்',
      'find-care': 'பராமரிப்பு கண்டுபிடி',
      'community-programmes': 'சமூக நிகழ்ச்சிகள்',
      'profile': 'சுயவிவரம்',
      'admin-programmes': 'நிர்வாக நிகழ்ச்சிகள்',
      'admin-slideshow': 'நிர்வாக ஸ்லைடுஷோ'
    }
  }
};

const VoiceNavigator = ({ isOpen, onClose }: VoiceNavigatorProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setUser } = useApp();
  const t = translations[language];
  
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [commandRecognized, setCommandRecognized] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const executeSignOut = useCallback(() => {
    console.log('Executing sign out');
    setIsSigningOut(true);
    
    // Show visual feedback then sign out
    setTimeout(() => {
      setUser(null);
      localStorage.removeItem('kioskUser');
      setIsSigningOut(false);
      onClose();
      navigate('/scan');
    }, 800);
  }, [setUser, navigate, onClose]);

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
        // Handle function calls
        try {
          const functionName = data.name;
          const args = JSON.parse(data.arguments || '{}');
          
          if (functionName === 'sign_out') {
            executeSignOut();
          } else if (functionName === 'navigate_to' && args.page) {
            executeNavigation(args.page);
          } else if (args.page) {
            // Fallback for navigate_to without explicit name
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
          title: t.voiceError,
          description: data.error?.message || 'An error occurred',
        });
        break;
    }
  }, [executeNavigation, executeSignOut, toast, t.voiceError]);

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
            title: t.voiceGuideReady,
            description: t.sayWhereToGo,
          });
        } catch (error) {
          console.error('Microphone error:', error);
          toast({
            variant: 'destructive',
            title: t.microphoneError,
            description: t.allowMicAccess,
          });
        }
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          variant: 'destructive',
          title: t.connectionError,
          description: t.failedToConnect,
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
        title: t.connectionError,
        description: t.failedToStart,
      });
    }
  }, [handleWebSocketMessage, toast, t]);

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
      
      {/* Sign Out Overlay */}
      {isSigningOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-10 shadow-2xl border-4 border-destructive flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full bg-destructive flex items-center justify-center">
              <LogOut className="w-14 h-14 text-destructive-foreground" strokeWidth={3} />
            </div>
            <div className="text-center">
              <p className="text-xl text-muted-foreground mb-2">{t.signingOut}</p>
              <p className="text-4xl font-bold text-card-foreground">{t.signedOut}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Command Recognized Overlay - Full Screen Visual Feedback */}
      {commandRecognized && !isSigningOut && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-10 shadow-2xl border-4 border-primary flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-14 h-14 text-primary-foreground" strokeWidth={3} />
            </div>
            <div className="text-center">
              <p className="text-xl text-muted-foreground mb-2">{t.navigatingTo}</p>
              <p className="text-4xl font-bold text-card-foreground">{t.pageLabels[commandRecognized as keyof typeof t.pageLabels]}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Robot Animation - Bottom Right */}
      <div className="absolute bottom-28 right-6 pointer-events-auto">
        <div className={`relative transition-all duration-500 ${commandRecognized || isSigningOut ? 'scale-110' : isListening ? 'scale-105' : 'scale-100'}`}>
          {/* Glow effect behind robot */}
          <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            isSigningOut
              ? 'bg-destructive/60 scale-150'
              : commandRecognized
                ? 'bg-primary/60 scale-150' 
                : isListening 
                  ? 'bg-green-500/30 scale-125' 
                  : 'bg-primary/20 scale-100'
          }`} />
          
          {/* Robot Animation */}
          <div className="relative w-48 h-48">
            <Lottie 
              animationData={robotAnimation} 
              loop={true}
              className={`w-full h-full drop-shadow-2xl ${commandRecognized || isListening || isSigningOut ? '' : 'opacity-80'}`}
            />
          </div>
          
          {/* Status indicator ring */}
          <div className={`absolute -inset-3 rounded-full border-4 transition-all duration-300 ${
            isSigningOut
              ? 'border-destructive animate-pulse'
              : commandRecognized 
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
      <div className="absolute top-6 left-6 right-6 pointer-events-auto">
        <div className="bg-card/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-2 border-border/50 max-w-lg mx-auto">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full ${
                isSigningOut
                  ? 'bg-destructive animate-pulse'
                  : commandRecognized 
                    ? 'bg-primary animate-pulse' 
                    : isListening 
                      ? 'bg-green-500 animate-pulse' 
                      : isConnected 
                        ? 'bg-primary/60' 
                        : 'bg-muted-foreground'
              }`} />
              <span className="text-xl font-semibold text-card-foreground">
                {isSigningOut
                  ? t.signingOut
                  : commandRecognized 
                    ? `${t.goingTo} ${t.pageLabels[commandRecognized as keyof typeof t.pageLabels]}...`
                    : isListening 
                      ? t.listening
                      : isConnected 
                        ? t.readySpeak
                        : t.connecting}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="h-12 w-12 rounded-full hover:bg-destructive/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Transcript area */}
          {transcript ? (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-base text-muted-foreground mb-1">{t.youSaid}</p>
              <p className="text-xl text-card-foreground font-medium">{transcript}</p>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground text-center py-2">
              {t.tryExample}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceNavigator;
