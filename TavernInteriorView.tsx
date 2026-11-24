import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TavernInterior, DailyContract, TavernDialogueData } from './TavernInterior';
import { TypewriterDialogue } from './TypewriterDialogue';
import { getContractImageCandidateUrls, ContractMissionType } from './contractImageMap';
import { getTimeUntilNextDailyReset, getTodayDateKey } from './dailyContractSystem';
import { saveVerifiedUrl } from './imageOptimizer';
import { gameAudio, isAndroidDevice } from './utils';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { VirtualDpad } from './VirtualDpad';
import { CachedImage } from './CachedImage';

export interface TavernInteriorViewProps {
  playerName: string;
  dailyContracts: DailyContract[];
  setDailyContracts: React.Dispatch<React.SetStateAction<DailyContract[]>>;
  playerLevel: number;
  playerGold: number;
  setPlayerGold: React.Dispatch<React.SetStateAction<number>>;
  unlockedCampaigns: number[];
  isAnyGlobalModalOpen: boolean;
  isTrophyModalOpen: boolean;
  tavernActiveDialogue: TavernDialogueData | null;
  setTavernActiveDialogue: (d: TavernDialogueData | null) => void;
  isTavernContractBoardOpen: boolean;
  setIsTavernContractBoardOpen: (open: boolean) => void;
  onOpenSpellbook: () => void;
  onOpenCodex: () => void;
  onExitTavern: () => void;
  onClaimContractAchievement: (contractId: string) => void;
  triggerNotification?: (text: string, color?: string) => void;
}

