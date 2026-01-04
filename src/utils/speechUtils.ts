// Free browser-based Text-to-Speech using Web Speech API
// Supports multiple languages including English, Chinese, Malay, Tamil

export type Language = 'en' | 'zh' | 'ms' | 'ta';

// Language codes for Web Speech API
// Tamil has limited browser support - we try multiple variants and use Hindi as last resort
const languageVoiceCodes: Record<Language, string[]> = {
  en: ['en-SG', 'en-GB', 'en-US', 'en'],
  zh: ['zh-CN', 'zh-SG', 'zh-TW', 'zh'],
  ms: ['ms-MY', 'ms', 'id-ID'], // Malay or Indonesian as fallback
  ta: ['ta-IN', 'ta-SG', 'ta-LK', 'ta', 'hi-IN'], // Tamil with Hindi fallback for better support
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks the given text in the specified language using Web Speech API
 * @param text - The text to speak
 * @param language - The language code ('en', 'zh', 'ms', 'ta')
 */
export const speakText = (text: string, language: Language = 'en'): void => {
  // Cancel any ongoing speech
  stopSpeaking();

  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported in this browser');
    return;
  }

  // Ensure voices are loaded
  let voices = window.speechSynthesis.getVoices();
  
  // If voices aren't loaded yet, wait for them
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      doSpeak(text, language, voices);
    };
    // Also try after a short delay
    setTimeout(() => {
      voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        doSpeak(text, language, voices);
      }
    }, 100);
    return;
  }

  doSpeak(text, language, voices);
};

const doSpeak = (text: string, language: Language, voices: SpeechSynthesisVoice[]): void => {
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  // Find a suitable voice for the language
  const langCodes = languageVoiceCodes[language];
  let selectedVoice: SpeechSynthesisVoice | null = null;

  for (const langCode of langCodes) {
    const voice = voices.find(v => 
      v.lang.toLowerCase().startsWith(langCode.toLowerCase()) ||
      v.lang.toLowerCase() === langCode.toLowerCase()
    );
    if (voice) {
      selectedVoice = voice;
      break;
    }
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    // Fallback to first language code
    utterance.lang = langCodes[0];
  }

  // Voice settings for elderly users - slower and clearer
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onend = () => {
    currentUtterance = null;
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    currentUtterance = null;
  };

  window.speechSynthesis.speak(utterance);
};

/**
 * Stops any ongoing speech
 */
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

/**
 * Checks if speech synthesis is currently speaking
 */
export const isSpeaking = (): boolean => {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
};

/**
 * Preload voices (call on app init)
 */
export const preloadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };

    // Fallback timeout
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
};
