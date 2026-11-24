import React, { useRef } from 'react';
import { MenuOverlay, gameAudio, isAndroidDevice } from './utils';
import { GoldCoinIcon } from './GoldCoinIcon';
import { BattleRewardModalData, ColiseumDifficulty, DieData, Orb } from './types';
import { CAMPAIGN_EXCLUSIVES } from './campaignThemeExclusives';
import { getDieImageCandidateUrls } from './diceImageMap';
import { getOrbAllCandidateUrls } from './irvbeOrbImages';
import {
  TournamentContender,
  AlleyOpponent,
  GladiatorDuelHandicap,
  calculateGladiatorDuelRewards,
} from './campaignData';
import { CachedImage } from './CachedImage';

export interface VictoryAchievementData {
  campaignIndex: number;
  title: string;
  badge: string;
  goldReward: number;
  specialBonus: string;
}

export interface BattleEndOverlaysProps {
  // Pending Reward Modal (Roguelite choices)
  pendingRewardModal: BattleRewardModalData | null;
  setPendingRewardModal: (m: BattleRewardModalData | null) => void;
  activeCampaignIndex: number;
  playerLevel: number;
  setPlayerDeck: React.Dispatch<React.SetStateAction<DieData[]>>;
  setOrbBank: React.Dispatch<React.SetStateAction<Orb[]>>;
  setLevelUpChoiceModal: (m: { newLevel: number } | null) => void;
  onTriggerLevelUps?: (levels: number[]) => void;
  isLevelUpChoiceModalOpen?: boolean;
  triggerNotification?: (text: string, color?: string) => void;

  // Victory Achievement Modal
  victoryAchievementModal: VictoryAchievementData | null;
  onContinueFromVictoryAchievement: () => void;

  // Tutorial Completion Modal
  tutorialCompletionModal: {
    lessonTitle: string;
    residentName: string;
    residentTopic: string;
    residentColor: string;
    residentIcon: string;
    totalCompleted: number;
    exitPos: [number, number, number] | null;
  } | null;
  onCloseTutorialCompletion: () => void;

  // Coliseum Unlocked Hub
  showColiseumUnlockedHub: boolean;
  onContinueFromColiseumUnlocked: () => void;

  // Defeat Result Modal
  showDefeatResultModal: boolean;
  onCloseDefeatResult: () => void;
  isGladiatorDuelMode: boolean;
  gladiatorDuelRival: TournamentContender | AlleyOpponent | null;
  gladiatorDuelHandicap?: GladiatorDuelHandicap;
  isSurvivalMode: boolean;
  survivalWave: number;
  survivalDifficulty?: ColiseumDifficulty;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  survivalOriginScreen: 'CAMPAIGN_HUB' | 'COLISEUM_INTERIOR';

  // GameState status Victory
  isVictoryOverlayOpen: boolean;
  survivalHighScore: number;
  tournamentRound: number;
  completedTournamentRound?: number;
  activeTournamentContender: TournamentContender | null;
  nextTournamentContender?: TournamentContender | null;
  defeatedAlleyOpponentsCount: number;
  isCampaignAlreadyCompleted?: boolean;
  tournamentCompletionsCount?: number;
  victoryRewardGold?: number | null;
  isChampionOfCampaign?: boolean;
  onVictoryContinue: () => void;
  onVictoryReturnToColiseumDuel?: () => void;
  onVictoryReturnFromSurvival?: () => void;
}

