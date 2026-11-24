import React, { useState, useEffect } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { getCampaignImageCandidateUrls } from './campaignImageMap';
import { CachedImage } from './CachedImage';

export interface CampaignProgressEntry {
  status: 'INACTIVA' | 'EN_PROGRESO' | 'PAUSADA' | 'FINALIZADA';
  phase: 'ALLEY' | 'TOURNAMENT';
  fight: number;
  defeated: string[];
  round: 1 | 2 | 3;
  completed: boolean;
  completionsCount: number;
  claimedReward: boolean;
  campaignLosses: number;
  lastSavedTimestamp?: number;
}

export interface CampaignSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaignIndex: number;
  setSelectedCampaignIndex: (idx: number) => void;
  unlockedCampaigns: number[];
  activeCampaignIndex: number;
  campaignsProgress: Record<number, CampaignProgressEntry>;
  onLaunchCampaign: (indexToLaunch?: number, restartForce?: boolean) => void;
  onShowLockedAlert: (modalData: {
    campaignTitle: string;
    description: string;
    requirement: string;
    accentColor: string;
  }) => void;
}

export const CampaignSelectorModal: React.FC<CampaignSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCampaignIndex,
  setSelectedCampaignIndex,
  unlockedCampaigns,
  activeCampaignIndex,
  campaignsProgress,
  onLaunchCampaign,
  onShowLockedAlert,
}) => {
  const [confirmRestartIdx, setConfirmRestartIdx] = useState<number | null>(null);
  const isCompact = useCompactViewport(500, 640);

  useEffect(() => {
    setConfirmRestartIdx(null);
  }, [isOpen, selectedCampaignIndex]);

  const handleClose = () => {
    setConfirmRestartIdx(null);
    onClose();
  };
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const exitIconCandidates = [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/icono_salir.webp',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/icono_salir.webp',
    './assets/icono_salir.webp',
  ];

  if (!isOpen) return null;

  const campaignMetaList = [
    {
      idx: 0,
      num: 1,
      title: 'El Camino al Torneo',
      badge: 'OFICIAL',
      accent: '#f59e0b',
      sub: 'El torneo del legado por la corona suprema',
      desc: 'Supera 12 duelos en las callejuelas para clasificar y conquistar el Torneo de 8 Gladiadores.',
      reward: 'Corona del Alba, +6 HP y Dados Épicos',
      phaseInfo: '12 Callejuela • 3 Torneo',
    },
    {
      idx: 1,
      num: 2,
      title: 'Señores del Calabozo',
      badge: 'NIVEL MEDIO',
      accent: '#c084fc',
      sub: 'Profundidades abisales y trampas',
      desc: 'Enfrenta 12 guardianes con muros tácticos, veneno y el Torneo Élite de los 8 Señores.',
      reward: '+8 HP Máx, Orbe de Adamantio y Ranura Extra',
      phaseInfo: '12 Guardianes • 3 Torneo Élite',
    },
    {
      idx: 2,
      num: 3,
      title: 'Torneíllo del Recluta',
      badge: 'DIDÁCTICO',
      accent: '#34d399',
      sub: 'Camino didáctico de perfeccionamiento',
      desc: '12 combates accesibles de práctica y Torneo de Aficionados del Gran Maestro de la Arena.',
      reward: '+5 HP Máx, 500 Oro y Dado Raro Santificado',
      phaseInfo: '12 Práctica • 3 Aficionados',
    },
    {
      idx: 3,
      num: 4,
      title: 'Trono de las Sombras',
      badge: 'MODO MAESTRO',
      accent: '#f43f5e',
      sub: 'Máxima dificultad y acceso a la Gran Forja',
      desc: 'La Purga de los Caídos (12 estrategas oscuros) y el Torneo Supremo de los 8 Emperadores.',
      reward: '+12 HP Máx, Corona del Abismo y Fragua',
      phaseInfo: '12 Purga • 3 Emperadores',
    },
  ];

  const selectedMeta = campaignMetaList[selectedCampaignIndex] || campaignMetaList[0];
  const selectedProg = campaignsProgress[selectedCampaignIndex];
  const isSelectedUnlocked = unlockedCampaigns.includes(selectedCampaignIndex);
  const isSelectedCompleted = Boolean(selectedProg?.completed);

  // URLs dinámicas de la campaña seleccionada
  const selectedCampCandidates = getCampaignImageCandidateUrls(selectedCampaignIndex);

  const getCampaignProgressSummary = (prog?: CampaignProgressEntry) => {
    if (!prog) return { label: 'Sin Iniciar', detail: 'Combate 1', status: 'INACTIVA' };
    if (prog.completed) {
      return {
        label: `¡Conquistada! (${prog.completionsCount || 1}★)`,
        detail: 'Torneo Finalizado con Éxito',
        status: 'FINALIZADA',
      };
    }
    if (prog.phase === 'TOURNAMENT') {
      const roundName = prog.round === 3 ? 'Final' : prog.round === 2 ? 'Semifinales' : 'Cuartos de final';
      return {
        label: `Gran Torneo (${roundName})`,
        detail: `Ronda ${prog.round}/3 en la Arena`,
        status: 'EN_PROGRESO',
      };
    }
    const fight = prog.fight || 1;
    const defeatedCount = prog.defeated?.length || 0;
    return {
      label: `Callejuela (${fight}/12)`,
      detail: `${defeatedCount} rivales derrotados`,
      status: fight > 1 || defeatedCount > 0 ? 'EN_PROGRESO' : 'INACTIVA',
    };
  };

  const handleLaunchOrAlert = (idx: number, restart = false) => {
    const isUnlocked = unlockedCampaigns.includes(idx);
    const meta = campaignMetaList[idx] || campaignMetaList[0];
    if (isUnlocked) {
      gameAudio.playConfirmSelect();
      onLaunchCampaign(idx, restart);
    } else {
      gameAudio.playErrorBuzz();
      onShowLockedAlert({
        campaignTitle: `Campaña ${meta.num}: ${meta.title}`,
        description: meta.sub,
        requirement:
          idx === 3
            ? 'Debes coronarte Campeón Supremo en las Campañas 1, 2 y 3 para romper el sello del Trono.'
            : idx === 2
            ? 'Debes conquistar la Campaña 1 o resistir 20 combates en las Callejuelas.'
            : 'Debes conquistar la Campaña 1 (El Camino al Torneo) para desbloquear este desafío.',
        accentColor: meta.accent,
      });
    }
  };

  const handleIconClick = (idx: number) => {
    if (selectedCampaignIndex === idx) {
      handleLaunchOrAlert(idx);
    } else {
      setConfirmRestartIdx(null);
      setSelectedCampaignIndex(idx);
      gameAudio.playCrispClick();
    }
  };

  const currentSummary = getCampaignProgressSummary(selectedProg);
  const hasExistingProgress = Boolean(
    selectedProg &&
      (selectedProg.fight > 1 ||
        (selectedProg.defeated && selectedProg.defeated.length > 0) ||
        selectedProg.phase === 'TOURNAMENT' ||
        selectedProg.completed)
  );

  return (
    <div
      className="fixed inset-0 z-[150] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn"
      onClick={handleClose}
    >
      {/* FONDO DE PANTALLA COMPLETA CON TRANSICIÓN DINÁMICA SEGÚN CAMPAÑA SELECCIONADA */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <CachedImage
          key={`camp_bg_full_${selectedCampaignIndex}`}
          cacheKey={`camp_bg_${selectedCampaignIndex}`}
          candidateUrls={selectedCampCandidates}
          alt={`Fondo Campaña ${selectedMeta.num}`}
          className="w-full h-full object-cover filter brightness-70 contrast-120 scale-100 transition-all duration-500 animate-fadeIn pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/35 to-black/80 pointer-events-none" />
      </div>

      {/* BARRA SUPERIOR ELEGANTE CON ESTADO DE GUARDADO INDIVIDUAL */}
      <div
        className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-amber-500/50 shadow-lg ${blurMd}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase drop-shadow">
              GUARDADO INDIVIDUAL DE CAMPAÑAS
            </span>
            <span className="text-[9px] px-2 py-0.2 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              Slot {selectedMeta.num} Aislado
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h2
              className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
              style={{ color: selectedMeta.accent }}
            >
              CAMPAÑA {selectedMeta.num}: {selectedMeta.title}
            </h2>
          </div>
        </div>

        {/* BOTÓN VOLVER VERTICAL CON RESPLANDOR */}
        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            handleClose();
          }}
          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd}`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            boxShadow: '0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 20px rgba(245, 158, 11, 0.35)',
          }}
          aria-label="Volver"
        >
          <CachedImage
            cacheKey="icono_salir_main"
            candidateUrls={exitIconCandidates}
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

      {/* CUERPO CENTRAL: ICONOS DE CAMPAÑAS ADAPTABLES SIN AGRUPARSE */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3 sm:gap-3.5 max-w-[290px] sm:max-w-sm max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-start gap-3 sm:gap-4 shrink-0 max-h-full overflow-y-auto touch-pan-y py-3 px-4 -mx-2'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {campaignMetaList.map((item) => {
            const isSelected = selectedCampaignIndex === item.idx;
            const isUnlocked = unlockedCampaigns.includes(item.idx);
            const bannerUrls = getCampaignImageCandidateUrls(item.idx);
            const prog = campaignsProgress[item.idx];
            const sum = getCampaignProgressSummary(prog);

            return (
              <button
                key={item.idx}
                type="button"
                onClick={() => handleIconClick(item.idx)}
                onPointerEnter={(e) => {
                  // Solo cambiar si proviene de movimiento de ratón en escritorio, nunca por toques en pantallas táctiles
                  if (e.pointerType === 'mouse' && selectedCampaignIndex !== item.idx) {
                    setConfirmRestartIdx(null);
                    setSelectedCampaignIndex(item.idx);
                    gameAudio.playCrispClick();
                  }
                }}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : ''
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-hidden ${
                  isSelected
                    ? isCompact
                      ? 'scale-110 z-30 ring-2 ring-white/60'
                      : 'scale-110 sm:scale-120 z-30 translate-x-1 sm:translate-x-2 ring-2 ring-white/60'
                    : 'scale-95 opacity-85 hover:opacity-100 hover:scale-100'
                }`}
                style={{
                  width: isCompact ? undefined : 'clamp(46px, 13vh, 80px)',
                  height: isCompact ? undefined : 'clamp(46px, 13vh, 80px)',
                  backgroundColor: isSelected ? `${item.accent}35` : 'rgba(0, 0, 0, 0.45)',
                  boxShadow: isSelected
                    ? `0 0 35px ${item.accent}, inset 0 0 16px ${item.accent}60`
                    : `0 0 18px ${item.accent}50, inset 0 0 8px ${item.accent}30`,
                }}
                aria-label={item.title}
              >
                <CachedImage
                  cacheKey={`camp_icon_banner_${item.idx}`}
                  candidateUrls={bannerUrls}
                  alt={item.title}
                  className={`w-full h-full object-cover filter brightness-105 contrast-110 pointer-events-none select-none transition-transform duration-300 ${
                    isSelected ? 'scale-110' : 'scale-100'
                  } ${!isUnlocked ? 'grayscale opacity-40' : ''}`}
                />

                {/* Badge flotante de estado en el icono */}
                {isUnlocked && prog?.completed && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-black font-black text-[8px] px-1 rounded-full shadow">
                    ★ {prog.completionsCount || 1}
                  </div>
                )}

                {/* Candado si está bloqueada */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <span className="text-xl sm:text-2xl drop-shadow">🔒</span>
                  </div>
                )}

                {/* Punto luminoso sutil en la base cuando está seleccionado */}
                {isSelected && (
                  <div
                    className="absolute -bottom-1 w-2.5 h-2.5 rounded-full shadow-[0_0_12px_currentColor] z-30 animate-pulse"
                    style={{ backgroundColor: item.accent, color: item.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PIE DE PANTALLA: PANEL DE PROGRESO INDIVIDUAL Y CONTROLES DE CONTINUAR / REINICIAR */}
      <div
        className="relative z-10 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tarjeta de estado de avance individual */}
        <div className={`flex-1 max-w-lg px-4 sm:px-6 py-2 rounded-2xl bg-black/90 border border-amber-500/40 ${blurMd} text-left shadow-2xl animate-fadeIn flex flex-col`}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1">
            <span className="text-xs sm:text-sm font-serif font-black" style={{ color: selectedMeta.accent }}>
              {selectedMeta.title}
            </span>
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border"
              style={{
                backgroundColor: isSelectedCompleted ? '#14532d' : isSelectedUnlocked ? '#1e293b' : '#3f1414',
                borderColor: selectedMeta.accent,
                color: isSelectedCompleted ? '#4ade80' : isSelectedUnlocked ? '#fef08a' : '#f87171',
              }}
            >
              {isSelectedUnlocked ? currentSummary.label : 'Bloqueada 🔒'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span>Avance Guardado:</span>
            <strong className="text-amber-300">{isSelectedUnlocked ? currentSummary.detail : 'Requiere desbloqueo'}</strong>
          </div>

          <div className="text-[10px] text-slate-400 font-sans mt-0.5 truncate">
            Recompensa: <span style={{ color: selectedMeta.accent }}>{selectedMeta.reward}</span>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: CONTINUAR / REANUDAR Y REINICIAR INDIVIDUAL */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón de Reiniciar Campaña individual (si ya tiene avance o fue completada) */}
          {isSelectedUnlocked && hasExistingProgress && (
            <button
              type="button"
              onClick={() => {
                if (confirmRestartIdx === selectedCampaignIndex) {
                  setConfirmRestartIdx(null);
                  handleLaunchOrAlert(selectedCampaignIndex, true);
                } else {
                  setConfirmRestartIdx(selectedCampaignIndex);
                  gameAudio.playCrispClick();
                }
              }}
              className={`flex items-center gap-1.5 py-2.5 px-3.5 rounded-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${blurMd} shadow-lg bg-slate-900/90 border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 text-xs font-serif font-bold`}
            >
              <span>↺</span>
              <span>{confirmRestartIdx === selectedCampaignIndex ? '¿Confirmar Reinicio?' : 'Reiniciar'}</span>
            </button>
          )}

          {/* Botón Principal: Continuar o Entrar */}
          <button
            type="button"
            onClick={() => handleLaunchOrAlert(selectedCampaignIndex, false)}
            className={`flex items-center gap-2 py-2.5 px-6 rounded-2xl border transition-all duration-300 transform active:scale-95 cursor-pointer ${blurMd} shadow-2xl`}
            style={{
              backgroundColor: isSelectedUnlocked ? 'rgba(0, 0, 0, 0.85)' : 'rgba(30, 41, 59, 0.85)',
              borderColor: isSelectedUnlocked ? selectedMeta.accent : '#475569',
              boxShadow: isSelectedUnlocked
                ? `0 0 25px ${selectedMeta.accent}60, inset 0 0 12px ${selectedMeta.accent}40`
                : undefined,
            }}
          >
            <span
              className="text-xs sm:text-sm font-black font-serif tracking-widest uppercase"
              style={{ color: isSelectedUnlocked ? selectedMeta.accent : '#94a3b8' }}
            >
              {isSelectedUnlocked
                ? hasExistingProgress
                  ? `CONTINUAR CAMPAÑA ${selectedMeta.num}`
                  : `INICIAR CAMPAÑA ${selectedMeta.num}`
                : 'CAMPAÑA BLOQUEADA 🔒'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignSelectorModal;
