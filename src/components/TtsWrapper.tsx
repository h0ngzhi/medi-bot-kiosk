import React, { useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { speakText, stopSpeaking, Language } from '@/utils/speechUtils';

const SPEAK_DELAY_MS = 400;

/**
 * TtsWrapper - A global component that adds hover-to-speak functionality
 * to ALL text elements within its children, without requiring manual onMouseEnter handlers.
 * 
 * It listens for mouseenter events on text-containing elements and speaks their text content.
 */
export function TtsWrapper({ children }: { children: React.ReactNode }) {
  const { isTtsEnabled, language } = useApp();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cancelPendingSpeech = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSpeaking();
  }, []);

  const speakWithDelay = useCallback((text: string) => {
    if (!isTtsEnabled || !text.trim()) return;
    
    cancelPendingSpeech();
    
    timeoutRef.current = setTimeout(() => {
      speakText(text, language as Language);
      timeoutRef.current = null;
    }, SPEAK_DELAY_MS);
  }, [isTtsEnabled, language, cancelPendingSpeech]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Text-containing elements to listen for
    const textSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'label', 'a',
      'button', 'li', 'td', 'th',
      '[data-tts]', // Custom attribute for explicit TTS
      '.tts-speak' // Custom class for explicit TTS
    ].join(',');

    const handleMouseEnter = (event: MouseEvent) => {
      if (!isTtsEnabled) return;
      
      const target = event.target as HTMLElement;
      
      // Skip if target is a container element that has speakable children
      // We want the most specific text element
      const isContainer = target.querySelector(textSelectors);
      if (isContainer && !target.matches('[data-tts], .tts-speak')) {
        return;
      }

      // Skip elements that explicitly opt out
      if (target.closest('[data-tts-skip]') || target.hasAttribute('data-tts-skip')) {
        return;
      }

      // Skip input elements (they have their own voice features)
      if (target.matches('input, textarea, select')) {
        return;
      }

      // Get the text to speak
      let textToSpeak = '';
      
      // Check for explicit data-tts attribute first
      if (target.hasAttribute('data-tts')) {
        textToSpeak = target.getAttribute('data-tts') || '';
      }
      
      // Otherwise get text content, but avoid reading hidden or aria-hidden content
      if (!textToSpeak) {
        // Use innerText for better representation of visible text
        textToSpeak = target.innerText || target.textContent || '';
      }

      // Clean up the text
      textToSpeak = textToSpeak
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500); // Limit to 500 chars to avoid very long speeches

      if (textToSpeak) {
        speakWithDelay(textToSpeak);
      }
    };

    const handleMouseLeave = () => {
      cancelPendingSpeech();
    };

    // Use event delegation for better performance
    container.addEventListener('mouseenter', handleMouseEnter, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
      cancelPendingSpeech();
    };
  }, [isTtsEnabled, speakWithDelay, cancelPendingSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPendingSpeech();
    };
  }, [cancelPendingSpeech]);

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
}

/**
 * Hook to get manual TTS controls when needed
 */
export function useGlobalTts() {
  const { isTtsEnabled, language } = useApp();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPendingSpeech = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopSpeaking();
  }, []);

  const speak = useCallback((text: string) => {
    if (!isTtsEnabled || !text.trim()) return;
    
    cancelPendingSpeech();
    
    timeoutRef.current = setTimeout(() => {
      speakText(text, language as Language);
      timeoutRef.current = null;
    }, SPEAK_DELAY_MS);
  }, [isTtsEnabled, language, cancelPendingSpeech]);

  return {
    speak,
    cancelPendingSpeech,
    isTtsEnabled,
  };
}
