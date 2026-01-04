import { Globe, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function AccessibilityBar() {
  const { t, isVoiceEnabled, setIsVoiceEnabled } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTranslate = () => {
    // Store current path to return after language selection
    sessionStorage.setItem('returnPath', location.pathname);
    navigate('/language');
  };

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    
    if (!isVoiceEnabled) {
      // Simulate voice feedback
      const utterance = new SpeechSynthesisUtterance('Voice guide is now on');
      speechSynthesis.speak(utterance);
    } else {
      speechSynthesis.cancel();
    }
  };

  // Don't show on scan or language selection screens
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-medium z-50">
      <div className="max-w-2xl mx-auto flex gap-4">
        <Button
          variant="accessibility"
          size="accessibility"
          onClick={handleTranslate}
          className="flex-1"
        >
          <Globe className="w-6 h-6" />
          <span>{t('access.translate')}</span>
        </Button>
        
        <Button
          variant={isVoiceEnabled ? 'accessibilityActive' : 'accessibility'}
          size="accessibility"
          onClick={toggleVoice}
          className="flex-1"
        >
          {isVoiceEnabled ? (
            <Volume2 className="w-6 h-6" />
          ) : (
            <VolumeX className="w-6 h-6" />
          )}
          <span>{isVoiceEnabled ? t('access.voiceOn') : t('access.voice')}</span>
        </Button>
      </div>
    </div>
  );
}
