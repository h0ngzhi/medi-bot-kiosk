import { useState } from 'react';
import { Globe, Mic, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { speakText, stopSpeaking } from '@/utils/speechUtils';
import VoiceNavigator from './VoiceNavigator';

export function AccessibilityBar() {
  const { t, language, isTtsEnabled, setIsTtsEnabled } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleTranslate = () => {
    // Store current path to return after language selection
    sessionStorage.setItem('returnPath', location.pathname);
    navigate('/language');
  };

  const handleToggleTts = () => {
    if (isTtsEnabled) {
      stopSpeaking();
    }
    setIsTtsEnabled(!isTtsEnabled);
  };

  // Don't show on scan or language selection screens
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-medium z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="accessibility"
            size="accessibility"
            onClick={handleTranslate}
            onMouseEnter={() => handleSpeak(t('access.translate'))}
            className="flex-1"
          >
            <Globe className="w-6 h-6" />
            <span>{t('access.translate')}</span>
          </Button>
          
          <Button
            variant={isTtsEnabled ? 'accessibility' : 'outline'}
            size="accessibility"
            onClick={handleToggleTts}
            onMouseEnter={() => handleSpeak(isTtsEnabled ? t('access.voiceOn') : t('access.voiceOff'))}
            className={`flex-1 ${!isTtsEnabled ? 'opacity-60' : ''}`}
          >
            {isTtsEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            <span>{isTtsEnabled ? t('access.voiceOn') : t('access.voiceOff')}</span>
          </Button>
          
          <Button
            variant="accessibility"
            size="accessibility"
            onClick={() => setIsVoiceOpen(true)}
            onMouseEnter={() => handleSpeak(t('access.voice'))}
            className="flex-1"
          >
            <Mic className="w-6 h-6" />
            <span>{t('access.voice')}</span>
          </Button>
        </div>
      </div>

      <VoiceNavigator isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
}
