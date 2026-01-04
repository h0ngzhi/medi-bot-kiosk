import { useState } from 'react';
import { Globe, Mic } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import VoiceNavigator from './VoiceNavigator';

export function AccessibilityBar() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const handleTranslate = () => {
    // Store current path to return after language selection
    sessionStorage.setItem('returnPath', location.pathname);
    navigate('/language');
  };

  // Don't show on scan or language selection screens
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  return (
    <>
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
            variant="accessibility"
            size="accessibility"
            onClick={() => setIsVoiceOpen(true)}
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
