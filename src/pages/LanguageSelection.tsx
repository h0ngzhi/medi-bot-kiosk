import { useNavigate } from 'react-router-dom';
import { useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { speakText, stopSpeaking } from '@/utils/speechUtils';

type Language = 'en' | 'zh' | 'ms' | 'ta';

const SPEAK_DELAY_MS = 400;

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

export default function LanguageSelection() {
  const { setLanguage, t, isTtsEnabled } = useApp();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPendingSpeech = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSpeaking();
  }, []);

  const handleMouseEnter = useCallback((text: string, lang: Language) => {
    if (!isTtsEnabled) return;
    cancelPendingSpeech();
    timeoutRef.current = setTimeout(() => {
      speakText(text, lang);
      timeoutRef.current = null;
    }, SPEAK_DELAY_MS);
  }, [isTtsEnabled, cancelPendingSpeech]);

  const handleMouseLeave = useCallback(() => {
    cancelPendingSpeech();
  }, [cancelPendingSpeech]);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    
    // Check if there's a return path (coming from accessibility bar)
    const returnPath = sessionStorage.getItem('returnPath');
    if (returnPath) {
      sessionStorage.removeItem('returnPath');
      navigate(returnPath);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 
          className="text-display text-primary mb-4 cursor-default"
          onMouseEnter={() => handleMouseEnter(t('lang.title'), 'en')}
          onMouseLeave={handleMouseLeave}
        >
          {t('lang.title')}
        </h1>
        <p 
          className="text-body-large text-muted-foreground cursor-default"
          onMouseEnter={() => handleMouseEnter(t('lang.subtitle'), 'en')}
          onMouseLeave={handleMouseLeave}
        >
          {t('lang.subtitle')}
        </p>
      </div>

      {/* Language buttons */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-6">
        {languages.map((lang, index) => (
          <Button
            key={lang.code}
            variant="language"
            size="language"
            onClick={() => handleLanguageSelect(lang.code)}
            onMouseEnter={() => handleMouseEnter(lang.nativeName, lang.code)}
            onMouseLeave={handleMouseLeave}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="text-3xl font-bold">{lang.nativeName}</span>
            <span className="text-lg text-muted-foreground">{lang.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
