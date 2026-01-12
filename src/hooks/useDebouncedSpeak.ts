import { useRef, useCallback } from 'react';
import { speakText, stopSpeaking, Language } from '@/utils/speechUtils';

const SPEAK_DELAY_MS = 400; // 400ms delay before speaking

/**
 * Hook that provides debounced speech handlers to prevent rapid mouse movement from triggering speech.
 * @param isTtsEnabled - Whether TTS is enabled
 * @param language - Current language
 * @returns Object with handleMouseEnter and handleMouseLeave functions
 */
export function useDebouncedSpeak(isTtsEnabled: boolean, language: Language) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPendingSpeech = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSpeaking();
  }, []);

  const handleMouseEnter = useCallback((text: string) => {
    if (!isTtsEnabled) return;
    
    // Cancel any pending speech first
    cancelPendingSpeech();
    
    // Set up delayed speech
    timeoutRef.current = setTimeout(() => {
      speakText(text, language);
      timeoutRef.current = null;
    }, SPEAK_DELAY_MS);
  }, [isTtsEnabled, language, cancelPendingSpeech]);

  const handleMouseLeave = useCallback(() => {
    cancelPendingSpeech();
  }, [cancelPendingSpeech]);

  return {
    handleMouseEnter,
    handleMouseLeave,
    cancelPendingSpeech,
  };
}
