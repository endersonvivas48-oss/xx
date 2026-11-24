import React, { useState, useEffect } from 'react';
import { isAndroidDevice } from './utils';
import { getTrophyBadgeCandidateUrls, getTrophyBackgroundCandidateUrls } from './trophyImageMap';
import { CachedImage } from './CachedImage';

export interface Achievement {
  id: string;
  name: string;
  desc?: string;
  description?: string;
  icon: string;
  category?: 'COMBAT' | 'CAMPAIGN' | 'COLISEUM' | 'FORGE' | 'SPELLS' | string;
  isUnlocked: boolean;
  isClaimed: boolean;
  rewardType: string;
  rewardAmount: number;
  rewardGold?: number;
  rewardLabel?: string;
  rewardDieId?: string;
  rewardSpellId?: string;
  requiresCampaign4?: boolean;
  progress?: number;
  maxProgress?: number;
}

export type Trophy = Achievement;

export type TrophyFilterCategory = 'ALL' | 'CONTRACTS' | 'COMBAT' | 'CAMPAIGN' | 'COLISEUM' | 'FORGE' | 'SPELLS';

interface TrophyModalProps {
  isOpen: boolean;
  onClose: () => void;
  trophies?: Achievement[];
  achievements?: Achievement[];
  onClaimReward?: (achievementId: string) => void;
  onOpenTieredModal?: () => void;
  activeCategory?: TrophyFilterCategory;
  setActiveCategory?: (category: TrophyFilterCategory) => void;
  isCampaign4Unlocked?: boolean;
  fontSize?: number;
}

// Componente para la insignia individual de cada logro con visibilidad nítida y ajuste perfecto
function TrophyBadgeImage({
  trophy,
  isUnlocked,
  className = '',
}: {
  trophy: Achievement;
  isUnlocked: boolean;
  className?: string;
}) {
  const cacheKey = `trophy_${trophy.id}`;
  const candidateUrls = getTrophyBadgeCandidateUrls(trophy.id);

  return (
    <CachedImage
      cacheKey={cacheKey}
      candidateUrls={candidateUrls}
      alt={trophy.name}
      className={`max-w-full max-h-full w-auto h-auto object-contain filter ${
        isUnlocked
          ? 'brightness-105 contrast-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform duration-300'
          : 'grayscale contrast-125 brightness-80 opacity-75 group-hover:opacity-95 transition-opacity'
      } ${className}`}
    />
  );
}

// Componente de fondo de pantalla completa con soporte de caché persistente
function FullscreenTrophyBackground() {
  const cacheKey = 'bg_trophy';
  const candidateUrls = getTrophyBackgroundCandidateUrls();

  return (
    <CachedImage
      cacheKey={cacheKey}
      candidateUrls={candidateUrls}
      alt="Fondo Salón de Trofeos"
      className="fixed inset-0 w-full h-[100dvh] object-cover object-center filter brightness-90 contrast-105 pointer-events-none select-none z-0"
      fallbackPlaceholder={<div className="fixed inset-0 w-full h-[100dvh] bg-slate-950 z-0" />}
    />
  );
}

