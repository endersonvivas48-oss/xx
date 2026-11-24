import React from 'react';
import { Canvas } from '@react-three/fiber';
import { WorkshopInterior, WorkshopDialogueData } from './WorkshopInterior';
import { TypewriterDialogue } from './TypewriterDialogue';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { VirtualDpad } from './VirtualDpad';
import { isAndroidDevice } from './utils';

export interface WorkshopInteriorViewProps {
  playerName: string;
  isForgeUnlocked: boolean;
  isModalActive: boolean;
  workshopActiveDialogue: WorkshopDialogueData | null;
  setWorkshopActiveDialogue?: (d: WorkshopDialogueData | null) => void;
  setActiveDialogue?: (d: WorkshopDialogueData | null) => void;
  onOpenWorkshopCatalog: () => void;
  onOpenForgeCatalog: () => void;
  onExitWorkshop: () => void;
}

export const WorkshopInteriorView: React.FC<WorkshopInteriorViewProps> = ({
  playerName,
  isForgeUnlocked,
  isModalActive,
  workshopActiveDialogue,
  setWorkshopActiveDialogue,
  setActiveDialogue,
  onOpenWorkshopCatalog,
  onOpenForgeCatalog,
  onExitWorkshop,
}) => {
  const setDialogue = setWorkshopActiveDialogue || setActiveDialogue || (() => {});
  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();

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
        camera={{ position: [0, 9.8, 17.5], fov: 45, near: 0.5, far: 90 }}
        className="w-full h-full relative z-10"
      >
        <ThreeSceneCleanup />
        <WorkshopInterior
          playerName={playerName}
          isForgeUnlocked={isForgeUnlocked}
          isModalActive={isModalActive}
          activeDialogue={workshopActiveDialogue}
          setActiveDialogue={setDialogue}
          onOpenWorkshopCatalog={onOpenWorkshopCatalog}
          onOpenForgeCatalog={onOpenForgeCatalog}
          onExitWorkshop={onExitWorkshop}
        />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-orange-500/60 text-orange-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}

      {/* D-Pad táctil en pantalla para móviles (unificado con VirtualDpad / virtualInput) */}
      {!workshopActiveDialogue && !isModalActive && <VirtualDpad />}

      {workshopActiveDialogue && (
        <div
          className={`absolute inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onClick={() => setDialogue(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-auto">
            <TypewriterDialogue
              speaker={workshopActiveDialogue.speaker}
              role={workshopActiveDialogue.role}
              fullText={workshopActiveDialogue.text}
              avatarIcon="🔨"
              avatarImgUrl={workshopActiveDialogue.avatarImgUrl}
              candidateAvatarUrls={workshopActiveDialogue.candidateAvatarUrls}
              color="#f97316"
              actionText={workshopActiveDialogue.actionText}
              onAction={() => {
                if (workshopActiveDialogue.action) workshopActiveDialogue.action();
              }}
              secondaryActionText={workshopActiveDialogue.secondaryActionText}
              onSecondaryAction={
                workshopActiveDialogue.secondaryAction
                  ? () => workshopActiveDialogue.secondaryAction?.()
                  : undefined
              }
              onClose={() => setDialogue(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopInteriorView;
