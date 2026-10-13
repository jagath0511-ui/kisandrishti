export type SpeechLang = 'en' | 'te' | 'hi';
export type SpeechSpeed = 'normal' | 'slow';

const LANG_CODE_MAP: Record<SpeechLang, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
};

const LANG_DISPLAY_NAMES: Record<SpeechLang, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Initializes and caches speech synthesis voices, listening for late-loading voiceschanged event.
 */
export function initVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  cachedVoices = window.speechSynthesis.getVoices();

  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }

  return cachedVoices;
}

/**
 * Finds the best matching voice for the target language.
 * Handles exact BCP-47 match (e.g. 'te-IN') and language prefix fallback (e.g. 'te').
 */
export function getBestVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const targetCode = LANG_CODE_MAP[lang].toLowerCase();
  const prefix = targetCode.split('-')[0];

  // 1. Exact match (e.g. te-IN)
  const exact = voices.find((v) => v.lang.toLowerCase() === targetCode || v.lang.toLowerCase().replace('_', '-') === targetCode);
  if (exact) return exact;

  // 2. Prefix match (e.g. starts with 'te')
  const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (prefixMatch) return prefixMatch;

  // 3. For English, fallback to any available English voice (en-US, en-GB, etc.)
  if (lang === 'en') {
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEn) return anyEn;
  }

  return null;
}

/**
 * Checks whether a voice for the chosen language is installed on this device.
 */
export function isVoiceAvailable(lang: SpeechLang): boolean {
  return getBestVoice(lang) !== null;
}

export interface SpeakOptions {
  text: string;
  lang: SpeechLang;
  speed?: SpeechSpeed;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Speaks text using the browser Web Speech API.
 * Ensures user-tapped execution, rate control, and clear missing-voice feedback.
 */
export function speakText(options: SpeakOptions): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.('Voice speech is not supported on this browser.');
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean and prepare short spoken text
  const cleanText = options.text.trim();
  if (!cleanText) {
    return false;
  }

  // Check voice availability
  const voice = getBestVoice(options.lang);
  if (!voice) {
    const langName = LANG_DISPLAY_NAMES[options.lang] || options.lang;
    const msg = `Voice for ${langName} is not available on this phone. Please read the text.`;
    options.onError?.(msg);
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.voice = voice;
  utterance.lang = voice.lang || LANG_CODE_MAP[options.lang];

  // Speed configuration (Section 8: normal 1.0, slow 0.75 for clarity)
  utterance.rate = options.speed === 'slow' ? 0.75 : 0.95;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    if (e.error === 'canceled' || e.error === 'interrupted') {
      options.onEnd?.();
      return;
    }
    options.onError?.(`Speech error: ${e.error}`);
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Immediately stops any active speech.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
