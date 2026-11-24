import React, { useState, useEffect, useRef } from 'react';
import { gameAudio, isAndroidDevice } from './utils';
import { CachedImage } from './CachedImage';

export interface TypewriterDialogueProps {
  speaker: string;
  role?: string;
  fullText: string;
  avatarIcon?: string;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
  color?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  onClose: () => void;
  voicePitch?: number; // pitch variation
}

export function TypewriterDialogue({
  speaker,
  role,
  fullText,
  avatarIcon = '💬',
  avatarImgUrl,
  candidateAvatarUrls,
  color = '#f59e0b',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  onClose,
  voicePitch = 1,
}: TypewriterDialogueProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textIndexRef = useRef(0);
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;
  const voicePitchRef = useRef(voicePitch);
  voicePitchRef.current = voicePitch;
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textScrollRef = useRef<HTMLDivElement | null>(null);
  const lastToneTimeRef = useRef<number>(0);
  const isAndroid = isAndroidDevice();

  const resolvedCandidates = (
    candidateAvatarUrls && candidateAvatarUrls.length > 0
      ? candidateAvatarUrls
      : avatarImgUrl
      ? [avatarImgUrl]
      : []
  ).filter(Boolean);

  const safeSpeakerKey = (speaker || 'speaker')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_');
  const avatarCacheKey = `dialogue_avatar_${safeSpeakerKey}`;
  const isLongText = fullText.length > 110;

  useEffect(() => {
    setDisplayedText('');
    setIsFinished(false);
    setIsExpanded(false);
    textIndexRef.current = 0;
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    const tick = () => {
      if (textIndexRef.current < fullTextRef.current.length) {
        textIndexRef.current++;
        const nextChar = fullTextRef.current[textIndexRef.current - 1];
        setDisplayedText(fullTextRef.current.slice(0, textIndexRef.current));

        // Reproducir pequeño tintineo vocal con la variación de tono voicePitch (con throttling en Android)
        const minToneIntervalMs = isAndroid ? 95 : 42;
        const stepModulo = isAndroid ? 3 : 2;
        if (textIndexRef.current % stepModulo === 0 && nextChar !== ' ') {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - lastToneTimeRef.current >= minToneIntervalMs) {
            lastToneTimeRef.current = now;
            try {
              gameAudio.playHoverMicroTone(voicePitchRef.current);
            } catch (_) {}
          }
        }

        // Si es un signo de puntuación, pequeña pausa para ritmo natural
        const delay = nextChar === '.' || nextChar === '!' || nextChar === '?' ? 75 : nextChar === ',' ? 45 : 22;
        timeoutIdRef.current = setTimeout(tick, delay);
      } else {
        setIsFinished(true);
      }
    };

    timeoutIdRef.current = setTimeout(tick, 40);

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [fullText, speaker, isAndroid]);

  useEffect(() => {
    if (!isFinished && textScrollRef.current) {
      textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
    }
  }, [displayedText, isFinished]);

  // Permitir saltar la animación al hacer clic en el texto
  const handleFastForward = () => {
    if (!isFinished) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      textIndexRef.current = fullText.length;
      setDisplayedText(fullText);
      setIsFinished(true);
      gameAudio.playCrispClick();
    }
  };

  return (
    <div
      className={`w-[96vw] max-w-[620px] sm:w-[68vw] sm:max-w-[660px] md:max-w-[720px] mb-2 sm:mb-3 bg-black/95 border-2 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-row items-start sm:items-center gap-3 animate-fadeIn pointer-events-auto select-none ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
      style={{
        borderColor: color,
        boxShadow: `0 0 25px ${color}55`,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleFastForward();
      }}
    >
      {/* Retrato Izquierdo Apaisado con Caché Persistente */}
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative bg-slate-950 ring-1 ring-amber-400/30"
        style={{
          borderColor: color,
          boxShadow: `0 0 14px ${color}60`,
        }}
      >
        <CachedImage
          key={`${avatarCacheKey}_${resolvedCandidates[0] || 'fallback'}`}
          cacheKey={avatarCacheKey}
          candidateUrls={resolvedCandidates}
          alt={speaker}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover filter brightness-95"
          fallbackPlaceholder={
            <span className="text-2xl sm:text-3xl animate-pulse">{avatarIcon}</span>
          }
        />
      </div>

      {/* Contenido Central: Cabecera con Nombre y Botón de Acción arriba, y Texto completo desplazable/expandible abajo */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between border-b pb-1 gap-2" style={{ borderColor: `${color}40` }}>
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <h3 className="font-serif font-black text-xs sm:text-sm md:text-base truncate tracking-wide" style={{ color }}>
              {speaker}
            </h3>
            {role && (
              <span className="text-[10px] sm:text-xs text-slate-300 font-sans font-medium truncate">
                • {role}
              </span>
            )}
            <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">
              {!isFinished ? '⏩' : '✓'}
            </span>
          </div>

          {/* Botones de Expandir (textos largos) y Acción / Entendido */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isLongText && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  gameAudio.playCrispClick();
                  setIsExpanded((prev) => !prev);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {isExpanded ? '▲ Contraer' : '▼ Ampliar'}
              </button>
            )}

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (actionText && onAction) {
                  onAction();
                } else {
                  onClose();
                }
              }}
              className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-serif font-black text-[11px] sm:text-xs tracking-wide shadow-md border transition active:scale-95 cursor-pointer text-black text-center whitespace-nowrap"
              style={{
                backgroundColor: color,
                borderColor: '#ffffff',
                boxShadow: `0 0 14px ${color}70`,
              }}
            >
              {actionText || 'Entendido'}
            </button>

            {secondaryActionText && onSecondaryAction && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSecondaryAction();
                }}
                className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-serif font-black text-[11px] sm:text-xs tracking-wide shadow-md border border-amber-300/80 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black transition active:scale-95 cursor-pointer text-center whitespace-nowrap"
              >
                {secondaryActionText}
              </button>
            )}
          </div>
        </div>

        {/* Franja de Texto Desplazable y Expandible (sin truncado silencioso) */}
        <div
          ref={textScrollRef}
          className={`p-1.5 sm:p-2 rounded-lg bg-slate-950/80 border min-h-[38px] sm:min-h-[44px] ${
            isExpanded ? 'max-h-[42dvh] sm:max-h-[38dvh]' : 'max-h-24 sm:max-h-28'
          } overflow-y-auto touch-pan-y cursor-pointer shadow-inner w-full transition-all duration-200`}
          style={{ borderColor: `${color}30` }}
        >
          <p className="text-[11px] sm:text-xs md:text-[13px] font-serif text-slate-100 leading-snug italic whitespace-pre-wrap break-words">
            «{displayedText}»
            {!isFinished && <span className="inline-block w-1.5 h-2.5 ml-1 bg-amber-400 animate-ping align-middle" />}
          </p>
        </div>
      </div>
    </div>
  );
}
