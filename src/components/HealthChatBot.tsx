import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Mic, MicOff, Volume2, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import { speakText, stopSpeaking, type Language } from "@/utils/speechUtils";
import Lottie from "lottie-react";
import healthAssistantAnimation from "@/assets/health-assistant.json";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

const translations = {
  en: {
    title: "CCN Assistant",
    placeholder: "Type or speak your message...",
    greeting: "Hello! I can help you learn about Community Care Network (CCN) services. What would you like to know?",
    error: "Sorry, something went wrong. Please try again.",
    listening: "Listening...",
    micError: "Could not access microphone. Please allow microphone access.",
    speechNotSupported: "Voice input is not supported in this browser.",
    notificationTitle: "Need Help?",
    notificationMessage: "I can help you learn about community care services.",
    askMe: "Ask Me",
    dismiss: "Not Now",
  },
  zh: {
    title: "社区关怀助手",
    placeholder: "输入或说出您的消息...",
    greeting: "您好！我可以帮助您了解社区关怀网络 (CCN) 服务。您想了解什么？",
    error: "抱歉，出现了问题。请再试一次。",
    listening: "正在听...",
    micError: "无法访问麦克风。请允许麦克风访问。",
    speechNotSupported: "此浏览器不支持语音输入。",
    notificationTitle: "需要帮助吗？",
    notificationMessage: "我可以帮助您了解社区关怀服务。",
    askMe: "询问我",
    dismiss: "稍后",
  },
  ms: {
    title: "Pembantu CCN",
    placeholder: "Taip atau sebut mesej anda...",
    greeting: "Hai! Saya boleh membantu anda mempelajari tentang perkhidmatan Rangkaian Penjagaan Komuniti (CCN). Apa yang anda ingin tahu?",
    error: "Maaf, sesuatu telah berlaku. Sila cuba lagi.",
    listening: "Mendengar...",
    micError: "Tidak dapat mengakses mikrofon. Sila benarkan akses mikrofon.",
    speechNotSupported: "Input suara tidak disokong dalam pelayar ini.",
    notificationTitle: "Perlukan Bantuan?",
    notificationMessage: "Saya boleh membantu anda mempelajari tentang perkhidmatan penjagaan komuniti.",
    askMe: "Tanya Saya",
    dismiss: "Tidak Sekarang",
  },
  ta: {
    title: "CCN உதவியாளர்",
    placeholder: "உங்கள் செய்தியை தட்டச்சு செய்க அல்லது பேசுங்கள்...",
    greeting: "வணக்கம்! சமூக பராமரிப்பு நெட்வொர்க் (CCN) சேவைகளைப் பற்றி அறிய நான் உங்களுக்கு உதவ முடியும். நீங்கள் என்ன அறிய விரும்புகிறீர்கள்?",
    error: "மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
    listening: "கேட்கிறது...",
    micError: "மைக்ரோஃபோனை அணுக முடியவில்லை. மைக்ரோஃபோன் அணுகலை அனுமதிக்கவும்.",
    speechNotSupported: "இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.",
    notificationTitle: "உதவி தேவையா?",
    notificationMessage: "சமூக பராமரிப்பு சேவைகளைப் பற்றி அறிய நான் உங்களுக்கு உதவ முடியும்.",
    askMe: "என்னிடம் கேளுங்கள்",
    dismiss: "இப்போது வேண்டாம்",
  },
};

const languageToSpeechCode: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
  ms: "ms-MY",
  ta: "ta-IN",
};

