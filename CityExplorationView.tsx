import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CityOverworld } from './CityOverworld';
import { TypewriterDialogue } from './TypewriterDialogue';
import { ResidentialHouseData } from './MedievalHouse';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { isAndroidDevice } from './utils';
import { virtualInput } from './virtualInput';
import { VirtualDpad } from './VirtualDpad';
import { BattleRewardModalData, CityDialogueData } from './types';

export interface CityExplorationViewProps {
  playerName: string;
  activeCampaignIndex: number;
  isChampionOfCampaign: boolean;
  completionsCount: number;
  isGameMenuOpen: boolean;
  isCodexOpen: boolean;
  isTrophyOpen: boolean;
  isSaveModalOpen: boolean;
  isInspecting: boolean;
  pendingRewardModal: BattleRewardModalData | null;
  isGlobalModalOpen: boolean;
  cityCameraAngle: number;
  cityZoomLevel: number;
  activeCityDialogue: CityDialogueData | null;
  setActiveCityDialogue: React.Dispatch<React.SetStateAction<CityDialogueData | null>>;
  lastCityPlayerPos: [number, number, number];
  setLastCityPlayerPos: (pos: [number, number, number]) => void;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  alleyCurrentFight: number;
  defeatedAlleyOpponents: string[];
  cityTimeOfDay: 0 | 1 | 2;
  onStartAlleyFight: (oppId?: string) => void;
  onEnterArena: () => void;
  onEnterShop: () => void;
  onEnterWorkshop: () => void;
  onEnterTavern: () => void;
  onOpenCodex: () => void;
  onOpenSpellbook: () => void;
  onReturnToHub: () => void;
  onEnterHouse: (house: ResidentialHouseData) => void;
  onSceneReady?: () => void;
}

export const CityExplorationView: React.FC<CityExplorationViewProps> = ({
  playerName,
  activeCampaignIndex,
  isChampionOfCampaign,
  completionsCount,
  isGameMenuOpen,
  isCodexOpen,
  isTrophyOpen,
  isSaveModalOpen,
  isInspecting,
  pendingRewardModal,
  isGlobalModalOpen,
  cityCameraAngle,
  cityZoomLevel,
  activeCityDialogue,
  setActiveCityDialogue,
  lastCityPlayerPos,
  setLastCityPlayerPos,
  campaignPhase,
  alleyCurrentFight,
  defeatedAlleyOpponents,
  cityTimeOfDay,
  onStartAlleyFight,
  onEnterArena,
  onEnterShop,
  onEnterWorkshop,
  onEnterTavern,
  onOpenCodex,
  onOpenSpellbook,
  onReturnToHub,
  onEnterHouse,
  onSceneReady,
}) => {
  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();
  const dialogueOverlayPointerDownRef = useRef(false);
  const isUiBlockingDpad = Boolean(
    activeCityDialogue ||
    isGameMenuOpen ||
    isCodexOpen ||
    isTrophyOpen ||
    isSaveModalOpen ||
    isInspecting ||
    pendingRewardModal ||
    isGlobalModalOpen
  );

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col bg-slate-950 animate-fadeIn">
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
        camera={{ fov: 45, near: 0.5, far: 320 }}
        className="w-full h-full"
      >
        <ThreeSceneCleanup />
        <CityOverworld
          playerName={playerName}
          activeCampaignIndex={activeCampaignIndex}
          isChampionOfCampaign={isChampionOfCampaign}
          completionsCount={completionsCount}
          isGameMenuOpen={isGameMenuOpen}
          isCodexOpen={isCodexOpen}
          isTrophyOpen={isTrophyOpen}
          isSaveModalOpen={isSaveModalOpen}
          isInspecting={isInspecting}
          pendingRewardModal={pendingRewardModal}
          isGlobalModalOpen={isGlobalModalOpen}
          cameraYawOffset={cityCameraAngle}
          cameraZoomLevel={cityZoomLevel}
          activeDialogue={activeCityDialogue}
          setActiveDialogue={setActiveCityDialogue}
          savedPlayerPos={lastCityPlayerPos}
          onSavePlayerPos={(pos) => setLastCityPlayerPos(pos)}
          campaignPhase={campaignPhase}
          alleyCurrentFight={alleyCurrentFight}
          defeatedAlleyOpponents={defeatedAlleyOpponents}
          timeOfDay={cityTimeOfDay}
          onStartAlleyFight={onStartAlleyFight}
          onEnterArena={onEnterArena}
          onEnterShop={onEnterShop}
          onEnterWorkshop={onEnterWorkshop}
          onEnterTavern={onEnterTavern}
          onOpenCodex={onOpenCodex}
          onOpenSpellbook={onOpenSpellbook}
          onReturnToHub={onReturnToHub}
          onEnterHouse={onEnterHouse}
          onSceneReady={onSceneReady}
        />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/60 text-amber-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}

      {/* Cuadro de Diálogo en Pantalla con Efecto Mecanográfico y Retratos */}
      {activeCityDialogue && !isGameMenuOpen && !isCodexOpen && !isInspecting && (
        <div
          className={`absolute inset-0 z-50 flex items-end justify-center p-2 sm:p-4 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            dialogueOverlayPointerDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dialogueOverlayPointerDownRef.current && e.target === e.currentTarget) {
              dialogueOverlayPointerDownRef.current = false;
              virtualInput.reset();
              setActiveCityDialogue(null);
            }
          }}
        >
          <TypewriterDialogue
            speaker={activeCityDialogue.speaker}
            role={activeCityDialogue.role}
            fullText={activeCityDialogue.text}
            avatarIcon="⚔️"
            avatarImgUrl={activeCityDialogue.avatarImgUrl}
            candidateAvatarUrls={activeCityDialogue.candidateAvatarUrls}
            color="#f59e0b"
            actionText={activeCityDialogue.actionText}
            onAction={() => {
              const act = activeCityDialogue.action;
              setActiveCityDialogue(null);
              if (act) {
                setTimeout(() => {
                  act();
                }, 50);
              }
            }}
            onClose={() => setActiveCityDialogue(null)}
          />
        </div>
      )}

      {/* D-Pad / Joystick táctil en pantalla para Móviles y Ratón con control unificado virtualInput */}
      {!isUiBlockingDpad && <VirtualDpad />}
    </div>
  );
};

export default CityExplorationView;
