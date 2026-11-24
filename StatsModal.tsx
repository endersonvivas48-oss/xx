import React, { useState, useEffect, useRef } from 'react';
import { gameAudio, isAndroidDevice, useCompactViewport } from './utils';
import { getCachedVerifiedUrl } from './imageOptimizer';
import { CachedImage } from './CachedImage';
import { CampaignProgressData } from './playerPersistenceStore';
import { Achievement } from './TrophyModal';

const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const EXIT_ICON_CANDIDATES = [
  `${MAIN_CDN_BASE}/icono_salir.webp`,
  `${MAIN_RAW_BASE}/icono_salir.webp`,
  './assets/icono_salir.webp',
];

const DEFAULT_STATS_BG_CANDIDATES = [
  `${MAIN_CDN_BASE}/fondo_cyty.webp`,
  `${MAIN_RAW_BASE}/fondo_cyty.webp`,
  `${MAIN_CDN_BASE}/menu.webp`,
  `${MAIN_RAW_BASE}/menu.webp`,
  `${MAIN_CDN_BASE}/campamento.webp`,
  `${MAIN_RAW_BASE}/campamento.webp`,
];

export interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  statsWon: number;
  statsCampaignLosses: number;
  statsColiseumLosses: number;
  survivalHighScore: number;
  statsMinionsSummoned: number;
  campaignsProgress: Record<number, CampaignProgressData>;
  achievements: Achievement[];
  unlockedCampaigns: number[];
  maxPlayerHp: number;
  playerLevel: number;
  playerExp: number;
  forgeMasteryLevel?: number;
  forgeMasteryExp?: number;
  forgeTotalAttempts?: number;
  forgeTotalSuccesses?: number;
  onOpenAchievements?: () => void;
  FullscreenStatsBackground?: React.FC<{ className?: string }>;
}