export function HealthChatBot() {
  const { language } = useApp();
  const t = translations[language];
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t.greeting }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Update greeting when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "assistant") {
      setMessages([{ role: "assistant", content: t.greeting }]);
    }
  }, [language, t.greeting]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSpeaking();
    };
  }, []);

  const handleOpenChat = () => {
    setIsMinimized(false);
    setIsOpen(true);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t.speechNotSupported,
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageToSpeechCode[language];
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast({
          variant: "destructive",
          title: "Error",
          description: t.micError,
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, t.micError, t.speechNotSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const handleSpeak = useCallback((text: string, index: number) => {
    if (speakingIndex === index) {
      stopSpeaking();
      setSpeakingIndex(null);
    } else {
      stopSpeaking();
      setSpeakingIndex(index);
      speakText(text, language);
      
      // Reset speaking state when speech ends
      const checkSpeaking = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeakingIndex(null);
          clearInterval(checkSpeaking);
        }
      }, 100);
    }
  }, [language, speakingIndex]);

  const streamChat = useCallback(async (userMessages: Message[]) => {
    const languageNames: Record<Language, string> = {
      en: "English",
      zh: "Chinese (Simplified)",
      ms: "Malay",
      ta: "Tamil",
    };

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        language: language,
        languageName: languageNames[language],
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  }, [language]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages.filter(m => m.content !== t.greeting || m.role !== "assistant"));
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: t.error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Minimized Bookmark Tab */}
      {isMinimized && !isOpen && (
        <button
          onClick={handleExpand}
          className="fixed bottom-8 right-0 z-50 bg-primary text-primary-foreground rounded-l-3xl shadow-xl px-4 py-5 flex items-center gap-3 hover:pr-6 transition-all duration-300 group"
          aria-label="Expand help assistant"
        >
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
            <Lottie 
              animationData={healthAssistantAnimation} 
              loop={true}
              className="w-16 h-16"
            />
          </div>
          <HelpCircle className="w-7 h-7 opacity-80 group-hover:opacity-100" />
        </button>
      )}

      {/* Notification Prompt */}
      {!isMinimized && !isOpen && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-card border-3 border-primary/30 rounded-3xl shadow-2xl p-8 max-w-md">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <Lottie 
                  animationData={healthAssistantAnimation} 
                  loop={true}
                  className="w-24 h-24"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle className="w-7 h-7 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">{t.notificationTitle}</h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {t.notificationMessage}
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                className="flex-1 h-16 text-xl"
                onClick={handleMinimize}
              >
                {t.dismiss}
              </Button>
              <Button
                className="flex-1 h-16 text-xl"
                onClick={handleOpenChat}
              >
                {t.askMe}
                <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                <Lottie 
                  animationData={healthAssistantAnimation} 
                  loop={true}
                  className="w-12 h-12"
                />
              </div>
              <h2 className="text-xl font-semibold">{t.title}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary/80"
              aria-label="Close chat"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2 flex-shrink-0 overflow-hidden">
                      <Lottie 
                        animationData={healthAssistantAnimation} 
                        loop={true}
                        className="w-10 h-10"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-lg leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(message.content, index)}
                        className={`self-start h-8 px-2 ${speakingIndex === index ? "text-primary" : "text-muted-foreground"}`}
                        aria-label="Listen to message"
                      >
                        <Volume2 className={`h-4 w-4 mr-1 ${speakingIndex === index ? "animate-pulse" : ""}`} />
                        <span className="text-sm">{speakingIndex === index ? "Playing..." : "Listen"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2 flex-shrink-0 overflow-hidden">
                    <Lottie 
                      animationData={healthAssistantAnimation} 
                      loop={true}
                      className="w-10 h-10"
                    />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            {isListening && (
              <div className="text-center text-primary text-sm mb-2 animate-pulse">
                {t.listening}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={isListening ? stopListening : startListening}
                variant={isListening ? "destructive" : "outline"}
                className="h-14 w-14 flex-shrink-0"
                size="icon"
                disabled={isLoading}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className="flex-1 text-lg h-14"
                disabled={isLoading}
                aria-label="Message input"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-14 w-14"
                size="icon"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Add type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionType {
  new (): SpeechRecognitionType;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionType;
    webkitSpeechRecognition: SpeechRecognitionType;
  }
}
