import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ShopInterior, ShopDialogueData } from './ShopInterior';
import { TypewriterDialogue } from './TypewriterDialogue';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { VirtualDpad } from './VirtualDpad';
import { isAndroidDevice } from './utils';

export interface ShopInteriorViewProps {
  playerName: string;
  isModalActive: boolean;
  shopActiveDialogue: ShopDialogueData | null;
  setShopActiveDialogue: (d: ShopDialogueData | null) => void;
  onOpenStoreCatalog: () => void;
  onExitShop: () => void;
}

export const ShopInteriorView: React.FC<ShopInteriorViewProps> = ({
  playerName,
  isModalActive,
  shopActiveDialogue,
  setShopActiveDialogue,
  onOpenStoreCatalog,
  onExitShop,
}) => {
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
        <ShopInterior
          playerName={playerName}
          isModalActive={isModalActive}
          activeDialogue={shopActiveDialogue}
          setActiveDialogue={setShopActiveDialogue}
          onOpenStoreCatalog={onOpenStoreCatalog}
          onExitShop={onExitShop}
        />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-purple-500/60 text-purple-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}

      {/* D-Pad táctil en pantalla para móviles (unificado con VirtualDpad / virtualInput) */}
      {!shopActiveDialogue && !isModalActive && <VirtualDpad />}

      {shopActiveDialogue && (
        <div
          className={`absolute inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onClick={() => setShopActiveDialogue(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-auto">
            <TypewriterDialogue
              speaker={shopActiveDialogue.speaker}
              role={shopActiveDialogue.role}
              fullText={shopActiveDialogue.text}
              avatarIcon="💎"
              avatarImgUrl={shopActiveDialogue.avatarImgUrl}
              candidateAvatarUrls={shopActiveDialogue.candidateAvatarUrls}
              color="#c084fc"
              actionText={shopActiveDialogue.actionText}
              onAction={() => {
                if (shopActiveDialogue.action) shopActiveDialogue.action();
              }}
              onClose={() => setShopActiveDialogue(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopInteriorView;