export const BattleEndOverlays: React.FC<BattleEndOverlaysProps> = ({
  pendingRewardModal,
  setPendingRewardModal,
  activeCampaignIndex,
  playerLevel,
  setPlayerDeck,
  setOrbBank,
  setLevelUpChoiceModal,
  onTriggerLevelUps,
  isLevelUpChoiceModalOpen = false,
  triggerNotification,
  victoryAchievementModal,
  onContinueFromVictoryAchievement,
  tutorialCompletionModal,
  onCloseTutorialCompletion,
  showColiseumUnlockedHub,
  onContinueFromColiseumUnlocked,
  showDefeatResultModal,
  onCloseDefeatResult,
  isGladiatorDuelMode,
  gladiatorDuelRival,
  gladiatorDuelHandicap = 'NORMAL' as GladiatorDuelHandicap,
  isSurvivalMode,
  survivalWave,
  survivalDifficulty = 'NORMAL',
  campaignPhase,
  survivalOriginScreen,
  isVictoryOverlayOpen,
  survivalHighScore,
  tournamentRound,
  completedTournamentRound,
  activeTournamentContender,
  nextTournamentContender,
  defeatedAlleyOpponentsCount,
  isCampaignAlreadyCompleted = false,
  tournamentCompletionsCount = 0,
  victoryRewardGold = null,
  isChampionOfCampaign = false,
  onVictoryContinue,
  onVictoryReturnToColiseumDuel,
  onVictoryReturnFromSurvival,
}) => {
  const rewardClaimedRef = useRef<boolean>(false);
  const lastRewardModalRef = useRef<BattleRewardModalData | null>(null);

  if (pendingRewardModal && pendingRewardModal !== lastRewardModalRef.current) {
    lastRewardModalRef.current = pendingRewardModal;
    rewardClaimedRef.current = false;
  } else if (!pendingRewardModal) {
    lastRewardModalRef.current = null;
  }

  return (
    <>
      {/* 1. MODAL DE RECOMPENSAS ROGUELITE POST-VICTORIA EN LA CAMPAÑA */}
      {pendingRewardModal && (
        <div className={`fixed inset-0 bg-black/90 z-[140] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
          <div className="m-auto max-w-md w-full bg-black/95 border-2 border-amber-500 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <h3 className="text-lg sm:text-xl font-black font-serif tracking-widest text-amber-300 mb-3 mt-1">
              ¡VICTORIA EN LA CAMPAÑA!
            </h3>

            <div className="w-full bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3 mb-3 flex items-center justify-around shadow-inner">
              <div className="flex items-center gap-1.5 font-serif font-black text-amber-400 text-sm sm:text-base">
                <GoldCoinIcon size={18} />
                <span>+{pendingRewardModal.gold} ORO</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 font-serif font-black text-cyan-300 text-sm sm:text-base">
                <span>⭐ +{pendingRewardModal.exp} EXP</span>
              </div>
            </div>

            {pendingRewardModal.leveledUp && (() => {
              const lvlCount = pendingRewardModal.gainedLevels?.length || 1;
              return (
                <div className="w-full bg-emerald-950/60 border border-emerald-400/80 rounded-2xl p-3 mb-3 text-left shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
                  <div className="flex items-center gap-2 text-emerald-300 font-serif font-black text-xs sm:text-sm">
                    <span>🎉</span>
                    <span>
                      ¡SUBIDA DE NIVEL: RANGO {pendingRewardModal.newLevel}!
                      {lvlCount > 1 ? ` (+${lvlCount} MEJORAS)` : ''}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-200 mt-1 font-sans leading-snug">
                    Tras elegir tu botín táctico podrás{' '}
                    <strong>
                      asignar {lvlCount > 1 ? `${lvlCount} mejoras de características permanentes` : 'una mejora de característica permanente'} a tu Ficha Maestra
                    </strong>.
                  </p>
                </div>
              );
            })()}

            {(() => {
              const profile = CAMPAIGN_EXCLUSIVES[activeCampaignIndex] || CAMPAIGN_EXCLUSIVES[0];
              return (
                <div
                  className="w-full rounded-2xl p-2.5 mb-3 border text-left flex items-center justify-between"
                  style={{
                    backgroundColor: `${profile.themeColor}15`,
                    borderColor: `${profile.themeColor}60`,
                  }}
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: profile.themeColor }}>
                      CAMPAÑA {activeCampaignIndex + 1}: {profile.name}
                    </span>
                    <span className="text-[11px] font-serif font-bold text-slate-100 block">
                      Temática: {profile.diceArchetype}
                    </span>
                  </div>
                </div>
              );
            })()}

            <p className="text-xs text-slate-300 font-sans mb-3.5">
              Elige tu recompensa táctica: <strong>el Dado</strong> o <strong>el Orbe</strong> generado por azar.
            </p>

            <div className="flex flex-col gap-3 w-full mb-2">
              {(() => {
                const die = pendingRewardModal.randomDie;
                const dieCandidateUrls = getDieImageCandidateUrls(die.name, undefined, die.rarity?.name);

                return (
                  <button
                    onClick={() => {
                      if (rewardClaimedRef.current) return;
                      rewardClaimedRef.current = true;
                      setPlayerDeck((prev) => [
                        ...prev,
                        {
                          id: `d_rew_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                          name: die.name,
                          rarity: die.rarity,
                          level: 1,
                          attachedOrbs: [],
                          enMazo: false,
                        },
                      ]);
                      gameAudio.playPowerupChime();
                      const wasLevelUp = pendingRewardModal.leveledUp;
                      const nextLvl = pendingRewardModal.newLevel || (playerLevel + 1);
                      const levelsToGrant =
                        pendingRewardModal.gainedLevels && pendingRewardModal.gainedLevels.length > 0
                          ? pendingRewardModal.gainedLevels
                          : wasLevelUp
                          ? [nextLvl]
                          : [];
                      setPendingRewardModal(null);
                      if (triggerNotification) {
                        triggerNotification(`¡Has elegido el ${die.name} (${die.rarity.name})! Guardado en reserva.`, '#38bdf8');
                      }
                      if (wasLevelUp && levelsToGrant.length > 0) {
                        if (onTriggerLevelUps) {
                          onTriggerLevelUps(levelsToGrant);
                        } else {
                          setLevelUpChoiceModal({ newLevel: levelsToGrant[0] });
                        }
                        gameAudio.playLevelUpStinger();
                      }
                    }}
                    className="p-3 rounded-2xl bg-slate-950/90 border-2 border-cyan-500/60 hover:border-cyan-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black border border-cyan-500/50 overflow-hidden relative flex items-center justify-center shrink-0 shadow-md">
                        <CachedImage
                          cacheKey={`reward_die_${die.name}`}
                          candidateUrls={dieCandidateUrls}
                          alt={die.name}
                          loading="eager"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-black text-xs sm:text-sm text-cyan-300 group-hover:text-cyan-200 truncate">
                            {die.name}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5">
                          Rareza: <strong className={die.rarity.class}>{die.rarity.name}</strong> • {die.rarity.slots} {die.rarity.slots === 1 ? 'ranura de orbe' : 'ranuras de orbe'}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[11px] font-serif font-black group-hover:bg-cyan-400 group-hover:text-black transition shrink-0">
                      Elegir Dado
                    </span>
                  </button>
                );
              })()}

              {(() => {
                const orb = pendingRewardModal.randomOrb;
                const orbCandidateUrls = getOrbAllCandidateUrls(orb.name, orb.element, orb.id);

                return (
                  <button
                    onClick={() => {
                      if (rewardClaimedRef.current) return;
                      rewardClaimedRef.current = true;
                      setOrbBank((prev) => [...prev, orb]);
                      gameAudio.playPowerupChime();
                      const wasLevelUp = pendingRewardModal.leveledUp;
                      const nextLvl = pendingRewardModal.newLevel || (playerLevel + 1);
                      const levelsToGrant =
                        pendingRewardModal.gainedLevels && pendingRewardModal.gainedLevels.length > 0
                          ? pendingRewardModal.gainedLevels
                          : wasLevelUp
                          ? [nextLvl]
                          : [];
                      setPendingRewardModal(null);
                      if (triggerNotification) {
                        triggerNotification(`¡Has elegido el ${orb.name} (${orb.element})! Guardado en tu banco.`, '#c084fc');
                      }
                      if (wasLevelUp && levelsToGrant.length > 0) {
                        if (onTriggerLevelUps) {
                          onTriggerLevelUps(levelsToGrant);
                        } else {
                          setLevelUpChoiceModal({ newLevel: levelsToGrant[0] });
                        }
                        gameAudio.playLevelUpStinger();
                      }
                    }}
                    className="p-3 rounded-2xl bg-slate-950/90 border-2 border-purple-500/60 hover:border-purple-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black border border-purple-500/50 overflow-hidden relative flex items-center justify-center shrink-0 shadow-md">
                        <CachedImage
                          cacheKey={`reward_orb_${orb.templateId || orb.id || orb.name}`}
                          candidateUrls={orbCandidateUrls}
                          alt={orb.name}
                          loading="eager"
                          className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-black text-xs sm:text-sm text-purple-300 group-hover:text-purple-200 truncate">
                            {orb.name}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono">({orb.element})</span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5">
                          Efecto: <strong className="text-purple-200">{orb.effect}</strong>
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/50 text-[11px] font-serif font-black group-hover:bg-purple-400 group-hover:text-black transition shrink-0">
                      Elegir Orbe
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL ESPECIAL DE LOGRO Y RECOMPENSA DE CAMPAÑA FINALIZADA */}
      {victoryAchievementModal && (
        <div className={`fixed inset-0 bg-black/95 z-[160] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
          <div className="m-auto max-w-md w-full bg-black/95 border-2 border-amber-400 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.7)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center text-3xl mb-2.5 shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-bounce shrink-0">
              🏆
            </div>

            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 mb-1">
              ¡CAMPAÑA CONQUISTADA!
            </span>

            <h2 className="text-xl sm:text-2xl font-black font-serif tracking-widest text-amber-300 mb-1">
              LOGRO: {victoryAchievementModal.title.toUpperCase()}
            </h2>

            <div className="text-sm font-serif text-slate-200 mb-3.5 font-bold flex items-center justify-center gap-1.5">
              <span>{victoryAchievementModal.badge}</span>
            </div>

            <div className="w-full bg-black/90 p-3.5 rounded-2xl border border-amber-500/40 mb-4 flex flex-col gap-1.5 shadow-inner">
              <span className="text-xs font-serif text-slate-300">Recompensas Reclamadas de la Campaña:</span>
              <div className="flex items-center justify-center gap-2 text-base font-black text-amber-300">
                <GoldCoinIcon size={20} />
                <span>+{victoryAchievementModal.goldReward} ORO DE GLORIA</span>
              </div>
              <div className="text-xs text-emerald-300 font-serif font-bold mt-0.5">
                ⭐ {victoryAchievementModal.specialBonus}
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 font-sans leading-relaxed">
              Tu victoria ha quedado grabada en los anales del reino. Ahora puedes <strong>repetir esta campaña cuantas veces quieras</strong> desde el selector de campañas para acumular más oro y victorias.
            </p>

            <button
              onClick={onContinueFromVictoryAchievement}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-serif font-black text-xs sm:text-sm tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.8)] border border-amber-300 transition transform active:scale-95 cursor-pointer"
            >
              CONTINUAR Y CELEBRAR
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL DE SUPERACIÓN DEL TUTORIAL */}
      {tutorialCompletionModal && (
        <div className={`fixed inset-0 bg-black/90 z-[190] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
          <div
            className="m-auto max-w-md w-full bg-black/95 border-2 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.95)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              borderColor: tutorialCompletionModal.residentColor,
              boxShadow: `0 0 50px ${tutorialCompletionModal.residentColor}40`,
            }}
          >
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-3xl mb-2.5 shadow animate-bounce shrink-0"
              style={{
                backgroundColor: `${tutorialCompletionModal.residentColor}20`,
                borderColor: tutorialCompletionModal.residentColor,
              }}
            >
              {tutorialCompletionModal.residentIcon}
            </div>

            <span
              className="text-[10px] font-mono uppercase tracking-widest font-bold px-3 py-1 rounded-full mb-1.5 border"
              style={{
                color: tutorialCompletionModal.residentColor,
                backgroundColor: `${tutorialCompletionModal.residentColor}15`,
                borderColor: `${tutorialCompletionModal.residentColor}50`,
              }}
            >
              LECCIÓN TÁCTICA SUPERADA
            </span>

            <h2 className="text-xl sm:text-2xl font-black font-serif tracking-widest text-amber-300 mb-1 leading-tight">
              ¡EXCELENTE MAESTRÍA!
            </h2>

            <div className="text-xs font-serif text-slate-300 mb-3.5 font-bold">
              {tutorialCompletionModal.lessonTitle}
            </div>

            <div className="w-full bg-slate-950/90 p-4 rounded-2xl border border-slate-800 mb-4 text-left text-xs font-serif text-slate-200 shadow-inner flex flex-col gap-2 leading-relaxed">
              <p className="italic text-amber-200/90">
                «Has ejecutado los fundamentos con pulcritud y temple, Soberano. El conocimiento de esta casa vive ahora en tus tácticas de combate.»
              </p>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] font-sans text-slate-400">
                <span>— {tutorialCompletionModal.residentName}</span>
                <span className="text-emerald-400 font-bold font-mono">
                  Progreso del Códice: {tutorialCompletionModal.totalCompleted}/12
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-5 font-sans leading-relaxed">
              Al aceptar regresarás de manera serena a la calle frente a la casa para proseguir con tu recorrido por la Ciudad.
            </p>

            <button
              type="button"
              onClick={onCloseTutorialCompletion}
              className="w-full py-3 px-6 rounded-full font-serif font-black text-xs sm:text-sm tracking-wider uppercase transition transform active:scale-95 shadow-xl border cursor-pointer"
              style={{
                backgroundColor: tutorialCompletionModal.residentColor,
                color: '#000000',
                borderColor: '#ffffff',
                boxShadow: `0 0 25px ${tutorialCompletionModal.residentColor}80` ,
              }}
            >
              REGRESAR A LA CIUDAD EN PAZ
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL / HUB INFORMATIVO: DESBLOQUEO DEL COLISEO Y GRAN ARENA */}
      {showColiseumUnlockedHub && !pendingRewardModal && !isLevelUpChoiceModalOpen && (
        <div
          className={`fixed inset-0 bg-black/95 z-[150] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={onContinueFromColiseumUnlocked}
        >
          <div
            className="m-auto max-w-md w-full bg-black/95 border-2 border-amber-400 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.65)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 mb-2 shrink-0">
              FASE CLASIFICATORIA COMPLETADA (12 / 12)
            </span>

            <h2 className="text-xl sm:text-2xl font-black font-serif tracking-widest text-amber-300 mb-1 leading-tight shrink-0">
              ¡EL COLISEO ESTÁ DISPONIBLE!
            </h2>

            <div className="text-sm font-serif text-slate-200 mb-3 font-bold shrink-0">
              {activeCampaignIndex === 3
                ? '«El Torneo Supremo de los 8 Emperadores»'
                : activeCampaignIndex === 2
                ? '«El Torneíllo de Aficionados del Gran Maestro»'
                : activeCampaignIndex === 1
                ? '«El Torneo Élite de los 8 Señores del Calabozo»'
                : '«El Gran Torneo Oficial de Campeones»'}
            </div>

            <div className="w-full bg-slate-950/90 p-3.5 sm:p-4 rounded-2xl border border-amber-500/40 mb-4 text-left text-xs font-sans text-slate-300 shadow-inner shrink-0 leading-relaxed">
              <p className="mb-2">
                ¡Felicidades, Soberano! Has derrotado con honor a los <strong>12 contrincantes</strong> de las calles y callejuelas.
              </p>
              <p className="text-amber-300 font-serif font-bold text-[11px] mb-1">
                ⭐ Las puertas de la Gran Arena y el Coliseo han sido abiertas formalmente.
              </p>
              <p className="text-[10px] text-slate-400">
                El Coliseo ha quedado formalmente habilitado en la Ciudad. Puedes visitarlo cuando desees caminando hacia su entrada al norte de la plaza.
              </p>
            </div>

            <button
              type="button"
              onClick={onContinueFromColiseumUnlocked}
              className="w-full py-2.5 sm:py-3 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-serif font-black text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.7)] border border-amber-300 transition transform active:scale-95 text-center flex items-center justify-center cursor-pointer shrink-0"
            >
              ENTENDIDO, CONTINUAR A LA CIUDAD
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL DE RESULTADO DE DERROTA MILITAR */}
      {showDefeatResultModal && (
        <div className={`fixed inset-0 bg-black/90 z-[125] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}>
          <div className={`m-auto w-full max-w-sm max-h-[92dvh] flex flex-col items-center bg-black/95 border-2 border-rose-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(244,63,94,0.6)] text-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} overflow-y-auto touch-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(244,63,94,0.6)] shrink-0">
              💀
            </div>
            <h2 className="text-xl font-black font-serif tracking-widest text-rose-400 mb-1 leading-tight shrink-0">
              DERROTA EN BATALLA
            </h2>
            <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed shrink-0">
              {isGladiatorDuelMode && gladiatorDuelRival
                ? `Has caído frente a ${gladiatorDuelRival.name} en el Desafío de Gladiadores. Tu honor permanece intacto.`
                : isSurvivalMode
                ? `Tu resistencia en el Coliseo ha concluido en la Oleada ${survivalWave}. Tu récord de ${survivalHighScore} ${survivalHighScore === 1 ? 'oleada superada' : 'oleadas superadas'} ha quedado guardado.`
                : campaignPhase === 'TOURNAMENT'
                ? 'Has caído en la Arena del Gran Torneo. Regresas a la Ciudad para rearmar tu estrategia e intentarlo de nuevo.'
                : 'Tu Soberano ha caído en este duelo.'}
            </p>
            <button
              onClick={onCloseDefeatResult}
              className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-black/90 hover:bg-black text-rose-300 font-serif font-black text-xs sm:text-sm tracking-widest border-2 border-rose-500/80 hover:border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.6)] transition transform active:scale-95 shrink-0 cursor-pointer"
            >
              {isGladiatorDuelMode
                ? 'REGRESAR AL COLISEO'
                : isSurvivalMode
                ? survivalOriginScreen === 'CAMPAIGN_HUB'
                  ? 'REGRESAR AL CAMPAMENTO'
                  : 'REGRESAR AL COLISEO'
                : campaignPhase === 'TOURNAMENT'
                ? 'REGRESAR AL COLISEO'
                : 'REGRESAR A LA CIUDAD'}
            </button>
          </div>
        </div>
      )}

      {/* 6. OVERLAY OFICIAL DE VICTORIA (Excluido si pendingRewardModal o showColiseumUnlockedHub están activos para evitar solapamientos) */}
      {isVictoryOverlayOpen && !pendingRewardModal && !showColiseumUnlockedHub && !isLevelUpChoiceModalOpen && (() => {
        const isFirstTimeColiseumUnlock =
          !isSurvivalMode &&
          !isGladiatorDuelMode &&
          !isCampaignAlreadyCompleted &&
          (showColiseumUnlockedHub ||
            (defeatedAlleyOpponentsCount >= 12 && tournamentRound === 1 && !activeTournamentContender));

        const disputedTournamentRound =
          completedTournamentRound ??
          (isChampionOfCampaign
            ? 3
            : activeTournamentContender?.phaseRound ?? Math.max(1, tournamentRound - 1));
        const upcomingTournamentOpponentName = nextTournamentContender?.name;
        const isRepeatedTournament = isCampaignAlreadyCompleted && tournamentCompletionsCount >= 1;
        const survivalDiffMultiplier =
          survivalDifficulty === 'PESADILLA' ? 3.0 : survivalDifficulty === 'HEROICO' ? 1.8 : 1.0;
        const clearedSurvivalWave = Math.max(1, survivalWave - 1);
        const effectiveSurvivalHighScore = Math.max(survivalHighScore, clearedSurvivalWave);
        const survivalFallbackGold = Math.round((150 + clearedSurvivalWave * 60) * survivalDiffMultiplier);

        const displayedVictoryGold =
          victoryRewardGold !== null && victoryRewardGold !== undefined
            ? victoryRewardGold
            : isGladiatorDuelMode
            ? calculateGladiatorDuelRewards(gladiatorDuelHandicap).gold
            : isSurvivalMode
            ? survivalFallbackGold
            : campaignPhase === 'TOURNAMENT' && activeTournamentContender
            ? isRepeatedTournament && !isChampionOfCampaign
              ? 0
              : 400
            : 300;

        return (
        <MenuOverlay tone="victory" zIndex={65}>
          <div className={`w-full max-w-sm max-h-[92dvh] flex flex-col items-center bg-black/95 border-2 border-amber-500 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.6)] text-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} overflow-y-auto touch-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
            <h2 className="text-lg sm:text-2xl font-black font-serif tracking-widest text-amber-300 mb-1 mt-1 leading-tight shrink-0">
              {isSurvivalMode
                ? `¡OLEADA ${clearedSurvivalWave} SUPERADA!`
                : isFirstTimeColiseumUnlock
                ? '¡FASE CLASIFICATORIA CUMPLIDA!'
                : campaignPhase === 'TOURNAMENT' && activeTournamentContender && isChampionOfCampaign
                ? '¡CAMPEÓN SUPREMO!'
                : campaignPhase === 'TOURNAMENT' && activeTournamentContender
                ? tournamentRound === 3
                  ? '¡CLASIFICADO A LA GRAN FINAL!'
                  : disputedTournamentRound === 1
                  ? '¡VICTORIA EN CUARTOS DE FINAL!'
                  : '¡VICTORIA EN EL TORNEO!'
                : '¡VICTORIA ÉPICA!'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mb-2 font-sans leading-relaxed shrink-0">
              {isSurvivalMode
                ? `Has vencido a las fuerzas del Coliseo. Tu récord actual es de ${effectiveSurvivalHighScore} ${effectiveSurvivalHighScore === 1 ? 'oleada superada' : 'oleadas superadas'}. ¿Listo para la Oleada ${survivalWave}?`
                : isGladiatorDuelMode && gladiatorDuelRival
                ? `Has vencido a ${gladiatorDuelRival.name} en el Desafío de Gladiadores del Coliseo.`
                : isFirstTimeColiseumUnlock
                ? '¡Has derrotado a los 12 rivales de la callejuela! El Coliseo de la Gran Arena ha quedado oficialmente desbloqueado.'
                : campaignPhase === 'TOURNAMENT' && activeTournamentContender
                ? isChampionOfCampaign
                  ? `¡Has derrotado a ${activeTournamentContender.name} y te has coronado Campeón Supremo del Legado!`
                  : tournamentRound === 3
                  ? `¡Has superado las Semifinales (Ronda ${disputedTournamentRound}/3) ante ${activeTournamentContender.name}! Te espera la Gran Final del Torneo contra ${upcomingTournamentOpponentName || 'el Campeón Final'}.`
                  : `¡Has superado los Cuartos de Final (Ronda ${disputedTournamentRound}/3) ante ${activeTournamentContender.name}! Avanzas a las Semifinales${upcomingTournamentOpponentName ? ` contra ${upcomingTournamentOpponentName}` : ''} (Ronda ${tournamentRound}/3).`
                : 'Has derrotado al rival en la callejuela y ganado recompensas.'}
            </p>
            <div className="px-3.5 py-1 rounded-full bg-black/80 border border-amber-500/60 text-xs sm:text-sm font-serif font-bold text-amber-400 mb-2.5 shadow flex items-center gap-1.5 shrink-0">
              <span>{`+${displayedVictoryGold}`}</span>
              <GoldCoinIcon size={14} />
              <span>
                {isGladiatorDuelMode
                  ? `Oro (+${calculateGladiatorDuelRewards(gladiatorDuelHandicap).exp} EXP)`
                  : isSurvivalMode
                  ? `Oro de Supervivencia [${survivalDifficulty}]`
                  : campaignPhase === 'TOURNAMENT' && activeTournamentContender
                  ? displayedVictoryGold === 0
                    ? 'Oro (Premio en la Gran Final)'
                    : 'Gloria del Torneo'
                  : 'Monedas Obtenidas'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 w-full shrink-0">
              <button
                onClick={onVictoryContinue}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-serif font-black text-xs sm:text-sm tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.8)] transition transform active:scale-95 border border-amber-300 cursor-pointer"
              >
                {isSurvivalMode
                  ? `LUCHAR EN OLEADA ${survivalWave}`
                  : isFirstTimeColiseumUnlock
                  ? 'CONTINUAR A LA CIUDAD'
                  : !isGladiatorDuelMode && campaignPhase === 'TOURNAMENT' && activeTournamentContender && !isChampionOfCampaign
                  ? tournamentRound === 3
                    ? 'DISPUTAR LA GRAN FINAL ⚔️'
                    : 'SIGUIENTE RONDA DEL TORNEO ⚔️'
                  : 'CONTINUAR A LA CIUDAD'}
              </button>

              {isGladiatorDuelMode && onVictoryReturnToColiseumDuel && (
                <button
                  onClick={onVictoryReturnToColiseumDuel}
                  className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-serif font-black text-xs sm:text-sm tracking-wider border border-amber-300 shadow active:scale-95 cursor-pointer"
                >
                  Regresar al Coliseo con la Victoria
                </button>
              )}

              {isSurvivalMode && onVictoryReturnFromSurvival && (
                <button
                  onClick={onVictoryReturnFromSurvival}
                  className="w-full py-2 sm:py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-serif font-bold text-xs tracking-wider border border-slate-700 active:scale-95 cursor-pointer"
                >
                  {survivalOriginScreen === 'CAMPAIGN_HUB'
                    ? 'Regresar al Campamento con el Botín'
                    : 'Regresar al Coliseo con el Botín'}
                </button>
              )}
            </div>
          </div>
        </MenuOverlay>
        );
      })()}
    </>
  );
};

export default BattleEndOverlays;
