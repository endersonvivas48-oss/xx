import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ColiseumInterior, ColiseumDialogueData } from './ColiseumInterior';
import { COLISEUM_BACKGROUNDS } from './gladiatorImageMap';
import { TypewriterDialogue } from './TypewriterDialogue';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { VirtualDpad } from './VirtualDpad';
import { isAndroidDevice } from './utils';
import { CachedImage } from './CachedImage';

export interface ColiseumViewProps {
  playerName: string;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  alleyFightNumber: number;
  isColiseumCleared: boolean;
  isModalActive: boolean;
  activeDialogue: ColiseumDialogueData | null;
  setActiveDialogue: (d: ColiseumDialogueData | null) => void;
  onStartTournamentBattle: () => void;
  onStartSurvivalColiseum: () => void;
  onOpenGladiatorDuel: () => void;
  onExitColiseum: () => void;
}

export const ColiseumView: React.FC<ColiseumViewProps> = ({
  playerName,
  campaignPhase,
  alleyFightNumber,
  isColiseumCleared,
  isModalActive,
  activeDialogue,
  setActiveDialogue,
  onStartTournamentBattle,
  onStartSurvivalColiseum,
  onOpenGladiatorDuel,
  onExitColiseum,
}) => {
  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col bg-slate-950 overflow-hidden animate-fadeIn">
      {/* Imagen de fondo panorámica oficial del Coliseo Subterráneo */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <CachedImage
          cacheKey="bg_coliseum_interior"
          candidateUrls={COLISEUM_BACKGROUNDS}
          alt="Fondo Coliseo Subterráneo"
          className="w-full h-full object-cover filter brightness-45 contrast-125 opacity-35"
          fallbackPlaceholder={<></>}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/80" />
      </div>

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
        camera={{ position: [0, 10.2, 18.5], fov: 45, near: 0.5, far: 90 }}
        className="w-full h-full relative z-10"
      >
        <ThreeSceneCleanup />
        <ColiseumInterior
          playerName={playerName}
          campaignPhase={campaignPhase}
          alleyFightNumber={alleyFightNumber}
          isColiseumCleared={isColiseumCleared}
          isModalActive={isModalActive}
          activeDialogue={activeDialogue}
          setActiveDialogue={setActiveDialogue}
          onStartTournamentBattle={onStartTournamentBattle}
          onStartSurvivalColiseum={onStartSurvivalColiseum}
          onOpenGladiatorDuel={onOpenGladiatorDuel}
          onExitColiseum={onExitColiseum}
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
      {!activeDialogue && !isModalActive && <VirtualDpad />}

      {activeDialogue && (
        <div
          className={`absolute inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onClick={() => setActiveDialogue(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-auto">
            <TypewriterDialogue
              speaker={activeDialogue.speaker}
              role={activeDialogue.role}
              fullText={activeDialogue.text}
              avatarIcon="🏆"
              avatarImgUrl={activeDialogue.avatarImgUrl}
              candidateAvatarUrls={activeDialogue.candidateAvatarUrls}
              color="#ef4444"
              actionText={activeDialogue.actionText}
              onAction={() => {
                if (activeDialogue.action) activeDialogue.action();
              }}
              onClose={() => setActiveDialogue(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColiseumView;
