import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoiceNavigator from './VoiceNavigator';

const VoiceButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
        aria-label="Open voice assistant"
      >
        <Mic className="h-7 w-7" />
      </Button>

      <VoiceNavigator isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default VoiceButton;
