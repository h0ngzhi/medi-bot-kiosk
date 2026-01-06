import { useState } from 'react';
import { Globe, Mic, Volume2, VolumeX, Lock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { speakText, stopSpeaking } from '@/utils/speechUtils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import VoiceNavigator from './VoiceNavigator';
import { toast } from 'sonner';

const VOICE_GUIDE_PASSWORD = 'catinthebin123';
const VOICE_GUIDE_AUTH_KEY = 'voiceGuideAuthenticated';

export function AccessibilityBar() {
  const { t, language, isTtsEnabled, setIsTtsEnabled } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleSpeak = (text: string) => {
    if (isTtsEnabled) {
      speakText(text, language);
    }
  };

  const handleTranslate = () => {
    sessionStorage.setItem('returnPath', location.pathname);
    navigate('/language');
  };

  const handleToggleTts = () => {
    if (isTtsEnabled) {
      stopSpeaking();
    }
    setIsTtsEnabled(!isTtsEnabled);
  };

  const handleVoiceGuideClick = () => {
    if (sessionStorage.getItem(VOICE_GUIDE_AUTH_KEY) === 'true') {
      setIsVoiceOpen(true);
    } else {
      setShowPasswordDialog(true);
      setPassword('');
      setPasswordError(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === VOICE_GUIDE_PASSWORD) {
      sessionStorage.setItem(VOICE_GUIDE_AUTH_KEY, 'true');
      setShowPasswordDialog(false);
      setIsVoiceOpen(true);
      setPassword('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      toast.error('Incorrect password');
    }
  };

  // Don't show on scan or language selection screens
  if (location.pathname === '/' || location.pathname === '/language') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-medium z-50">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button
            variant="accessibility"
            size="accessibility"
            onClick={handleTranslate}
            onMouseEnter={() => handleSpeak(t('access.translate'))}
            className="flex-1"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm">{t('access.translate')}</span>
          </Button>
          
          <Button
            variant={isTtsEnabled ? 'accessibility' : 'outline'}
            size="accessibility"
            onClick={handleToggleTts}
            onMouseEnter={() => handleSpeak(isTtsEnabled ? t('access.voiceOn') : t('access.voiceOff'))}
            className={`flex-1 ${!isTtsEnabled ? 'opacity-60' : ''}`}
          >
            {isTtsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="text-sm">{isTtsEnabled ? t('access.voiceOn') : t('access.voiceOff')}</span>
          </Button>
          
          <Button
            variant="accessibility"
            size="accessibility"
            onClick={handleVoiceGuideClick}
            onMouseEnter={() => handleSpeak(t('access.voice'))}
            className="flex-1"
          >
            <Mic className="w-5 h-5" />
            <span className="text-sm">{t('access.voice')}</span>
          </Button>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="w-5 h-5" />
              Voice Guide Access
            </DialogTitle>
            <DialogDescription>
              Enter the password to use Voice Guide
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit();
                }
              }}
              className={`text-lg h-14 ${passwordError ? 'border-destructive' : ''}`}
              autoFocus
            />
            {passwordError && (
              <p className="text-destructive text-sm">Incorrect password. Please try again.</p>
            )}
            <Button 
              onClick={handlePasswordSubmit} 
              className="w-full h-14 text-lg"
              variant="warm"
            >
              Unlock Voice Guide
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VoiceNavigator isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
}
