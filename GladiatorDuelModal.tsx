import React, { useState, useMemo } from 'react';
import {
  TournamentContender,
  TOURNAMENT_CONTENDERS_ROSTER,
  DUNGEON_LORDS_TOURNAMENT_ROSTER,
  RECRUIT_TOURNAMENT_ROSTER,
  SHADOW_THRONE_TOURNAMENT_ROSTER,
  GladiatorDuelHandicap,
  GLADIATOR_DUEL_HANDICAPS,
  calculateGladiatorDuelRewards,
} from './campaignData';
import { gameAudio, isAndroidDevice } from './utils';
import { getGladiatorPortraitUrls, DIFFICULTY_BADGES, COLISEUM_BACKGROUNDS } from './gladiatorImageMap';
import { CachedImage } from './CachedImage';
import { GoldCoinIcon } from './GoldCoinIcon';

interface GladiatorDuelModalProps {
  playerGold: number;
  activeCampaignIndex?: number;
  unlockedCampaigns?: number[];
  completedCampaigns?: number[];
  unlockedGladiators: string[];
  onStartDuel: (contender: TournamentContender, handicap: GladiatorDuelHandicap) => void;
  onClose: () => void;
}

const CAMPAIGN_TOURNAMENT_TABS: ReadonlyArray<{
  campaignIndex: number;
  label: string;
  accentColor: string;
  roster: TournamentContender[];
}> = [
  {
    campaignIndex: 0,
    label: 'Torneo del Legado',
    accentColor: '#f59e0b',
    roster: TOURNAMENT_CONTENDERS_ROSTER,
  },
  {
    campaignIndex: 1,
    label: 'Señores del Calabozo',
    accentColor: '#c084fc',
    roster: DUNGEON_LORDS_TOURNAMENT_ROSTER,
  },
  {
    campaignIndex: 2,
    label: 'Torneíllo del Recluta',
    accentColor: '#34d399',
    roster: RECRUIT_TOURNAMENT_ROSTER,
  },
  {
    campaignIndex: 3,
    label: 'Trono de las Sombras',
    accentColor: '#f43f5e',
    roster: SHADOW_THRONE_TOURNAMENT_ROSTER,
  },
];

