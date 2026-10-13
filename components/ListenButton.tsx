'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square, AlertCircle, Gauge } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  speakText,
  stopSpeaking,
  initVoices,
  SpeechLang,
  SpeechSpeed,
} from '../lib/speech';

interface ListenButtonProps {
  text: string;
  lang?: SpeechLang;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function ListenButton({
  text,
  lang,
  label,
  className = '',
  compact = false,
}: ListenButtonProps) {
  const { locale, t } = useI18n();
  const currentLang = (lang || locale) as SpeechLang;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<SpeechSpeed>('normal');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    initVoices();
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleToggleSpeak = () => {
    setWarningMessage(null);

    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    const success = speakText({
      text,
      lang: currentLang,
      speed,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: (err) => {
        setIsPlaying(false);
        setWarningMessage(err);
      },
    });

    if (!success && !warningMessage) {
      // Error callback will have been called or handled
    }
  };

  const toggleSpeed = () => {
    const nextSpeed: SpeechSpeed = speed === 'normal' ? 'slow' : 'normal';
    setSpeed(nextSpeed);
    if (isPlaying) {
      // Re-speak with new speed
      stopSpeaking();
      speakText({
        text,
        lang: currentLang,
        speed: nextSpeed,
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: (err) => {
          setIsPlaying(false);
          setWarningMessage(err);
        },
      });
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {/* Main Listen / Stop Button */}
        <button
          type="button"
          onClick={handleToggleSpeak}
          className={`min-h-[48px] px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors border-2 cursor-pointer ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-amber-900 ring-2 ring-amber-300 animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 active:bg-black text-white border-slate-950'
          }`}
          aria-label={isPlaying ? 'Stop listening' : 'Listen to instructions aloud'}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-white shrink-0" aria-hidden="true" />
              <span>{t('speech.stop')}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
              <span>{label || t('speech.listen')}</span>
            </>
          )}
        </button>

        {/* Speed Option (Normal 1.0x / Slow 0.75x) */}
        {!compact && (
          <button
            type="button"
            onClick={toggleSpeed}
            className="min-h-[48px] px-2.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-black rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
            title="Toggle speech rate"
            aria-label={`Speech rate: currently ${speed}. Tap to toggle.`}
          >
            <Gauge className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>{speed === 'normal' ? '1.0x' : '0.75x'}</span>
          </button>
        )}
      </div>

      {/* Clear warning when voice is missing on device (Do not fail silently) */}
      {warningMessage && (
        <div className="p-2.5 bg-amber-50 border-2 border-amber-500 rounded-lg flex items-start gap-2 text-amber-950 text-xs font-bold leading-tight shadow-sm max-w-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{warningMessage}</span>
        </div>
      )}
    </div>
  );
}

