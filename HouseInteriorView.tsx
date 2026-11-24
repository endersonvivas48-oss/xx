import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ResidentialHouseData } from './MedievalHouse';
import { HouseInteriorScene } from './HouseInteriorScene';
import { gameAudio, isAndroidDevice } from './utils';
import { ThreeSceneCleanup, useWebglContextRecovery } from './ThreeSceneCleanup';
import { VirtualDpad } from './VirtualDpad';
import { isHouseBattleLesson } from './houseTutorialsData';
import { CachedImage } from './CachedImage';

export interface HouseInteriorViewProps {
  currentVisitedHouse: ResidentialHouseData;
  playerName: string;
  isAnyGlobalModalOpen: boolean;
  isHouseDialogueOpen: boolean;
  setIsHouseDialogueOpen: (open: boolean) => void;
  completedHouseTutorials: string[];
  setCompletedHouseTutorials: React.Dispatch<React.SetStateAction<string[]>>;
  onExit: () => void;
  onStartLessonCombat: (house: ResidentialHouseData) => void;
  onUnlockAllTutorialsAchievement?: () => void;
  triggerNotification?: (text: string, color?: string) => void;
}

export const HouseInteriorView: React.FC<HouseInteriorViewProps> = ({
  currentVisitedHouse,
  playerName,
  isAnyGlobalModalOpen,
  isHouseDialogueOpen,
  setIsHouseDialogueOpen,
  completedHouseTutorials,
  setCompletedHouseTutorials,
  onExit,
  onStartLessonCombat,
  onUnlockAllTutorialsAchievement,
  triggerNotification,
}) => {
  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();

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
        camera={{ position: [0, 8.5, 13.0], fov: 46, near: 0.5, far: 90 }}
        className="w-full h-full"
      >
        <ThreeSceneCleanup />
        <HouseInteriorScene
          house={currentVisitedHouse}
          playerName={playerName}
          isModalActive={isAnyGlobalModalOpen}
          isDialogueOpen={isHouseDialogueOpen}
          onOpenDialogue={() => setIsHouseDialogueOpen(true)}
          onExit={onExit}
        />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/60 text-amber-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}

      {/* D-Pad / Joystick táctil en pantalla para Móviles en el interior de la Casa */}
      {!isAnyGlobalModalOpen && !isHouseDialogueOpen && <VirtualDpad />}

      {/* INTERFAZ HUD DEL INTERIOR CON EL TÍTULO DEL HOGAR */}
      {!isAnyGlobalModalOpen && !isHouseDialogueOpen && (
        <div className="absolute top-3 inset-x-3 sm:inset-x-6 flex items-center justify-start pointer-events-none z-30">
          <div
            className={`border-2 px-4 py-2 rounded-2xl shadow-2xl pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/90 backdrop-blur-md'}`}
            style={{ borderColor: currentVisitedHouse.resident.color }}
          >
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 block">
              HOGAR MEDIEVAL • {currentVisitedHouse.resident.topic}
            </span>
            <h2 className="text-xs sm:text-base font-serif font-black text-amber-300 flex items-center gap-2">
              <span>{currentVisitedHouse.resident.icon}</span>
              <span>{currentVisitedHouse.houseName}</span>
            </h2>
          </div>
        </div>
      )}

      {/* PANEL DIÁLOGO DEL CONSEJERO RESIDENTE */}
      {!isAnyGlobalModalOpen && isHouseDialogueOpen && (
        <div
          className={`absolute inset-0 z-50 flex items-end justify-center p-2 sm:p-3 pointer-events-auto ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}
          onClick={() => setIsHouseDialogueOpen(false)}
        >
          <div
            className={`w-[96vw] max-w-[620px] sm:w-[68vw] sm:max-w-[660px] md:max-w-[720px] mb-2 sm:mb-3 bg-black/95 border-2 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(0,0,0,0.9)] flex flex-row items-center gap-3 pointer-events-auto ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
            style={{ borderColor: currentVisitedHouse.resident.color }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Retrato Izquierdo */}
            {(() => {
              const isGarrick = currentVisitedHouse.id === 'house_8' || currentVisitedHouse.resident.name.toLowerCase().includes('garrick');
              const residentKey = currentVisitedHouse.resident.name.toLowerCase().replace(/ /g, '_');
              const residentIdKey = currentVisitedHouse.id.replace('house_', 'instructor_');
              const residentPortraits = [
                ...(isGarrick ? [
                  'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/garrick_intendente.jpg',
                  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/garrick_intendente.jpg',
                ] : []),
                ...(currentVisitedHouse.resident.avatarUrl ? [currentVisitedHouse.resident.avatarUrl] : []),
                `https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/${residentKey}.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/${residentKey}.png`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/${residentIdKey}.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/${residentIdKey}.png`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_${residentKey}.jpg`,
                `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/${residentKey}.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_${residentKey}.jpg`,
                `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_${residentKey}.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_${residentIdKey}.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/piezam/main/master_avatar.jpg`,
                `https://raw.githubusercontent.com/endersonvivas48-oss/logoin/main/l${Math.min(6, Math.max(1, parseInt(currentVisitedHouse.id.replace('house_', ''), 10) % 6 || 1))}.png`,
              ];

              return (
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative bg-slate-950 ring-1 ring-amber-400/30"
                  style={{
                    borderColor: currentVisitedHouse.resident.color,
                    boxShadow: `0 0 14px ${currentVisitedHouse.resident.color}60`,
                  }}
                >
                  <CachedImage
                    cacheKey={`resident_avatar_${currentVisitedHouse.id}`}
                    candidateUrls={residentPortraits}
                    alt={currentVisitedHouse.resident.name}
                    className="w-full h-full object-cover filter brightness-95 z-10"
                    fallbackPlaceholder={
                      <span className="text-2xl sm:text-3xl animate-pulse">
                        {currentVisitedHouse.resident.icon}
                      </span>
                    }
                  />
                </div>
              );
            })()}

            {/* Cuerpo Central Panorámico */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between border-b pb-1 gap-2" style={{ borderColor: `${currentVisitedHouse.resident.color}40` }}>
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <h3 className="font-serif font-black text-xs sm:text-sm md:text-base truncate" style={{ color: currentVisitedHouse.resident.color }}>
                    {currentVisitedHouse.resident.name}
                  </h3>
                  <span className="text-[10px] sm:text-xs text-slate-300 font-sans truncate">
                    • {currentVisitedHouse.resident.title}
                  </span>
                </div>

                {/* Botón de Acción / Lección en la cabecera superior derecha */}
                <div className="shrink-0 flex items-center">
                  {completedHouseTutorials.includes(currentVisitedHouse.id) ? (
                    <button
                      type="button"
                      onClick={() => setIsHouseDialogueOpen(false)}
                      className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-serif font-black text-[11px] sm:text-xs tracking-wide bg-amber-500 hover:bg-amber-400 text-black border border-white shadow-md transition active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      Entendido
                    </button>
                  ) : isHouseBattleLesson(currentVisitedHouse.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHouseDialogueOpen(false);
                        gameAudio.playConfirmSelect();
                        onStartLessonCombat(currentVisitedHouse);
                      }}
                      className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-serif font-black text-[11px] sm:text-xs border border-white shadow-[0_0_15px_rgba(245,158,11,0.6)] transition active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <span>⚔️ LECCIÓN</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playPowerupChime();
                        const houseId = currentVisitedHouse.id;
                        if (!completedHouseTutorials.includes(houseId)) {
                          const updated = [...completedHouseTutorials, houseId];
                          setCompletedHouseTutorials(updated);
                          if (onUnlockAllTutorialsAchievement && updated.length >= 12) {
                            onUnlockAllTutorialsAchievement();
                          }
                        }
                        if (triggerNotification) {
                          triggerNotification(
                            `¡Consejo de ${currentVisitedHouse.resident.name} asimilado! (${Math.min(12, completedHouseTutorials.length + 1)}/12)`,
                            currentVisitedHouse.resident.color
                          );
                        }
                        setIsHouseDialogueOpen(false);
                      }}
                      className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-serif font-black text-[11px] sm:text-xs border border-white shadow-[0_0_15px_rgba(16,185,129,0.6)] transition active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <span>✨ ASIMILAR</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                className="p-1.5 sm:p-2 rounded-lg bg-slate-950/80 border min-h-[38px] sm:min-h-[44px] max-h-28 sm:max-h-36 overflow-y-auto touch-pan-y flex items-start shadow-inner w-full"
                style={{ borderColor: `${currentVisitedHouse.resident.color}30` }}
              >
                <p className="text-[11px] sm:text-xs md:text-[13px] font-serif text-slate-100 leading-snug italic whitespace-pre-wrap break-words">
                  «{currentVisitedHouse.resident.tip}»
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseInteriorView;