export const TrophyModal: React.FC<TrophyModalProps> = ({
  isOpen,
  onClose,
  trophies: propTrophies,
  achievements: propAchievements,
  onClaimReward,
  onOpenTieredModal,
  activeCategory: externalCategory,
  setActiveCategory: setExternalCategory,
  isCampaign4Unlocked = false,
  fontSize = 12,
}) => {
  const [localCategory, setLocalCategory] = useState<TrophyFilterCategory>('ALL');
  const [inspectedTrophyId, setInspectedTrophyId] = useState<string | null>(null);
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';

  useEffect(() => {
    if (!isOpen) {
      setInspectedTrophyId(null);
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    setInspectedTrophyId(null);
    onClose();
  };

  if (!isOpen) return null;

  const rawList = Array.isArray(propTrophies)
    ? propTrophies
    : Array.isArray(propAchievements)
    ? propAchievements
    : [];

  // Filtrar logros secretos que requieren Campaña 4 si esta aún no está desbloqueada
  const trophyList = isCampaign4Unlocked
    ? rawList
    : rawList.filter((t) => !t.requiresCampaign4);

  const inspectedTrophy = inspectedTrophyId
    ? trophyList.find((t) => t.id === inspectedTrophyId) || null
    : null;

  const selectedCategory = (externalCategory as TrophyFilterCategory) || localCategory;
  const setSelectedCategory = (cat: TrophyFilterCategory) => {
    setLocalCategory(cat);
    if (setExternalCategory) {
      setExternalCategory(cat);
    }
  };

  const unlockedCount = trophyList.filter((t) => t.isUnlocked).length;
  const totalCount = trophyList.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Filtrado por categoría
  const categoryFiltered = trophyList.filter((trophy) => {
    if (selectedCategory === 'ALL') return true;
    return trophy.category === selectedCategory;
  });

  // ORDENAR:
  // 1º: Logros desbloqueados con recompensa pendiente de reclamar (isUnlocked && !isClaimed) -> Primero en la lista
  // 2º: Logros aún en progreso o pendientes de desbloquear (!isUnlocked) -> En el medio
  // 3º: Logros aceptados / reclamados (isClaimed) -> AL FINAL DE LA LISTA
  const getTrophyPriority = (trophy: Achievement) => {
    if (trophy.isUnlocked && !trophy.isClaimed) return 0; // Primero: listos para reclamar
    if (!trophy.isClaimed) return 1; // Segundo: pendientes de desbloquear
    return 2; // Al final: ya aceptados/reclamados
  };

  const filteredTrophies = [...categoryFiltered].sort((a, b) => {
    const priorityA = getTrophyPriority(a);
    const priorityB = getTrophyPriority(b);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Para los pendientes de desbloquear, ordenar primero los que tienen mayor progreso porcentual
    if (priorityA === 1) {
      const aPct = a.maxProgress ? (a.progress || 0) / a.maxProgress : 0;
      const bPct = b.maxProgress ? (b.progress || 0) / b.maxProgress : 0;
      if (bPct !== aPct) return bPct - aPct;
    }

    return a.name.localeCompare(b.name);
  });

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] bg-black z-[120] overflow-y-auto touch-pan-y p-2 sm:p-4 md:p-6 flex flex-col items-center justify-start sm:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* 1. IMAGEN DE FONDO OCUPANDO EL 100% DE LA PANTALLA */}
      <FullscreenTrophyBackground />

      {/* 2. VELO SUAVE DE TRANSPARENCIA EN TODA LA PANTALLA */}
      <div className="fixed inset-0 w-full h-[100dvh] bg-gradient-to-t from-black via-black/55 to-black/25 pointer-events-none z-[1]" />

      {/* 3. VISTA PRINCIPAL: VENTANA FLOTANTE CON DISEÑO AMPLIO Y PROPORCIONES PRESERVADAS */}
      {!inspectedTrophy && (
        <div
          className={`m-auto max-w-5xl w-full bg-black/90 border-2 border-amber-500/80 rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-[0_0_50px_rgba(245,158,11,0.35)] ${blurMd} text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pointer-events-auto relative z-10`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* CABECERA ELEGANTE */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 mb-3 shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="text-left">
                <h3 className="text-sm sm:text-lg md:text-xl font-black font-serif tracking-widest text-amber-300 drop-shadow">
                  SALÓN DE LOGROS Y TROFEOS
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-300 font-sans">
                  Colecciona medallas legendarias demostrando tu maestría en batalla, torneos y forja
                </p>
              </div>
            </div>

            {/* BARRA DE PROGRESO GLOBAL Y BOTÓN DE CIERRE RÁPIDO */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2.5 bg-black/90 px-3 py-1.5 rounded-2xl border border-amber-500/50 shadow">
                <div className="text-right">
                  <span className="text-[9.5px] text-slate-400 block font-serif leading-none">Progreso</span>
                  <span className="font-mono font-black text-amber-300 text-xs sm:text-sm">
                    {unlockedCount} / {totalCount} ({percentage}%)
                  </span>
                </div>
                <div className="w-16 sm:w-24 h-2.5 bg-slate-900 rounded-full border border-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {onOpenTieredModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTieredModal();
                  }}
                  className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-purple-200 border border-purple-400/60 font-serif font-black text-xs tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.4)] transition transform active:scale-95 cursor-pointer shrink-0"
                >
                  <span>AVANZADOS</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseModal}
                className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/60 font-serif font-bold text-xs tracking-wider shadow transition transform active:scale-95 cursor-pointer shrink-0"
              >
                ✕ SALIR
              </button>
            </div>
          </div>

          {/* BARRA DE BOTONES DE FILTRO ESTILO PÍLDORA (UNA SOLA FILA CON SCROLL HORIZONTAL DISCRETO) */}
          <div className="w-full flex items-center gap-1.5 sm:gap-2 mb-3 p-1 bg-black/80 rounded-2xl border border-amber-500/40 shrink-0 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10">
            {[
              { id: 'ALL', label: 'TODOS' },
              { id: 'CONTRACTS', label: 'CONTRATOS' },
              { id: 'COMBAT', label: 'COMBATE' },
              { id: 'COLISEUM', label: 'COLISEO' },
              { id: 'CAMPAIGN', label: 'CAMPAÑAS' },
              { id: 'FORGE', label: 'FORJA Y DADOS' },
              { id: 'SPELLS', label: 'GRIMORIO' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as TrophyFilterCategory)}
                className={`flex-1 min-w-[85px] sm:min-w-[100px] py-1.5 px-2 rounded-xl font-serif font-bold text-[10px] sm:text-xs tracking-wider transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] border border-amber-300 font-black scale-[1.02]'
                    : 'bg-slate-950/70 text-slate-400 hover:text-amber-200 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* CUADRÍCULA DE LOGROS (TARJETAS CON ALTURA MÍNIMA ROBUSTA: NUNCA SE APLASTAN) */}
          <div className="w-full flex-1 min-h-0 overflow-y-auto touch-pan-y pr-0.5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 mb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10">
            {filteredTrophies.map((trophy) => {
              const isUnlocked = trophy.isUnlocked;
              const isClaimed = trophy.isClaimed;
              const isPending = isUnlocked && !isClaimed;
              const descriptionText = trophy.desc || trophy.description || '';
              const hasProgress = typeof trophy.maxProgress === 'number' && trophy.maxProgress > 0;
              const maxProgressVal = trophy.maxProgress || 1;
              const currentProgressVal = isUnlocked
                ? maxProgressVal
                : Math.min(maxProgressVal, Math.max(0, trophy.progress || 0));
              const progressPercent = Math.round((currentProgressVal / maxProgressVal) * 100);

              return (
                <div
                  key={trophy.id}
                  onClick={() => setInspectedTrophyId(trophy.id)}
                  className={`p-3 sm:p-3.5 rounded-2xl border-2 transition transform active:scale-95 text-left flex items-center gap-3 sm:gap-3.5 cursor-pointer group relative overflow-hidden shadow-lg min-h-[104px] ${
                    isPending
                      ? 'border-amber-400 bg-slate-950/95 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : isUnlocked
                      ? 'border-amber-400/80 bg-slate-950/90 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                      : 'border-slate-800 bg-black/80 opacity-65 hover:opacity-85 hover:border-slate-700'
                  }`}
                >
                  {/* VITRINA OFICIAL DE LA MEDALLA / INSIGNIA CON TAMAÑO FIJO INMUTABLE (NO SE APLASTA CON FLEX) */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] sm:min-w-[64px] sm:min-h-[64px] rounded-xl border-2 overflow-hidden flex items-center justify-center shrink-0 p-1 relative shadow-inner ${
                      isPending
                        ? 'border-amber-300 bg-amber-950/50 shadow-[0_0_15px_rgba(245,158,11,0.6)] ring-1 ring-amber-300'
                        : isUnlocked
                        ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'border-slate-700 bg-slate-900/60'
                    }`}
                  >
                    <TrophyBadgeImage trophy={trophy} isUnlocked={isUnlocked} />

                    {/* Candado flotante si está bloqueado */}
                    {!isUnlocked && (
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 px-1 rounded border border-slate-700">
                        🔒
                      </span>
                    )}
                  </div>

                  {/* TEXTOS E INFORMACIÓN DEL LOGRO */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`font-serif font-black text-xs sm:text-sm truncate ${
                          isPending
                            ? 'text-amber-200'
                            : isUnlocked
                            ? 'text-amber-300 group-hover:text-amber-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {trophy.name}
                      </h4>
                      <span
                        className={`text-[8.5px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 border ${
                          isPending
                            ? 'bg-amber-950 text-amber-300 border-amber-400 animate-pulse'
                            : isClaimed
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                            : 'bg-slate-900 text-slate-500 border-slate-700'
                        }`}
                      >
                        {isPending ? 'LISTO' : isClaimed ? '✓ RECLAMADO' : 'BLOQUEADO'}
                      </span>
                    </div>

                    <p
                      style={{ fontSize: `${fontSize}px` }}
                      className="text-slate-300 font-sans leading-relaxed line-clamp-2 mb-1.5"
                    >
                      {descriptionText}
                    </p>

                    {hasProgress && (
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
                          <span className="text-slate-400">Progreso</span>
                          <span className={isUnlocked ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                            {currentProgressVal} / {maxProgressVal} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isUnlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/80 pt-1">
                      <span className="text-amber-400 font-serif font-bold">
                        {trophy.category || 'GENERAL'}
                      </span>

                      {isPending && onClaimReward ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClaimReward(trophy.id);
                          }}
                          className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-serif font-black text-[9px] border border-amber-300 shadow hover:scale-105 transition"
                        >
                          Reclamar Recompensa
                        </button>
                      ) : (
                        <span className="text-cyan-300 font-sans group-hover:text-cyan-200">
                          🔍 Toca para ampliar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÓN INFERIOR DE SALIR */}
          <div className="w-full max-w-xs shrink-0 relative z-10">
            <button
              type="button"
              onClick={handleCloseModal}
              className="w-full py-2 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-200 font-serif font-bold text-xs tracking-wider border border-amber-500/60 shadow transition transform active:scale-95 cursor-pointer"
            >
              ← VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL EMERGENTE DE INSPECCIÓN AMPLIADA */}
      {inspectedTrophy && (
        <div
          className={`m-auto w-[92vw] max-w-sm sm:max-w-md max-h-[90dvh] overflow-y-auto touch-pan-y bg-slate-950/95 border-2 border-amber-400 rounded-3xl p-5 shadow-[0_0_60px_rgba(245,158,11,0.5)] ${blurMd} text-center flex flex-col items-center relative z-20 animate-fadeIn pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setInspectedTrophyId(null)}
            className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white text-base font-bold w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/70 border border-slate-700 flex items-center justify-center transition hover:border-amber-400 cursor-pointer shrink-0"
            aria-label="Cerrar detalle"
          >
            ✕
          </button>

          <div
            className={`w-28 h-28 sm:w-36 sm:h-36 min-w-[112px] min-h-[112px] sm:min-w-[144px] sm:min-h-[144px] rounded-3xl border-2 overflow-hidden flex items-center justify-center p-2.5 mb-3 relative shadow-2xl shrink-0 ${
              inspectedTrophy.isUnlocked
                ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_30px_rgba(245,158,11,0.6)] ring-2 ring-amber-300'
                : 'border-slate-700 bg-slate-900/80'
            }`}
          >
            <TrophyBadgeImage
              trophy={inspectedTrophy}
              isUnlocked={inspectedTrophy.isUnlocked}
              className="scale-110"
            />
          </div>

          <span
            className={`text-[9px] sm:text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border mb-1.5 shrink-0 ${
              inspectedTrophy.isUnlocked
                ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {inspectedTrophy.isUnlocked ? '✓ MEDALLA DESBLOQUEADA' : '🔒 DESAFÍO PENDIENTE'}
          </span>

          <h3 className="font-serif font-black text-base sm:text-lg text-amber-300 mb-1 drop-shadow px-2">
            {inspectedTrophy.name}
          </h3>

          <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed mb-3 max-w-xs px-1">
            {inspectedTrophy.desc || inspectedTrophy.description}
          </p>

          {typeof inspectedTrophy.maxProgress === 'number' && inspectedTrophy.maxProgress > 0 && (() => {
            const safeMax = inspectedTrophy.maxProgress!;
            const safeCur = inspectedTrophy.isUnlocked
              ? safeMax
              : Math.min(safeMax, Math.max(0, inspectedTrophy.progress || 0));
            const pct = Math.round((safeCur / safeMax) * 100);
            return (
              <div className="w-full max-w-xs mb-3 bg-black/75 border border-slate-800 rounded-2xl p-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-400">Progreso del Logro</span>
                  <span className={inspectedTrophy.isUnlocked ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                    {safeCur} / {safeMax} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      inspectedTrophy.isUnlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {inspectedTrophy.rewardLabel && (
                  <div className="text-[10px] font-serif text-amber-300 font-bold mt-1.5">
                    Recompensa: {inspectedTrophy.rewardLabel}
                  </div>
                )}
              </div>
            );
          })()}

          {inspectedTrophy.isUnlocked && !inspectedTrophy.isClaimed && onClaimReward ? (
            <button
              onClick={() => {
                onClaimReward(inspectedTrophy.id);
                setInspectedTrophyId(null);
              }}
              className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-serif font-black text-xs sm:text-sm tracking-wider border border-amber-300 shadow transition transform active:scale-95 cursor-pointer shrink-0"
            >
              RECLAMAR RECOMPENSA AHORA
            </button>
          ) : (
            <button
              onClick={() => setInspectedTrophyId(null)}
              className="w-full py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-200 font-serif font-bold text-xs sm:text-sm tracking-wider border border-amber-500/50 shadow transition transform active:scale-95 cursor-pointer shrink-0"
            >
              ← VOLVER A LA LISTA
            </button>
          )}
        </div>
      )}
    </div>
  );
};