function DefaultStatsBackground({ className = '' }: { className?: string }) {
  const cached = getCachedVerifiedUrl('bg_menu_city');
  const candidateUrls = cached
    ? [cached, ...DEFAULT_STATS_BG_CANDIDATES.filter((u) => u !== cached)]
    : DEFAULT_STATS_BG_CANDIDATES;

  return (
    <CachedImage
      cacheKey="bg_menu_city"
      candidateUrls={candidateUrls}
      alt="Registro Militar del Reino"
      loading="eager"
      className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transition-opacity duration-300 pointer-events-none select-none ${className}`}
    />
  );
}

const CAMPAIGN_LABELS = [
  { idx: 0, name: 'El Camino al Torneo', color: '#f59e0b' },
  { idx: 1, name: 'Señores del Calabozo', color: '#c084fc' },
  { idx: 2, name: 'Torneíllo del Recluta', color: '#34d399' },
  { idx: 3, name: 'Trono de las Sombras', color: '#f43f5e' },
];

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  statsWon,
  statsCampaignLosses,
  statsColiseumLosses,
  survivalHighScore,
  statsMinionsSummoned,
  campaignsProgress,
  achievements,
  unlockedCampaigns,
  maxPlayerHp,
  playerLevel,
  playerExp,
  forgeMasteryLevel = 1,
  forgeMasteryExp = 0,
  forgeTotalAttempts = 0,
  forgeTotalSuccesses = 0,
  onOpenAchievements,
  FullscreenStatsBackground,
}) => {
  const [activeTab, setActiveTab] = useState<'COMBATE' | 'CAMPANAS' | 'SOBERANO'>('COMBATE');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const isSectionModalOpenRef = useRef<boolean>(false);
  isSectionModalOpenRef.current = isSectionModalOpen;
  const isCompact = useCompactViewport(460, 640);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSoft = isAndroid ? '' : 'backdrop-blur-[3px]';

  useEffect(() => {
    if (!isOpen) {
      isSectionModalOpenRef.current = false;
      setIsSectionModalOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const BackgroundComponent = FullscreenStatsBackground || DefaultStatsBackground;

  const totalMatches = statsWon + statsCampaignLosses + statsColiseumLosses;
  const winRate = totalMatches > 0 ? Math.round((statsWon / totalMatches) * 100) : 0;
  const completedCampaignsCount = [0, 1, 2, 3].filter((idx) => campaignsProgress[idx]?.completed).length;
  const totalCampaignCrowns = [0, 1, 2, 3].reduce(
    (acc, idx) => acc + (campaignsProgress[idx]?.completionsCount || 0),
    0
  );
  const maxForgeLevel = 12;
  const clampedForgeLevel = Math.min(maxForgeLevel, Math.max(1, forgeMasteryLevel));
  const forgeExpCap = clampedForgeLevel * 100;
  const displayedForgeExp = Math.min(forgeMasteryExp, forgeExpCap);
  const forgeSuccessBonus = Math.max(0, (clampedForgeLevel - 1) * 5);
  const isForgeUnlocked = unlockedCampaigns.includes(3);
  const visibleAchievements = achievements.filter(
    (a) => !a.requiresCampaign4 || unlockedCampaigns.includes(3)
  );
  const claimedAchievementsCount = visibleAchievements.filter((a) => a.isClaimed).length;
  const unlockedAchievementsCount = visibleAchievements.filter((a) => a.isUnlocked).length;
  const pendingClaimCount = Math.max(0, unlockedAchievementsCount - claimedAchievementsCount);
  const achievementsPct =
    visibleAchievements.length > 0
      ? Math.round((unlockedAchievementsCount / visibleAchievements.length) * 100)
      : 0;
  const topInProgressAchievements = visibleAchievements
    .filter((a) => !a.isUnlocked && typeof a.maxProgress === 'number' && a.maxProgress > 0)
    .sort((a, b) => {
      const aPct = (a.progress || 0) / (a.maxProgress || 1);
      const bPct = (b.progress || 0) / (b.maxProgress || 1);
      if (bPct !== aPct) return bPct - aPct;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 4);

  const getStatsIconCandidates = (fileNames: string[]) => {
    const urls: string[] = [];
    fileNames.forEach((fileBase) => {
      urls.push(
        `${MAIN_CDN_BASE}/${fileBase}.webp`,
        `${MAIN_RAW_BASE}/${fileBase}.webp`,
        `${MAIN_CDN_BASE}/iconos/${fileBase}.webp`,
        `${MAIN_RAW_BASE}/iconos/${fileBase}.webp`,
        `${MAIN_CDN_BASE}/${fileBase}.jpg`,
        `${MAIN_RAW_BASE}/${fileBase}.jpg`,
        `./assets/iconos/${fileBase}.webp`,
        `./assets/${fileBase}.webp`
      );
    });
    return urls;
  };

  const statsSections = [
    {
      id: 'COMBATE' as const,
      title: 'BALANCE DE COMBATE',
      sub: `Victorias y Desempeño de ${playerName}`,
      color: '#34d399',
      badge: `${statsWon} Victorias • ${winRate}% Efectividad`,
      desc: 'Consulta tu historial de victorias, efectividad global, invocaciones y derrotas registradas en el reino.',
      iconCandidates: getStatsIconCandidates(['icono_estadisticas']),
    },
    {
      id: 'CAMPANAS' as const,
      title: 'CONQUISTAS Y LOGROS',
      sub: 'Campañas Superadas y Trofeos',
      color: '#fbbf24',
      badge: `${completedCampaignsCount}/4 Campañas • ${unlockedAchievementsCount}/${visibleAchievements.length} Logros (${achievementsPct}%)`,
      desc: 'Revisa tus campañas conquistadas, coronaciones totales y el progreso de tus logros desbloqueados y en curso.',
      iconCandidates: getStatsIconCandidates(['icono_trofeos']),
    },
    {
      id: 'SOBERANO' as const,
      title: 'COLISEO Y SOBERANO',
      sub: `Rango Nivel ${playerLevel} • ${maxPlayerHp} HP • Forja Nv.${clampedForgeLevel}`,
      color: '#38bdf8',
      badge: `Oleada ${survivalHighScore} • Nivel ${playerLevel} • Forja Nv.${clampedForgeLevel}`,
      desc: 'Inspecciona tu récord en el Coliseo Infinito, la salud del Soberano, tu rango de héroe y tu Maestría de Forja.',
      iconCandidates: getStatsIconCandidates(['icono_ficha_maestra']),
    },
  ];

  const selectedSec = statsSections.find((s) => s.id === activeTab) || statsSections[0];

  const openSectionModal = (tabId: typeof activeTab) => {
    if (isSectionModalOpenRef.current) return;
    isSectionModalOpenRef.current = true;
    gameAudio.playConfirmSelect();
    setActiveTab(tabId);
    setIsSectionModalOpen(true);
  };

  const closeSectionModal = () => {
    isSectionModalOpenRef.current = false;
    setIsSectionModalOpen(false);
  };

  const renderVolverButton = (handleBack: () => void) => (
    <button
      type="button"
      onClick={() => {
        gameAudio.playCrispClick();
        handleBack();
      }}
      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-2xl border-0 outline-none focus:outline-none transition-all duration-300 transform active:scale-95 cursor-pointer group relative ${blurMd} shrink-0`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        boxShadow: '0 0 35px rgba(52, 211, 153, 0.55), inset 0 0 20px rgba(52, 211, 153, 0.35)',
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
      <span className="font-serif font-bold tracking-widest text-slate-300 group-hover:text-emerald-300 transition-colors text-[9px] sm:text-[10px] mt-0.5">
        VOLVER
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden select-none bg-black flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn">
      {/* FONDO OFICIAL PANORÁMICO COMPLETO */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <BackgroundComponent />
        <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/25 to-black/75 pointer-events-none" />
      </div>

      {!isSectionModalOpen && (
        <>
      {/* BARRA SUPERIOR ELEGANTE ESTILO CÓDICE / TALLER / FORJA / FICHA MAESTRA */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 pointer-events-auto gap-2">
        <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-emerald-500/50 shadow-lg ${blurMd}`}>
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase drop-shadow">
            ESTADÍSTICAS DE {playerName.toUpperCase()} • NIVEL {playerLevel}
          </span>
          <h2
            className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,1)] uppercase transition-colors"
            style={{ color: selectedSec.color }}
          >
            {selectedSec.title}
          </h2>
        </div>

        {renderVolverButton(() => {
          closeSectionModal();
          onClose();
        })}
      </div>

      {/* CUERPO CENTRAL: 3 ICONOS LUMINOSOS ADAPTABLES SIN RECORTE */}
      <div
        className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-row items-center justify-start pointer-events-auto px-2 sm:px-6 my-auto gap-4 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${
            isCompact
              ? 'flex flex-row flex-wrap items-center justify-start gap-3.5 max-h-full overflow-y-auto touch-pan-y py-3 px-2'
              : 'flex flex-col items-center justify-center gap-3.5 sm:gap-5 shrink-0 px-4 sm:px-6 py-4 overflow-visible'
          } [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
        >
          {statsSections.map((sec) => {
            const isSelected = activeTab === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={(e) => {
                  if (activeTab === sec.id || e.detail >= 2) {
                    openSectionModal(sec.id);
                  } else {
                    setActiveTab(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && activeTab !== sec.id) {
                    setActiveTab(sec.id);
                    gameAudio.playCrispClick();
                  }
                }}
                className={`${
                  isCompact ? 'w-12 h-12 sm:w-14 sm:h-14' : ''
                } shrink-0 rounded-2xl sm:rounded-3xl border-0 outline-none focus:outline-none flex items-center justify-center p-1.5 sm:p-2 transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                  isAndroid ? '' : 'backdrop-blur-md'
                } overflow-visible ${
                  isSelected
                    ? isCompact
                      ? 'scale-110 z-30'
                      : 'scale-115 sm:scale-125 z-30 translate-x-1 sm:translate-x-2'
                    : 'scale-95 sm:scale-100 opacity-90 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  width: isCompact ? undefined : 'clamp(50px, 13vh, 78px)',
                  height: isCompact ? undefined : 'clamp(50px, 13vh, 78px)',
                  backgroundColor: isSelected ? `${sec.color}35` : 'rgba(0, 0, 0, 0.5)',
                  boxShadow: isSelected
                    ? `0 0 35px ${sec.color}, inset 0 0 15px ${sec.color}50`
                    : `0 0 15px ${sec.color}30`,
                }}
                aria-label={sec.title}
              >
                <div
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${sec.color}65 0%, transparent 80%)`,
                    opacity: isSelected ? 1 : 0.6,
                  }}
                />

                <CachedImage
                  cacheKey={`stats_sec_icon_${sec.id}`}
                  candidateUrls={sec.iconCandidates}
                  alt={sec.title}
                  loading="eager"
                  fallbackPlaceholder={<></>}
                  className="w-full h-full object-contain filter brightness-110 contrast-110 pointer-events-none select-none transition-transform duration-300 relative z-10"
                  style={{ mixBlendMode: 'screen' }}
                />

                {isSelected && (
                  <div
                    className="absolute -bottom-1 w-2 h-2 rounded-full shadow-[0_0_12px_currentColor] z-20 animate-pulse"
                    style={{ backgroundColor: sec.color, color: sec.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PIE DE PANTALLA: PANEL INFORMATIVO TRANSLÚCIDO CON ACCESO DIRECTO */}
      <div
        className="relative z-10 w-full max-w-4xl flex items-center justify-center pb-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => openSectionModal(selectedSec.id)}
          className={`w-full max-w-lg px-6 py-2.5 rounded-2xl bg-black/85 border border-emerald-500/40 hover:border-emerald-400 ${blurMd} text-center shadow-2xl animate-fadeIn transition transform active:scale-[0.99] cursor-pointer`}
        >
          <span className="text-xs sm:text-sm font-serif font-black block" style={{ color: selectedSec.color }}>
            {selectedSec.desc}
          </span>
          <span
            className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
            style={{
              color: selectedSec.color,
              borderColor: `${selectedSec.color}60`,
              backgroundColor: `${selectedSec.color}18`,
            }}
          >
            <span>{selectedSec.badge}</span>
            <span>• ENTRAR</span>
          </span>
        </button>
      </div>
        </>
      )}

      {/* SUB-VISTA DETALLADA DE LA SECCIÓN ACTIVA (reutiliza el único fondo de Estadísticas) */}
      {isSectionModalOpen && (
        <div
          className={`fixed inset-0 z-[155] overflow-hidden select-none ${isAndroid ? 'bg-black/80' : `bg-black/70 ${blurSoft}`} flex flex-col items-center justify-between p-3 sm:p-6 animate-fadeIn`}
          onClick={closeSectionModal}
        >

          {/* Barra superior de la sub-vista */}
          <div
            className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 mb-2 pointer-events-auto gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col text-left px-3 py-1.5 rounded-2xl bg-black/85 border border-emerald-500/50 shadow-lg ${blurMd}`}>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase drop-shadow">
                REGISTRO MILITAR • {playerName.toUpperCase()}
              </span>
              <h2
                className="text-lg sm:text-2xl font-black font-serif tracking-wider drop-shadow uppercase"
                style={{ color: selectedSec.color }}
              >
                {selectedSec.title}
              </h2>
            </div>

            {renderVolverButton(closeSectionModal)}
          </div>

          {/* Contenido central translúcido */}
          <div
            className="relative z-10 w-full max-w-5xl flex-1 min-h-0 flex flex-col justify-start pointer-events-auto my-auto overflow-y-auto touch-pan-y px-1 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* SECCIÓN 1: BALANCE DE COMBATE */}
            {activeTab === 'COMBATE' && (
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className={`p-4 rounded-2xl bg-black/85 border border-emerald-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Victorias Totales
                    </span>
                    <span className="text-3xl font-black font-mono text-emerald-400 mt-1">
                      ⚔️ {statsWon}
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                      Batallas ganadas en Callejuela, Torneo y Coliseo.
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl bg-black/85 border border-cyan-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Efectividad Global
                    </span>
                    <span className="text-3xl font-black font-mono text-cyan-300 mt-1">
                      {winRate}%
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                      Sobre un total de {totalMatches} combates disputados.
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl bg-black/85 border border-purple-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Criaturas Invocadas
                    </span>
                    <span className="text-3xl font-black font-mono text-purple-300 mt-1">
                      🛡️ {statsMinionsSummoned}
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                      Total de aliados desplegados en tableros hexagonales.
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl bg-black/85 border border-rose-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Derrotas en Campaña
                    </span>
                    <span className="text-3xl font-black font-mono text-rose-400 mt-1">
                      💀 {statsCampaignLosses}
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                      Cuentan para secretos ocultos del reino.
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl bg-black/85 border border-amber-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Derrotas en Coliseo
                    </span>
                    <span className="text-3xl font-black font-mono text-amber-400 mt-1">
                      🔥 {statsColiseumLosses}
                    </span>
                    <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                      Caídas registradas en el Modo Supervivencia.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 2: CONQUISTAS, CAMPAÑAS Y LOGROS */}
            {activeTab === 'CAMPANAS' && (
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className={`p-4 rounded-2xl bg-black/85 border border-amber-500/50 ${blurMd} shadow-xl`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                      Campañas Superadas
                    </span>
                    <span className="text-2xl font-black font-mono text-amber-300 mt-1 block">
                      {completedCampaignsCount} / 4 Conquistadas
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl bg-black/85 border border-emerald-500/50 ${blurMd} shadow-xl`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                      Total de Coronaciones
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                      {totalCampaignCrowns} Veces Coronadas
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAchievements) {
                        gameAudio.playCrispClick();
                        closeSectionModal();
                        onOpenAchievements();
                      }
                    }}
                    disabled={!onOpenAchievements}
                    className={`p-4 rounded-2xl bg-black/85 border border-amber-400/60 ${blurMd} shadow-xl text-left transition flex flex-col justify-between ${
                      onOpenAchievements
                        ? 'hover:border-amber-300 hover:bg-amber-950/30 cursor-pointer active:scale-95'
                        : ''
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center justify-between gap-2">
                      <span>Logros ({unlockedAchievementsCount} Desbl.)</span>
                      {onOpenAchievements && (
                        <span className="text-amber-300 underline font-sans shrink-0">Ver Sala</span>
                      )}
                    </span>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {claimedAchievementsCount} / {visibleAchievements.length}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        {pendingClaimCount > 0 ? `${pendingClaimCount} por reclamar` : `${achievementsPct}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${achievementsPct}%` }}
                      />
                    </div>
                  </button>
                </div>

                {topInProgressAchievements.length > 0 && (
                  <div className={`p-4 rounded-2xl bg-black/85 border border-amber-500/40 ${blurMd} shadow-xl`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs sm:text-sm font-serif font-black text-amber-300">
                        PRÓXIMOS LOGROS EN PROGRESO
                      </h4>
                      {onOpenAchievements && (
                        <button
                          type="button"
                          onClick={() => {
                            gameAudio.playCrispClick();
                            closeSectionModal();
                            onOpenAchievements();
                          }}
                          className="text-[10px] font-mono font-bold text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {topInProgressAchievements.map((ach) => {
                        const maxP = ach.maxProgress || 1;
                        const curP = Math.min(maxP, Math.max(0, ach.progress || 0));
                        const pct = Math.round((curP / maxP) * 100);
                        return (
                          <div
                            key={ach.id}
                            className="p-3 rounded-xl bg-slate-950/85 border border-slate-800 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-serif font-bold text-xs text-slate-200 truncate">
                                {ach.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                                {curP} / {maxP} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={`p-4 rounded-2xl bg-black/85 border border-amber-500/40 ${blurMd} shadow-xl`}>
                  <h4 className="text-xs sm:text-sm font-serif font-black text-amber-300 mb-3">
                    ESTADO POR CAMPAÑA DEL REINO
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CAMPAIGN_LABELS.map((camp) => {
                      const prog = campaignsProgress[camp.idx];
                      const isUnlocked = unlockedCampaigns.includes(camp.idx);
                      const isCompleted = Boolean(prog?.completed);
                      const completions = prog?.completionsCount || 0;

                      return (
                        <div
                          key={camp.idx}
                          className="p-3 rounded-xl bg-slate-950/85 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Campaña {camp.idx + 1}
                            </span>
                            <span
                              className="font-serif font-bold text-xs sm:text-sm block truncate"
                              style={{ color: camp.color }}
                            >
                              {camp.name}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                : isUnlocked
                                ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                                : 'bg-slate-900 text-slate-500 border-slate-700'
                            }`}
                          >
                            {isCompleted
                              ? `👑 ${completions}x`
                              : isUnlocked
                              ? 'En Curso'
                              : '🔒 Sellada'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 3: COLISEO Y SOBERANO */}
            {activeTab === 'SOBERANO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pb-4">
                <div className={`p-4 rounded-2xl bg-black/85 border border-yellow-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Récord en Coliseo
                  </span>
                  <span className="text-3xl font-black font-mono text-yellow-300 mt-1">
                    🏆 Oleada {survivalHighScore}
                  </span>
                  <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                    Máxima oleada superada en el Coliseo Infinito.
                  </span>
                </div>

                <div className={`p-4 rounded-2xl bg-black/85 border border-rose-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Salud Máxima del Soberano
                  </span>
                  <span className="text-3xl font-black font-mono text-rose-400 mt-1">
                    ❤️ {maxPlayerHp} HP
                  </span>
                  <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                    Vitalidad base permanente de tu Rey Soberano.
                  </span>
                </div>

                <div className={`p-4 rounded-2xl bg-black/85 border border-cyan-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Nivel de Rango del Héroe
                  </span>
                  <span className="text-3xl font-black font-mono text-cyan-300 mt-1">
                    Nivel {playerLevel}
                  </span>
                  <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                    Experiencia acumulada: {playerExp} EXP.
                  </span>
                </div>

                <div className={`p-4 rounded-2xl bg-black/85 border border-purple-500/50 ${blurMd} shadow-xl flex flex-col justify-between`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Nivel de Maestría de Forja
                  </span>
                  <span className="text-3xl font-black font-mono text-purple-300 mt-1">
                    ⚒️ Nivel {clampedForgeLevel}/{maxForgeLevel}
                  </span>
                  <span className="text-[11px] text-slate-300 font-sans mt-2 pt-2 border-t border-slate-800">
                    {isForgeUnlocked
                      ? `EXP: ${displayedForgeExp}/${forgeExpCap} • +${forgeSuccessBonus}% éxito (${forgeTotalSuccesses}/${forgeTotalAttempts} forjas).`
                      : `EXP: ${displayedForgeExp}/${forgeExpCap} • +${forgeSuccessBonus}% éxito (Gran Fragua en Campaña 4).`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsModal;
