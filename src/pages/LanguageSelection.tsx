import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { speakText } from '@/utils/speechUtils';

type Language = 'en' | 'zh' | 'ms' | 'ta';

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

export default function LanguageSelection() {
  const { setLanguage, t } = useApp();
  const navigate = useNavigate();

  const handleSpeak = (text: string, lang: Language) => {
    speakText(text, lang);
  };

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
          onMouseEnter={() => handleSpeak(t('lang.title'), 'en')}
        >
          {t('lang.title')}
        </h1>
        <p 
          className="text-body-large text-muted-foreground cursor-default"
          onMouseEnter={() => handleSpeak(t('lang.subtitle'), 'en')}
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
            onMouseEnter={() => handleSpeak(lang.nativeName, lang.code)}
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
