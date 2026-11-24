import React, { useState, useEffect, useRef, useMemo } from 'react';
import { gameAudio, isAndroidDevice } from './utils';
import { DieData } from './types';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { CachedImage } from './CachedImage';
import {
  CATALOG_CREATURES_J1,
  CATALOG_ASCENDED_TITANS,
  calculateCreatureStats,
} from './gameCatalogData';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const EXIT_ICON_CANDIDATES = [
  `${MAIN_CDN_BASE}/icono_salir.webp`,
  `${MAIN_RAW_BASE}/icono_salir.webp`,
  './assets/icono_salir.webp',
];

export interface NewCampaignModalProps {
  isOpen: boolean;
  nameInput: string;
  setNameInput: (name: string) => void;
  onConfirmName: (e?: React.FormEvent) => boolean | void | Promise<boolean | void>;
  onClose: () => void;
  assignedSummary: {
    name: string;
    hasEpic: boolean;
    hasLegendary: boolean;
    slots: number;
  } | null;
  secretCodeActivatedModal: boolean;
  playerDeck: DieData[];
  onConfirmSummary: () => void;
  FullscreenGameLogo: React.FC<{ className?: string }>;
}

interface AmbientMote {
  id: number;
  leftPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
  driftPx: number;
  kind: 'ember' | 'dust';
  color: string;
}

const AMBIENT_MOTES: AmbientMote[] = Array.from({ length: 24 }, (_, i) => {
  const isEmber = i % 2 === 0;
  return {
    id: i,
    leftPct: 4 + ((i * 19) % 92),
    sizePx: isEmber ? 3 + (i % 3) : 2 + (i % 3),
    durationSec: isEmber ? 3.4 + (i % 5) * 0.55 : 4.8 + (i % 4) * 0.7,
    delaySec: -(i * 0.42),
    driftPx: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 7),
    kind: isEmber ? 'ember' : 'dust',
    color: isEmber
      ? i % 4 === 0
        ? '#fb923c'
        : '#fbbf24'
      : i % 3 === 0
      ? '#38bdf8'
      : '#fde68a',
  };
});