export const TavernInteriorView: React.FC<TavernInteriorViewProps> = ({
  playerName,
  dailyContracts,
  setDailyContracts,
  playerLevel,
  playerGold,
  setPlayerGold,
  unlockedCampaigns,
  isAnyGlobalModalOpen,
  isTrophyModalOpen,
  tavernActiveDialogue,
  setTavernActiveDialogue,
  isTavernContractBoardOpen,
  setIsTavernContractBoardOpen,
  onOpenSpellbook,
  onOpenCodex,
  onExitTavern,
  onClaimContractAchievement,
  triggerNotification,
}) => {
  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();
  const dailyContractsRef = useRef<DailyContract[]>(dailyContracts);
  const claimingContractIdsRef = useRef<Set<string>>(
    new Set(dailyContracts.filter((c) => c.isClaimed).map((c) => c.id))
  );

  useEffect(() => {
    dailyContractsRef.current = dailyContracts;
    const nextClaimedIds = new Set<string>();
    dailyContracts.forEach((c) => {
      if (c.isClaimed) {
        nextClaimedIds.add(c.id);
      }
    });
    claimingContractIdsRef.current = nextClaimedIds;
  }, [dailyContracts]);

  const handleClaimContract = (cId: string) => {
    if (claimingContractIdsRef.current.has(cId)) return;
    const target = dailyContractsRef.current.find((c) => c.id === cId);
    if (!target || !target.isCompleted || target.isClaimed) return;
    const isLevelLocked = playerLevel < (target.requiredPlayerLevel || 1);
    const isLockedCampaign =
      target.campaignRequirement !== undefined &&
      !unlockedCampaigns.includes(target.campaignRequirement);
    if (isLevelLocked || isLockedCampaign) return;

    claimingContractIdsRef.current.add(cId);
    dailyContractsRef.current = dailyContractsRef.current.map((c) =>
      c.id === cId ? { ...c, isClaimed: true } : c
    );

    setDailyContracts((prev) =>
      prev.map((c) => (c.id === cId ? { ...c, isClaimed: true } : c))
    );
    setPlayerGold((g) => g + target.rewardGold);
    gameAudio.playCoinPickup();
    if (triggerNotification) {
      triggerNotification(`🎁 ¡CONTRATO RECLAMADO: +${target.rewardGold} Oro!`, '#fbbf24');
    }
    onClaimContractAchievement(cId);
  };

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col bg-slate-950 overflow-hidden animate-fadeIn">
      <Canvas
        shadows={false}
        dpr={[1, 1.2]}
        gl={{
          powerPreference: 'default',
          antialias: false,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={handleCanvasCreated}
        camera={{ position: [0, 12, 20], fov: 45, near: 0.5, far: 90 }}
        className="w-full h-full relative z-10"
      >
        <ThreeSceneCleanup />
        <TavernInterior
          playerName={playerName}
          contracts={dailyContracts}
          isModalActive={isAnyGlobalModalOpen || isTrophyModalOpen}
          activeDialogue={tavernActiveDialogue}
          setActiveDialogue={setTavernActiveDialogue}
          isContractBoardOpen={isTavernContractBoardOpen}
          setIsContractBoardOpen={setIsTavernContractBoardOpen}
          onClaimContract={handleClaimContract}
          onOpenSpellbook={onOpenSpellbook}
          onOpenCodex={onOpenCodex}
          onExitTavern={onExitTavern}
        />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/60 text-amber-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}

      {/* D-Pad táctil en pantalla para móviles (unificado con VirtualDpad / virtualInput) */}
      {!tavernActiveDialogue && !isTavernContractBoardOpen && !isAnyGlobalModalOpen && !isTrophyModalOpen && (
        <VirtualDpad />
      )}

      {/* MODAL DIÁLOGO DE LA TABERNA */}
      {tavernActiveDialogue && (
        <div
          className={`absolute inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onClick={() => setTavernActiveDialogue(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-auto">
            <TypewriterDialogue
              speaker={tavernActiveDialogue.speaker}
              role={tavernActiveDialogue.role}
              fullText={tavernActiveDialogue.text}
              avatarIcon="🍺"
              avatarImgUrl={tavernActiveDialogue.avatarImgUrl}
              candidateAvatarUrls={tavernActiveDialogue.candidateAvatarUrls}
              color="#f59e0b"
              actionText={tavernActiveDialogue.actionText}
              onAction={() => {
                if (tavernActiveDialogue.action) tavernActiveDialogue.action();
              }}
              onClose={() => setTavernActiveDialogue(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL DE TABLÓN DE CONTRATOS DE CAZADOR */}
      {isTavernContractBoardOpen && (() => {
        const boardBgCandidates = getContractImageCandidateUrls('BOARD_BG');
        const resetTime = getTimeUntilNextDailyReset();
        const isAndroid = isAndroidDevice();

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto touch-auto p-3 sm:p-5 flex flex-col items-center justify-center animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onClick={() => setIsTavernContractBoardOpen(false)}
          >
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
              <CachedImage
                cacheKey="contract_BOARD_BG"
                candidateUrls={boardBgCandidates}
                alt="Fondo Tablón"
                className="w-full h-full object-cover filter brightness-75 contrast-115 scale-100 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/45 to-black/85" />
            </div>

            <div
              className={`m-auto max-w-xl w-full border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.65)] text-slate-200 max-h-[92dvh] overflow-y-auto relative overflow-hidden z-10 pointer-events-auto [scrollbar-width:none] ${
                isAndroid ? 'bg-slate-950/95' : 'bg-slate-950/85 backdrop-blur-sm'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10 flex flex-col w-full">
                <div className="flex items-center justify-between border-b border-amber-500/40 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-xl shadow animate-pulse">
                      📜
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-black text-amber-300 text-base sm:text-lg tracking-wider">
                          TABLÓN DE CONTRATOS DIARIOS
                        </h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold">
                          {dailyContracts.length} HOY
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-sans flex items-center gap-1.5 mt-0.5">
                        <span>⏳ Rotación automática en:</span>
                        <strong className="text-amber-400 font-mono">{resetTime.hours}h {resetTime.minutes}m</strong>
                        <span>• Fecha: {getTodayDateKey()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTavernContractBoardOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold active:scale-95 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  {dailyContracts.map((c, cIdx) => {
                    const pct = Math.min(100, Math.round((c.currentCount / c.targetCount) * 100));
                    const requiredLvl = c.requiredPlayerLevel || 1;
                    const isLevelLocked = playerLevel < requiredLvl;
                    const missionKey: ContractMissionType =
                      c.missionTypeKey ||
                      (c.category === 'TITAN'
                        ? 'CAMPEON'
                        : c.category === 'SPELL'
                        ? 'MAGO'
                        : cIdx === 0
                        ? 'TANQUE'
                        : cIdx === 1
                        ? 'ASESINO'
                        : 'TRAMPERO');

                    const iconCandidates = getContractImageCandidateUrls(missionKey);
                    const isLockedCampaign =
                      c.campaignRequirement !== undefined &&
                      !unlockedCampaigns.includes(c.campaignRequirement);
                    const isRestricted = isLevelLocked || isLockedCampaign;

                    return (
                      <div
                        key={c.id}
                        className={`p-3 sm:p-3.5 rounded-2xl border-2 transition flex items-center gap-3 relative overflow-hidden ${
                          isRestricted
                            ? 'bg-black/60 border-slate-800 opacity-65'
                            : c.isClaimed
                            ? 'bg-slate-950/70 border-slate-800 opacity-60'
                            : c.isCompleted
                            ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                            : 'bg-black/85 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/60 relative flex items-center justify-center shrink-0 shadow-md group">
                          <CachedImage
                            cacheKey={`contract_icon_${c.id}`}
                            candidateUrls={iconCandidates}
                            alt={c.title}
                            className="w-full h-full object-cover filter brightness-95 transition duration-300"
                            fallbackPlaceholder={
                              <span className="text-2xl">
                                {isRestricted ? '🔒' : c.isCompleted ? '⭐' : '⚔️'}
                              </span>
                            }
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <h4 className="font-serif font-bold text-xs sm:text-sm text-slate-100 truncate">
                                {c.title}
                              </h4>
                              <span
                                className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono font-bold border shrink-0 ${
                                  isLevelLocked
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse'
                                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                Nv. {requiredLvl}
                              </span>
                              {c.campaignRequirement !== undefined && (
                                <span className="text-[8.5px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  Campaña {c.campaignRequirement + 1}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                isLevelLocked
                                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                                  : isLockedCampaign
                                  ? 'bg-slate-900 text-slate-500 border-slate-700'
                                  : c.isClaimed
                                  ? 'bg-slate-900 text-slate-500 border-slate-700'
                                  : c.isCompleted
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 animate-pulse'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                              }`}
                            >
                              {isLevelLocked
                                ? `🔒 REQUIERE NIVEL ${requiredLvl}`
                                : isLockedCampaign
                                ? '🔒 CAMPAÑA BLOQUEADA'
                                : c.isClaimed
                                ? '✓ COBRADO'
                                : c.isCompleted
                                ? '¡COMPLETADO!'
                                : 'EN CURSO'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 font-sans mb-2 leading-tight">
                            {c.desc}
                          </p>

                          <div className="mb-2">
                            <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 mb-0.5">
                              <span>
                                {isLevelLocked ? `Tu Nivel actual: ${playerLevel}` : `Progreso: ${c.currentCount} / ${c.targetCount}`}
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isLevelLocked
                                    ? 'bg-slate-600'
                                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                            <span className="font-mono text-amber-400 font-bold text-[11px]">
                              🎁 {c.rewardLabel}
                            </span>

                            {c.isCompleted && !c.isClaimed && !isRestricted ? (
                              <button
                                onClick={() => handleClaimContract(c.id)}
                                className="py-1 px-3.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-serif font-black text-xs border border-amber-200 shadow hover:scale-105 active:scale-95 transition cursor-pointer"
                              >
                                RECLAMAR
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center pt-1">
                  <button
                    onClick={() => setIsTavernContractBoardOpen(false)}
                    className="py-2 px-6 rounded-full bg-slate-900 text-slate-300 font-serif font-bold text-xs border border-slate-700 hover:text-white active:scale-95 cursor-pointer"
                  >
                    Volver a la Taberna
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TavernInteriorView;