export function GladiatorDuelModal({
  playerGold,
  activeCampaignIndex = 0,
  unlockedCampaigns = [0],
  completedCampaigns = [],
  unlockedGladiators,
  onStartDuel,
  onClose,
}: GladiatorDuelModalProps) {
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const blurSm = isAndroid ? '' : 'backdrop-blur-sm';

  const visibleCampaignTabs = useMemo(() => {
    const filtered = CAMPAIGN_TOURNAMENT_TABS.filter(
      (tab) =>
        tab.campaignIndex === activeCampaignIndex ||
        unlockedCampaigns.includes(tab.campaignIndex) ||
        completedCampaigns.includes(tab.campaignIndex) ||
        tab.roster.some((c) => unlockedGladiators.includes(c.id))
    );
    return filtered.length > 0 ? filtered : [CAMPAIGN_TOURNAMENT_TABS[0]];
  }, [activeCampaignIndex, unlockedCampaigns, completedCampaigns, unlockedGladiators]);

  const [selectedCampaignTab, setSelectedCampaignTab] = useState<number>(() => {
    const activeMatch = visibleCampaignTabs.find((t) => t.campaignIndex === activeCampaignIndex);
    return activeMatch ? activeMatch.campaignIndex : visibleCampaignTabs[0].campaignIndex;
  });

  const activeTabConfig =
    visibleCampaignTabs.find((t) => t.campaignIndex === selectedCampaignTab) || visibleCampaignTabs[0];
  const currentRoster = activeTabConfig.roster;

  const isContenderDefeated = (id: string) => unlockedGladiators.includes(id);

  const isContenderUnlockedInRoster = (
    roster: TournamentContender[],
    campaignIdx: number,
    index: number
  ): boolean => {
    const contender = roster[index];
    if (!contender) return false;
    if (index === 0) return true;
    if (completedCampaigns.includes(campaignIdx)) return true;
    if (isContenderDefeated(contender.id)) return true;
    const prevContender = roster[index - 1];
    return Boolean(prevContender && isContenderDefeated(prevContender.id));
  };

  const pickDefaultContenderForRoster = (roster: TournamentContender[], campaignIdx: number) => {
    const nextChallenge = roster.find(
      (c, idx) => isContenderUnlockedInRoster(roster, campaignIdx, idx) && !isContenderDefeated(c.id)
    );
    const firstUnlocked = roster.find((_, idx) =>
      isContenderUnlockedInRoster(roster, campaignIdx, idx)
    );
    return nextChallenge || firstUnlocked || roster[0];
  };

  const [selectedContender, setSelectedContender] = useState<TournamentContender>(() =>
    pickDefaultContenderForRoster(currentRoster, activeTabConfig.campaignIndex)
  );
  const [selectedHandicap, setSelectedHandicap] = useState<GladiatorDuelHandicap>('NORMAL');

  const resolvedContender =
    currentRoster.find((c) => c.id === selectedContender.id) ||
    pickDefaultContenderForRoster(currentRoster, activeTabConfig.campaignIndex);

  const unlockedCount = currentRoster.filter((_, idx) =>
    isContenderUnlockedInRoster(currentRoster, activeTabConfig.campaignIndex, idx)
  ).length;
  const selectedIndex = currentRoster.findIndex((c) => c.id === resolvedContender.id);
  const isSelectedUnlocked =
    selectedIndex >= 0 &&
    isContenderUnlockedInRoster(currentRoster, activeTabConfig.campaignIndex, selectedIndex);
  const duelRewards = calculateGladiatorDuelRewards(selectedHandicap);

  const handleLaunch = () => {
    if (!isSelectedUnlocked) {
      gameAudio.playErrorBuzz();
      return;
    }
    gameAudio.playConfirmSelect();
    onStartDuel(resolvedContender, selectedHandicap);
  };

  const currentPortraitCandidates = getGladiatorPortraitUrls(
    resolvedContender.id,
    resolvedContender.name
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 animate-fadeIn overflow-hidden">
      {/* IMAGEN DE FONDO A PANTALLA COMPLETA */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <CachedImage
          cacheKey="bg_coliseum_duel"
          candidateUrls={COLISEUM_BACKGROUNDS}
          alt="Fondo Coliseo"
          className="w-full h-full object-cover filter brightness-45 contrast-125"
        />
        <div className={`absolute inset-0 ${isAndroid ? 'bg-black/80' : `bg-black/75 ${blurSm}`}`} />
      </div>

      {/* Contenedor Principal Flotante con Borde Dorado y Fondo Translúcido */}
      <div className={`relative z-10 w-full max-w-4xl bg-slate-950/85 border-2 border-amber-500/80 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.45)] flex flex-col max-h-[94dvh] overflow-hidden text-slate-100 ${blurMd}`}>
        {/* Contenido interactivo superior */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Cabecera del Modo Desafío */}
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-3 shrink-0 gap-2">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black font-serif tracking-widest text-amber-300 truncate">
                DESAFÍO DE GLADIADORES • DUELOS DIRECTOS
              </h2>
              <p className="text-xs text-slate-300">
                Desbloquea y derrota a los {currentRoster.length} campeones de «{activeTabConfig.label}» en revanchas tácticas inmediatas.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1 rounded-full bg-black/80 border border-amber-500/50 flex items-center gap-1.5 text-xs font-serif font-bold text-amber-300 shadow">
                <GoldCoinIcon size={14} />
                <span>{playerGold}</span>
              </div>
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-rose-950 text-rose-300 border border-rose-500/60 flex items-center justify-center text-sm font-bold transition active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pestañas por Campaña (cuando hay más de 1 torneo disponible) */}
          {visibleCampaignTabs.length > 1 && (
            <div className="flex items-center gap-1.5 mb-3 shrink-0 overflow-x-auto touch-pan-x pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {visibleCampaignTabs.map((tab) => {
                const isTabActive = tab.campaignIndex === activeTabConfig.campaignIndex;
                return (
                  <button
                    key={tab.campaignIndex}
                    type="button"
                    onClick={() => {
                      gameAudio.playCrispClick();
                      setSelectedCampaignTab(tab.campaignIndex);
                      setSelectedContender(pickDefaultContenderForRoster(tab.roster, tab.campaignIndex));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-serif font-bold text-[11px] tracking-wide border transition shrink-0 cursor-pointer ${
                      isTabActive
                        ? 'bg-black/95 text-white shadow-lg scale-[1.02]'
                        : 'bg-black/50 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
                    }`}
                    style={{
                      borderColor: isTabActive ? tab.accentColor : undefined,
                      color: isTabActive ? tab.accentColor : undefined,
                      boxShadow: isTabActive ? `0 0 14px ${tab.accentColor}45` : undefined,
                    }}
                  >
                    C{tab.campaignIndex + 1}: {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dos Columnas: Lista de Gladiadores a la izquierda, Ficha completa a la derecha */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden min-h-0">
            {/* Lista de Gladiadores con Foto de Perfil */}
            <div className="md:col-span-5 min-h-0 flex flex-col gap-2 overflow-y-auto touch-pan-y pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Selecciona tu Oponente:
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  {unlockedCount}/{currentRoster.length} Desbloqueados
                </span>
              </div>
              {currentRoster.map((c, idx) => {
                const isSelected = resolvedContender.id === c.id;
                const isDefeatedBefore = isContenderDefeated(c.id);
                const isUnlocked = isContenderUnlockedInRoster(currentRoster, activeTabConfig.campaignIndex, idx);
                const prevContender = idx > 0 ? currentRoster[idx - 1] : null;
                const portraitUrls = getGladiatorPortraitUrls(c.id, c.name);

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (!isUnlocked) {
                        gameAudio.playErrorBuzz();
                        return;
                      }
                      gameAudio.playCrispClick();
                      setSelectedContender(c);
                    }}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition transform flex items-center gap-3 ${
                      !isUnlocked
                        ? 'bg-slate-950/60 border-slate-800/70 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-98'
                        : 'bg-black/60 border-slate-800 hover:border-slate-600 hover:bg-black/80 cursor-pointer active:scale-98'
                    }`}
                  >
                    {/* Marco con Retrato Oficial de Gladiador */}
                    <div
                      className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black font-serif text-base border-2 shrink-0 shadow overflow-hidden relative bg-slate-950 ${
                        !isUnlocked ? 'grayscale brightness-50' : ''
                      }`}
                      style={{
                        backgroundColor: `${c.avatarColor}20`,
                        borderColor: isUnlocked ? c.avatarColor : '#334155',
                      }}
                    >
                      <CachedImage
                        key={`thumb_${c.id}`}
                        cacheKey={`gladiator_thumb_${c.id}`}
                        candidateUrls={portraitUrls}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        fallbackPlaceholder={
                          <span className="text-xs font-serif font-bold text-slate-300">
                            {c.name.charAt(0)}
                          </span>
                        }
                      />
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-base">
                          🔒
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className={`font-serif font-black text-xs sm:text-sm truncate ${isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                          {c.name}
                        </h4>
                        {!isUnlocked ? (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 font-mono font-bold shrink-0">
                            🔒 BLOQUEADO
                          </span>
                        ) : isDefeatedBefore ? (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-mono font-bold shrink-0">
                            ✓ VENCIDO
                          </span>
                        ) : (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 font-mono font-bold shrink-0">
                            ⚔️ RETO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {!isUnlocked && prevContender
                          ? `Vence a ${prevContender.name} para desbloquear`
                          : c.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panel de Detalles del Gladiador y Ajuste de Dificultad Ilustrado */}
            <div className="md:col-span-7 min-h-0 flex flex-col justify-between bg-black/80 border border-slate-800 rounded-2xl p-4 overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative">
              <div className="flex flex-col gap-3">
                {/* Gran Ficha con Retrato Detallado del Gladiador Seleccionado */}
                <div
                  className="p-3.5 rounded-2xl border flex items-center gap-3.5 relative overflow-hidden"
                  style={{
                    backgroundColor: `${resolvedContender.avatarColor}15`,
                    borderColor: resolvedContender.avatarColor,
                  }}
                >
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex items-center justify-center shadow-xl shrink-0 overflow-hidden relative bg-slate-950"
                    style={{
                      borderColor: resolvedContender.avatarColor,
                      boxShadow: `0 0 25px ${resolvedContender.avatarColor}60`,
                    }}
                  >
                    <CachedImage
                      key={`main_${resolvedContender.id}`}
                      cacheKey={`gladiator_main_${resolvedContender.id}`}
                      candidateUrls={currentPortraitCandidates}
                      alt={resolvedContender.name}
                      className="w-full h-full object-cover"
                      fallbackPlaceholder={
                        <span className="text-sm font-serif font-black text-slate-300">
                          {resolvedContender.name.substring(0, 2).toUpperCase()}
                        </span>
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-black font-serif truncate" style={{ color: resolvedContender.avatarColor }}>
                      {resolvedContender.name}
                    </h3>
                    <p className="text-xs text-slate-300 font-sans italic line-clamp-2 mt-1">
                      «{resolvedContender.quote}»
                    </p>
                  </div>
                </div>

                {/* Estadísticas de Batalla */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-mono uppercase text-slate-400 block">Salud Rey</span>
                    <strong className="text-sm font-serif text-rose-400 font-black">{resolvedContender.masterHp} HP</strong>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-mono uppercase text-slate-400 block">Ataque Base</span>
                    <strong className="text-sm font-serif text-amber-400 font-black">{resolvedContender.masterAtk} ATK</strong>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-mono uppercase text-slate-400 block">Fase Gran Torneo</span>
                    <strong className="text-sm font-serif text-cyan-400 font-black">Fase {resolvedContender.phaseRound}/3</strong>
                  </div>
                </div>

                {/* Aura y Lore */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block mb-1">
                    Aura Táctica: {resolvedContender.specialAura}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                    {resolvedContender.lore}
                  </p>
                </div>

                {/* Selector de Dificultad con imágenes que cubren la caja */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Selecciona la Dificultad del Duelo:
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['NORMAL', 'HARD', 'TITAN'] as const).map((mode) => {
                      const info = GLADIATOR_DUEL_HANDICAPS[mode];
                      const isPicked = selectedHandicap === mode;
                      const badgeUrls = DIFFICULTY_BADGES[mode];

                      return (
                        <button
                          key={mode}
                          onClick={() => {
                            gameAudio.playCrispClick();
                            setSelectedHandicap(mode);
                          }}
                          className={`h-32 sm:h-36 rounded-2xl border-2 flex flex-col justify-end p-2 text-center transition cursor-pointer active:scale-95 relative overflow-hidden group shadow-lg ${
                            isPicked
                              ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-2 ring-amber-300'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <CachedImage
                            cacheKey={`diff_badge_${mode}`}
                            candidateUrls={badgeUrls}
                            alt={info.label}
                            className="absolute inset-0 w-full h-full object-cover filter brightness-85 group-hover:scale-105 group-hover:brightness-95 transition-all duration-300 -z-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />

                          <div className="relative z-20 w-full">
                            <span className={`text-xs sm:text-sm font-serif font-black block leading-tight drop-shadow-md ${info.tagColor}`}>
                              {info.label}
                            </span>
                            <span className="text-[10px] text-slate-200 font-mono block mt-0.5 drop-shadow">
                              {info.rewardMult}x Botín
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 italic px-1 mt-0.5">
                    {GLADIATOR_DUEL_HANDICAPS[selectedHandicap].desc}
                  </p>
                </div>
              </div>

              {/* Botón de Lanzamiento de Combate */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-2">
                <div className="text-xs text-slate-300">
                  <span className="text-amber-400 font-black">Recompensas: </span>
                  <span>+{duelRewards.gold} Oro • +{duelRewards.exp} EXP</span>
                </div>

                <button
                  type="button"
                  disabled={!isSelectedUnlocked}
                  onClick={handleLaunch}
                  className={`py-2.5 px-6 rounded-full font-serif font-black text-xs sm:text-sm tracking-wider shadow-xl border-2 transition transform ${
                    isSelectedUnlocked
                      ? 'border-amber-300 active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400'
                      : 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSelectedUnlocked ? '¡BATIRSE EN DUELO!' : '🔒 OPONENTE BLOQUEADO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