function DieFacePips({ value, dotColor = '#fbbf24' }: { value: number; dotColor?: string }) {
  const dotsMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [
      [28, 28],
      [72, 72],
    ],
    3: [
      [26, 26],
      [50, 50],
      [74, 74],
    ],
    4: [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    5: [
      [26, 26],
      [74, 26],
      [50, 50],
      [26, 74],
      [74, 74],
    ],
    6: [
      [28, 24],
      [72, 24],
      [28, 50],
      [72, 50],
      [28, 76],
      [72, 76],
    ],
  };
  const points = dotsMap[value] || dotsMap[1];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full block">
      {points.map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r={10} fill={dotColor} />
      ))}
    </svg>
  );
}

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  nameInput,
  setNameInput,
  onConfirmName,
  onClose,
  assignedSummary,
  secretCodeActivatedModal,
  playerDeck,
  onConfirmSummary,
  FullscreenGameLogo,
}) => {
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSm = isAndroid ? '' : 'backdrop-blur-sm';
  const visibleMotes = useMemo(() => (isAndroid ? AMBIENT_MOTES.slice(0, 8) : AMBIENT_MOTES), [isAndroid]);
  const summaryDice = useMemo(() => playerDeck.slice(0, 24), [playerDeck]);
  const totalDiceCount = summaryDice.length;

  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [inspectedDieIdx, setInspectedDieIdx] = useState<number | null>(null);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [isSubmittingName, setIsSubmittingName] = useState<boolean>(false);
  const isSubmittingNameRef = useRef<boolean>(false);

  const revealTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const collectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (submitResetTimerRef.current) {
        clearTimeout(submitResetTimerRef.current);
        submitResetTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (submitResetTimerRef.current) {
      clearTimeout(submitResetTimerRef.current);
      submitResetTimerRef.current = null;
    }
    isSubmittingNameRef.current = false;
    setIsSubmittingName(false);
  }, [isOpen, assignedSummary]);

  const resetSubmittingState = () => {
    if (submitResetTimerRef.current) {
      clearTimeout(submitResetTimerRef.current);
      submitResetTimerRef.current = null;
    }
    isSubmittingNameRef.current = false;
    if (isMountedRef.current) {
      setIsSubmittingName(false);
    }
  };

  const handleSubmitName = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmittingNameRef.current) return;
    isSubmittingNameRef.current = true;
    setIsSubmittingName(true);

    try {
      const result = onConfirmName(e);
      if (result === false) {
        resetSubmittingState();
        return;
      }
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>)
          .then((resolved) => {
            if (resolved === false || isOpenRef.current) {
              resetSubmittingState();
            }
          })
          .catch(() => {
            resetSubmittingState();
          });
        return;
      }
      if (result !== true) {
        if (submitResetTimerRef.current) {
          clearTimeout(submitResetTimerRef.current);
        }
        submitResetTimerRef.current = setTimeout(() => {
          submitResetTimerRef.current = null;
          if (isMountedRef.current && isOpenRef.current) {
            resetSubmittingState();
          }
        }, 180);
      }
    } catch (_) {
      resetSubmittingState();
    }
  };

  const clearRevealTimers = () => {
    revealTimersRef.current.forEach((t) => clearTimeout(t));
    revealTimersRef.current = [];
  };

  useEffect(() => {
    clearRevealTimers();
    if (collectTimerRef.current) {
      clearTimeout(collectTimerRef.current);
      collectTimerRef.current = null;
    }

    if (!assignedSummary) {
      setRevealedCount(0);
      setInspectedDieIdx(null);
      setIsCollecting(false);
      return;
    }

    setRevealedCount(0);
    setInspectedDieIdx(null);
    setIsCollecting(false);

    // Revelación progresiva en oleadas por fila (4 filas de 6 dados) con choque de piedra/metal
    const rowWavePauseMs = 150;
    const perDieStepMs = 60;

    summaryDice.forEach((die, idx) => {
      const rowIdx = Math.floor(idx / 6);
      const colIdx = idx % 6;
      const delayMs = 220 + rowIdx * (6 * perDieStepMs + rowWavePauseMs) + colIdx * perDieStepMs;

      const timerId = setTimeout(() => {
        setRevealedCount((prev) => Math.max(prev, idx + 1));

        const rarityName = die.rarity?.name || 'Normal';
        if (rarityName === 'Legendario') {
          gameAudio.playSwordClash();
          gameAudio.playLevelUpStinger();
        } else if (rarityName === 'Épico') {
          gameAudio.playSwordClash();
          gameAudio.playPowerupChime();
        } else if (colIdx === 0 || colIdx === 3) {
          gameAudio.playFootstepStone();
          if (colIdx === 0) {
            gameAudio.playSwordClash();
          }
        }
      }, delayMs);

      revealTimersRef.current.push(timerId);
    });

    return () => {
      clearRevealTimers();
      if (collectTimerRef.current) {
        clearTimeout(collectTimerRef.current);
        collectTimerRef.current = null;
      }
    };
  }, [assignedSummary, summaryDice]);

  if (!isOpen && !assignedSummary) return null;

  const isRevealComplete = revealedCount >= totalDiceCount;

  const handleRevealAllNow = () => {
    if (isRevealComplete || isCollecting) return;
    clearRevealTimers();
    setRevealedCount(totalDiceCount);
    gameAudio.playSwordClash();
    gameAudio.playPowerupChime();
  };

  const handleEnterCamp = () => {
    if (isCollecting) return;
    clearRevealTimers();
    setInspectedDieIdx(null);
    setRevealedCount(totalDiceCount);
    setIsCollecting(true);
    gameAudio.playCoinPickup();
    gameAudio.playPowerupChime();

    collectTimerRef.current = setTimeout(() => {
      setIsCollecting(false);
      onConfirmSummary();
    }, 620);
  };

  const inspectedDie =
    inspectedDieIdx !== null && summaryDice[inspectedDieIdx]
      ? summaryDice[inspectedDieIdx]
      : null;

  const getCollectVector = (idx: number) => {
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    const offsetX = (5 - col) * 42;
    const offsetY = (4.2 - row) * 54;
    return { offsetX, offsetY };
  };

  const accentColor = assignedSummary?.hasLegendary
    ? '#f59e0b'
    : assignedSummary?.hasEpic
    ? '#c084fc'
    : '#f59e0b';

  return (
    <>
      <style>{`
        @keyframes ncmEmberRise {
          0% { transform: translate3d(0, 12px, 0) scale(0.5); opacity: 0; }
          18% { opacity: 0.9; }
          75% { opacity: 0.65; }
          100% { transform: translate3d(var(--ncm-drift, 16px), -180px, 0) scale(1.15); opacity: 0; }
        }
        @keyframes ncmDustFloat {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.15; }
          50% { transform: translate3d(var(--ncm-drift, -14px), -55px, 0) scale(1.2); opacity: 0.75; }
          100% { transform: translate3d(0, -110px, 0) scale(0.6); opacity: 0; }
        }
        @keyframes ncmHeaderPulse {
          0%, 100% {
            box-shadow: 0 0 22px rgba(245, 158, 11, 0.35), inset 0 0 12px rgba(245, 158, 11, 0.12);
          }
          50% {
            box-shadow: 0 0 38px rgba(251, 191, 36, 0.65), inset 0 0 18px rgba(245, 158, 11, 0.25);
          }
        }
        @keyframes ncmDieDropReveal {
          0% {
            opacity: 0;
            transform: translate3d(0, -24px, 0) scale(0.65) rotateZ(-6deg);
            filter: brightness(2) saturate(1.35);
          }
          62% {
            opacity: 1;
            transform: translate3d(0, 3px, 0) scale(1.07) rotateZ(1.5deg);
            filter: brightness(1.3);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1) rotateZ(0deg);
            filter: brightness(1);
          }
        }
        @keyframes ncmMysteryAura {
          0%, 100% {
            box-shadow: inset 0 0 14px rgba(245, 158, 11, 0.32), 0 0 10px rgba(249, 115, 22, 0.22);
          }
          50% {
            box-shadow: inset 0 0 24px rgba(251, 191, 36, 0.6), 0 0 18px rgba(249, 115, 22, 0.48);
          }
        }
        .ncm-header-pulse {
          animation: ncmHeaderPulse 2.8s ease-in-out infinite;
        }
        .ncm-die-reveal {
          animation: ncmDieDropReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ncm-mystery-tile {
          animation: ncmMysteryAura 1.4s ease-in-out infinite;
        }
      `}</style>

      {/* 1. ELECCIÓN DE NOMBRE PARA NUEVA CAMPAÑA (ESTILO PANORÁMICO UNIFICADO) */}
      {isOpen && !assignedSummary && (
        <div className="fixed inset-0 z-[95] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
          {/* Fondo panorámico oficial con viñeta radial */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
            <FullscreenGameLogo className="brightness-70 contrast-115" />
            <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/40 to-black/85 pointer-events-none" />
          </div>

          {/* Barra superior idéntica a las demás pantallas */}
          <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2">
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                NUEVA AVENTURA • EL LEGADO
              </span>
              <h2 className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] text-amber-300 uppercase">
                SÉ BIENVENIDO, VIAJERO
              </h2>
            </div>

            <button
              type="button"
              disabled={isSubmittingName}
              onClick={() => {
                if (isSubmittingNameRef.current) return;
                gameAudio.playCrispClick();
                onClose();
              }}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 group relative ${blurMd} shrink-0`}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
              }}
              aria-label="Volver"
            >
              <CachedImage
                cacheKey="icono_salir_main"
                candidateUrls={EXIT_ICON_CANDIDATES}
                alt="Volver"
                loading="eager"
                fallbackPlaceholder={<></>}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
                style={{ mixBlendMode: 'screen' }}
              />
              <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
                VOLVER
              </span>
            </button>
          </div>

          {/* Tarjeta central translúcida de nombre */}
          <div
            className={`relative z-10 my-auto max-w-md w-full bg-black/85 border border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center flex flex-col items-center ${blurMd}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase mb-1">
              IDENTIDAD DEL INVOCADOR
            </span>
            <p className="text-xs sm:text-sm font-serif text-slate-200 mb-4 leading-relaxed">
              ¿Cuál es tu nombre antes de forjar tus 24 dados iniciales?
            </p>

            <form
              onSubmit={handleSubmitName}
              className="w-full flex flex-col items-center gap-3.5"
            >
              <input
                type="text"
                maxLength={20}
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    handleSubmitName(e);
                  }
                }}
                placeholder="Escribe tu nombre..."
                className="w-full px-5 py-2.5 rounded-full bg-slate-950/90 border border-amber-500/70 text-amber-200 text-center font-serif font-bold text-sm sm:text-base focus:outline-none focus:border-amber-300 focus:shadow-[0_0_25px_rgba(245,158,11,0.5)] placeholder-slate-500 transition"
              />

              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                <button
                  type="button"
                  disabled={isSubmittingName}
                  onClick={() => {
                    if (isSubmittingNameRef.current) return;
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-2xl bg-black/85 hover:bg-slate-900 text-slate-300 hover:text-white font-serif font-bold text-xs tracking-wider border border-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CANCELAR
                </button>

                <button
                  type="button"
                  disabled={isSubmittingName}
                  onClick={() => handleSubmitName()}
                  className="py-2.5 px-4 rounded-2xl bg-black/90 hover:bg-amber-950/60 text-amber-300 font-serif font-black text-xs sm:text-sm tracking-wider border border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.45)] transition transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingName ? 'FORJANDO...' : 'FORJAR DESTINO'}
                </button>
              </div>
            </form>
          </div>

          <div className="w-full h-2" />
        </div>
      )}

      {/* 2. PANTALLA COMPLETA DE DESTINO FORJADO (ESTILO UNIFICADO CON CÓDICE / TALLER / FORJA / CAMPAÑAS) */}
      {assignedSummary && (
        <div className="fixed inset-0 z-[96] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
          {/* FONDO PANORÁMICO CON VIÑETA RADIAL Y PARTÍCULAS AMBIENTALES (único montaje compartido con el inspector) */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
            <FullscreenGameLogo
              className={inspectedDie ? 'brightness-45 contrast-115' : 'brightness-50 contrast-115 scale-105'}
            />
            <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/45 to-black/90 pointer-events-none" />
            {!inspectedDie && (
              <div
                className="absolute inset-0 opacity-60 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${accentColor}22 0%, transparent 70%)`,
                }}
              />
            )}
            {!inspectedDie && visibleMotes.map((m) => (
              <span
                key={m.id}
                className="absolute rounded-full pointer-events-none"
                style={
                  {
                    left: `${m.leftPct}%`,
                    bottom: m.kind === 'ember' ? '3%' : `${15 + (m.id % 5) * 14}%`,
                    width: `${m.sizePx}px`,
                    height: `${m.sizePx}px`,
                    backgroundColor: m.color,
                    boxShadow: isAndroid ? undefined : `0 0 ${m.sizePx * 3}px ${m.color}`,
                    ['--ncm-drift' as string]: `${m.driftPx}px`,
                    animation: `${m.kind === 'ember' ? 'ncmEmberRise' : 'ncmDustFloat'} ${m.durationSec}s linear ${m.delaySec}s infinite`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* BARRA SUPERIOR ELEGANTE IDÉNTICA A CÓDICE / TALLER / FORJA / TIENDA */}
          <div
            className={`relative z-10 w-full max-w-5xl flex flex-wrap items-center justify-between pt-1 gap-2 ${
              inspectedDie ? 'invisible pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            <div
              className={`flex flex-col text-left px-3.5 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd} ${isAndroid ? '' : 'ncm-header-pulse'}`}
              style={{ borderColor: `${accentColor}80` }}
            >
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                FORJA DEL DESTINO • MAZO INICIAL ({totalDiceCount} DADOS)
              </span>
              <h2
                className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
                style={{ color: accentColor }}
              >
                ¡DESTINO FORJADO, {assignedSummary.name.toUpperCase()}!
              </h2>
            </div>

            {/* Botón Revelar Todo en la esquina superior derecha */}
            {!isRevealComplete && !isCollecting && (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleRevealAllNow}
                  className={`px-3.5 py-1.5 rounded-full bg-black/85 hover:bg-amber-950/70 text-amber-300 border border-amber-400/80 text-[10px] sm:text-xs font-serif font-black tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] transition active:scale-95 cursor-pointer ${blurMd}`}
                >
                  REVELAR TODO ⚡
                </button>
              </div>
            )}
          </div>

          {/* ZONA CENTRAL TRANSLÚCIDA SIN CAJA PESADA: CARTAS DE LOS 24 DADOS */}
          <div
            className={`relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              inspectedDie ? 'invisible pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {secretCodeActivatedModal && (
              <div className={`w-full p-2.5 sm:p-3 mb-3 bg-black/85 border border-amber-400 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.45)] ${blurMd} text-center animate-pulse shrink-0`}>
                <span className="font-serif font-black text-xs sm:text-sm text-amber-300 block">
                  ★ ¡CÓDIGO SECRETO ACTIVADO!
                </span>
                <span className="text-[10.5px] text-slate-200 font-sans mt-0.5 block">
                  Las <strong>4 Campañas del Reino</strong> (1, 2, 3 y 4) han sido desbloqueadas con acceso inmediato desde el selector.
                </span>
              </div>
            )}

            {/* Barra informativa de inspección */}
            <div className={`flex items-center justify-start gap-2 mb-3 p-2.5 sm:p-3 rounded-2xl bg-black/80 border border-amber-500/40 ${blurMd} shrink-0 shadow-lg`}>
              <p className="text-[10.5px] sm:text-xs text-slate-300 font-sans text-left">
                {isCollecting
                  ? 'Transfiriendo tus dados al Taller de Campaña...'
                  : 'Toca o haz clic en cualquier dado revelado para inspeccionar sus 6 caras rúnicas y estadísticas.'}
              </p>
            </div>

            {/* Cuadrícula de cartas de dados estilo Códice / Tienda */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3 pb-2">
              {summaryDice.map((die, dIdx) => {
                const isRevealed = dIdx < revealedCount;
                const rarityName = die.rarity?.name || 'Normal';
                const dieCacheKey = getDieImageCacheKey(die.name, die.id, rarityName);
                const candidateUrls = getDieImageCandidateUrls(die.name, die.id, rarityName);
                const isLegendary = rarityName === 'Legendario';
                const isEpic = rarityName === 'Épico';
                const isRare = rarityName === 'Raro';
                const isSelectedInspect = inspectedDieIdx === dIdx;
                const rarityColor = die.rarity?.color || '#94a3b8';

                const cubeBg = isLegendary
                  ? 'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 text-black'
                  : isEpic
                  ? 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-purple-800 text-white'
                  : isRare
                  ? 'bg-gradient-to-br from-cyan-500 via-sky-400 to-blue-600 text-white'
                  : 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 text-white';

                const { offsetX, offsetY } = getCollectVector(dIdx);

                if (!isRevealed) {
                  return (
                    <div
                      key={die.id || dIdx}
                      className={`p-2.5 rounded-2xl bg-black/80 border border-amber-500/45 min-h-[122px] sm:min-h-[132px] flex flex-col items-center justify-center relative overflow-hidden ${blurMd} ${isAndroid ? '' : 'ncm-mystery-tile'}`}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-60"
                        style={{
                          background:
                            'radial-gradient(circle at center, rgba(251,146,60,0.4) 0%, rgba(245,158,11,0.12) 60%, transparent 88%)',
                        }}
                      />
                      <span className="text-2xl relative z-10 animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]">
                        🔥
                      </span>
                      <span className="text-[9px] font-mono font-bold text-amber-300/90 mt-1.5 relative z-10 tracking-widest">
                        SELLADO
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={die.id || dIdx}
                    type="button"
                    onClick={() => {
                      if (isCollecting) return;
                      gameAudio.playCrispClick();
                      setInspectedDieIdx((prev) => (prev === dIdx ? null : dIdx));
                    }}
                    className={`p-2.5 rounded-2xl bg-black/85 border flex flex-col justify-between text-left relative group cursor-pointer ${blurMd} shadow-lg ${
                      isCollecting ? '' : 'ncm-die-reveal'
                    } ${
                      isSelectedInspect
                        ? 'ring-2 ring-amber-300 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.75)]'
                        : isLegendary
                        ? 'border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.5)] hover:border-amber-200'
                        : isEpic
                        ? 'border-purple-400 shadow-[0_0_18px_rgba(192,132,252,0.4)] hover:border-purple-200'
                        : 'border-slate-700/80 hover:border-amber-400'
                    }`}
                    style={{
                      borderColor: isSelectedInspect ? '#fcd34d' : `${rarityColor}80`,
                      transitionProperty: 'transform, opacity, border-color, box-shadow',
                      transitionDuration: isCollecting ? '460ms' : '180ms',
                      transitionTimingFunction: isCollecting ? 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' : 'ease-out',
                      transitionDelay: isCollecting ? `${dIdx * 12}ms` : '0ms',
                      transform: isCollecting
                        ? `translate3d(${offsetX}px, ${offsetY}px, 0) scale(0.12) rotate(12deg)`
                        : 'translate3d(0, 0, 0) scale(1)',
                      opacity: isCollecting ? 0 : 1,
                    }}
                  >
                    <div className="w-full h-16 sm:h-20 rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden relative mb-2 flex items-center justify-center p-1">
                      <CachedImage
                        cacheKey={dieCacheKey}
                        candidateUrls={candidateUrls}
                        alt={die.name}
                        loading="eager"
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-200 relative z-10"
                        fallbackPlaceholder={
                          <div className={`w-12 h-12 flex items-center justify-center ${cubeBg} rounded-xl p-1.5`}>
                            <DieFacePips
                              value={Math.min(6, Math.max(1, die.level || 1))}
                              dotColor={isLegendary ? '#000000' : '#ffffff'}
                            />
                          </div>
                        }
                      />
                      <span className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] bg-black/85 px-1.5 py-0.2 rounded-full border border-amber-400/50 text-amber-200 pointer-events-none">
                        🔍
                      </span>
                    </div>

                    <div className="min-w-0 w-full">
                      <span
                        className="font-serif font-bold text-[10.5px] sm:text-xs truncate block"
                        style={{ color: isLegendary || isEpic || isRare ? rarityColor : '#f1f5f9' }}
                      >
                        {die.name}
                      </span>
                      <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-800/80">
                        <span
                          className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border"
                          style={{
                            color: rarityColor,
                            borderColor: `${rarityColor}55`,
                            backgroundColor: `${rarityColor}18`,
                          }}
                        >
                          {rarityName}
                        </span>
                        <span className="text-[8.5px] font-mono text-slate-400">
                          {die.rarity?.slots ?? 0}R
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIE DE PANTALLA ESTILO CAMPAIGNSELECTOR / TALLER / FORJA */}
          <div
            className={`relative z-10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 pb-1 ${
              inspectedDie ? 'invisible pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Tarjeta informativa izquierda */}
            <div className={`flex-1 w-full sm:max-w-xl px-4 py-2.5 rounded-2xl bg-black/85 border border-amber-500/40 ${blurMd} text-left shadow-2xl flex items-center gap-3`}>
              <div className="min-w-0">
                {assignedSummary.hasLegendary ? (
                  <>
                    <span className="text-xs font-serif font-black text-amber-300 block truncate">
                      ★ ¡DADO LEGENDARIO OBTENIDO! (3 ranuras doradas)
                    </span>
                    <span className="text-[10px] text-slate-300 font-sans block truncate">
                      {assignedSummary.hasEpic
                        ? 'Además incluye Dado Épico (2 ranuras) • Toca un dado para ver sus 6 caras.'
                        : 'Podrás engarzar hasta 3 orbes elementales en el Taller de Dados.'}
                    </span>
                  </>
                ) : assignedSummary.hasEpic ? (
                  <>
                    <span className="text-xs font-serif font-black text-purple-300 block truncate">
                      ✦ ¡DADO ÉPICO OBTENIDO! (2 ranuras de orbes)
                    </span>
                    <span className="text-[10px] text-slate-300 font-sans block truncate">
                      Equípale orbes en el Taller para potenciar tus invocaciones.
                    </span>
                  </>
                ) : (
                  <span className="text-[10.5px] sm:text-xs text-slate-300 font-sans block truncate">
                    Fusión, orbes y preajustes disponibles en el Taller del Campamento.
                  </span>
                )}
              </div>
            </div>

            {/* Botón principal luminoso derecha */}
            <button
              type="button"
              disabled={isCollecting}
              onClick={handleEnterCamp}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${blurMd} shadow-2xl shrink-0`}
              style={{
                backgroundColor: isCollecting ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0, 0, 0, 0.85)',
                borderColor: accentColor,
                boxShadow: `0 0 28px ${accentColor}65, inset 0 0 14px ${accentColor}35`,
              }}
            >
              <span
                className="text-xs sm:text-sm font-black font-serif tracking-widest uppercase"
                style={{ color: accentColor }}
              >
                {isCollecting
                  ? `GUARDANDO ${totalDiceCount} DADOS...`
                  : 'ENTRAR AL CAMPAMENTO'}
              </span>
            </button>
          </div>

          {/* SUBMODAL INSPECTOR DETALLADO ESTILO CÓDICE ("INSPECCIÓN DEL SABER") (reutiliza el único fondo del resumen) */}
          {inspectedDie && inspectedDieIdx !== null && (
            <div
              className={`fixed inset-0 z-[105] flex flex-col items-center justify-between p-3 sm:p-6 select-none ${isAndroid ? 'bg-black/90' : `bg-black/85 ${blurSm}`} animate-fadeIn`}
              onClick={() => {
                gameAudio.playCrispClick();
                setInspectedDieIdx(null);
              }}
            >

              {/* Barra superior estilo CodexView */}
              <div
                className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
                    INSPECCIÓN DE DADO • #{inspectedDieIdx + 1}/{totalDiceCount}
                  </span>
                  <h2
                    className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase"
                    style={{ color: inspectedDie.rarity?.color || '#fbbf24' }}
                  >
                    {inspectedDie.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setInspectedDieIdx(null);
                  }}
                  className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
                  }}
                  aria-label="Cerrar inspector de dado"
                >
                  <CachedImage
                    cacheKey="icono_salir_main"
                    candidateUrls={EXIT_ICON_CANDIDATES}
                    alt="Volver"
                    loading="eager"
                    fallbackPlaceholder={<></>}
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter brightness-110 contrast-110 pointer-events-none group-hover:scale-110 transition-transform"
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-amber-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
                    VOLVER
                  </span>
                </button>
              </div>

              {/* Contenedor central translúcido de observación */}
              <div
                className={`relative z-10 w-full max-w-xl my-auto flex flex-col gap-3 p-4 sm:p-5 bg-black/85 border-2 rounded-3xl ${blurMd} max-h-[80dvh] overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pointer-events-auto`}
                style={{
                  borderColor: inspectedDie.rarity?.color || '#f59e0b',
                  boxShadow: `0 0 45px ${inspectedDie.rarity?.color || '#f59e0b'}45`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3.5 border-b border-slate-800 pb-3">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border-2 overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-lg"
                    style={{ borderColor: inspectedDie.rarity?.color || '#94a3b8' }}
                  >
                    <CachedImage
                      cacheKey={getDieImageCacheKey(
                        inspectedDie.name,
                        inspectedDie.id,
                        inspectedDie.rarity?.name
                      )}
                      candidateUrls={getDieImageCandidateUrls(
                        inspectedDie.name,
                        inspectedDie.id,
                        inspectedDie.rarity?.name
                      )}
                      alt={inspectedDie.name}
                      loading="eager"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border"
                        style={{
                          color: inspectedDie.rarity?.color,
                          borderColor: `${inspectedDie.rarity?.color}70`,
                          backgroundColor: `${inspectedDie.rarity?.color}20`,
                        }}
                      >
                        {inspectedDie.rarity?.name || 'Normal'}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        💎 {inspectedDie.rarity?.slots ?? 0}{' '}
                        {(inspectedDie.rarity?.slots ?? 0) === 1 ? 'ranura de orbe' : 'ranuras de orbes'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-slate-300">
                      <span className="text-slate-400 font-serif font-bold">Ranuras:</span>
                      {(inspectedDie.rarity?.slots ?? 0) === 0 ? (
                        <span className="text-slate-400 italic">Sin ranuras (fusiona 3 en el Taller)</span>
                      ) : (
                        Array.from({ length: inspectedDie.rarity?.slots ?? 0 }).map((_, sIdx) => (
                          <span
                            key={sIdx}
                            className="w-4 h-4 rounded-full border border-dashed border-amber-400/70 bg-slate-900 inline-flex items-center justify-center text-[8px] text-amber-300"
                          >
                            ◇
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Las 6 Caras del Dado */}
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 block mb-2">
                    Caras Rúnicas del Dado (1 – 6):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((faceVal) => {
                      const creature = CATALOG_CREATURES_J1.find((c) => c.nivel === faceVal);
                      const titan = CATALOG_ASCENDED_TITANS.find((t) => t.id === faceVal);
                      const baseStats = calculateCreatureStats(faceVal, 1);

                      return (
                        <div
                          key={faceVal}
                          className="p-2 rounded-xl bg-black/80 border border-slate-800 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="w-6 h-6 rounded-md bg-slate-900 border border-amber-500/50 p-0.5 shrink-0">
                              <DieFacePips value={faceVal} dotColor="#fbbf24" />
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-300">
                              Cara {faceVal} • Lv.{faceVal}
                            </span>
                          </div>
                          <span className="font-serif font-bold text-[10px] text-slate-100 truncate">
                            {creature?.nombre || `Guardián Lv.${faceVal}`}
                          </span>
                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-emerald-400">{baseStats.hp} HP</span>
                            <span className="text-rose-400">{baseStats.atk} ATK</span>
                            <span className="text-cyan-300">Mov: {creature?.mov ?? 1}</span>
                          </div>
                          {titan && (
                            <span className="text-[8.5px] text-amber-300/90 font-sans truncate border-t border-slate-800/80 pt-0.5">
                              Triple: {titan.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-sans leading-snug bg-slate-900/75 border border-slate-800 rounded-xl p-2 text-center">
                  Empareja 2 caras iguales para invocar la criatura de ese nivel (el 3.er dado define su Rango de Maestría) o consigue un triple idéntico para despertar un Titán Ascendido.
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setInspectedDieIdx((prev) =>
                        prev === null ? 0 : (prev - 1 + totalDiceCount) % totalDiceCount
                      );
                    }}
                    className="px-3.5 py-1.5 rounded-2xl bg-black/85 hover:bg-slate-900 text-slate-200 border border-slate-700 hover:border-amber-400 text-[10.5px] font-serif font-bold cursor-pointer active:scale-95 transition"
                  >
                    ◀ Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setInspectedDieIdx((prev) =>
                        prev === null ? 0 : (prev + 1) % totalDiceCount
                      );
                    }}
                    className="px-3.5 py-1.5 rounded-2xl bg-black/85 hover:bg-slate-900 text-slate-200 border border-slate-700 hover:border-amber-400 text-[10.5px] font-serif font-bold cursor-pointer active:scale-95 transition"
                  >
                    Siguiente ▶
                  </button>
                </div>
              </div>

              <div className="w-full h-2" />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default NewCampaignModal;
