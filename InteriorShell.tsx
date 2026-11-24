import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { DetailedNPC, DetailedPlayerAvatar } from './DetailedCharacters';

export interface InteriorNpcItem {
  id: string;
  name: string;
  title: string;
  role: 'MERCHANT' | 'CHALLENGER' | 'CITIZEN';
  pos: [number, number, number];
  color: string;
  buttonLabel?: string;
  buttonIcon?: string;
  onInteract: () => void;
}

export interface InteriorExitConfig {
  position: [number, number, number];
  distanceFactor?: number;
  label: string;
  icon?: string;
  visible: boolean;
  onExit: () => void;
}

export type InteriorNpcTheme = 'amber' | 'purple' | 'orange';

interface InteriorShellProps {
  playerRef: React.RefObject<THREE.Group | null>;
  initialPlayerPos: [number, number, number];
  isPlayerWalking: boolean;
  nearestInteractable: string | null;
  exitConfig: InteriorExitConfig;
  npcs: InteriorNpcItem[];
  showNpcs?: boolean;
  showNpcLabels?: boolean;
  npcLabelDistanceFactor?: number;
  npcTheme?: InteriorNpcTheme;
  disableNpcClicks?: boolean;
  children?: React.ReactNode;
}

const NPC_THEME_CLASSES: Record<InteriorNpcTheme, { active: string; inactive: string }> = {
  amber: {
    active: 'bg-amber-500 text-black border-white scale-105 shadow-[0_0_18px_rgba(245,158,11,0.9)]',
    inactive: 'bg-black/90 text-amber-300 border-amber-500/70 hover:border-amber-300',
  },
  purple: {
    active: 'bg-purple-500 text-white border-white scale-105 shadow-[0_0_18px_rgba(168,85,247,0.9)]',
    inactive: 'bg-black/90 text-purple-300 border-purple-500/70 hover:border-purple-300',
  },
  orange: {
    active: 'bg-orange-500 text-black border-white scale-105 shadow-[0_0_18px_rgba(249,115,22,0.9)]',
    inactive: 'bg-black/90 text-orange-300 border-orange-500/70 hover:border-orange-300',
  },
};

export function InteriorShell({
  playerRef,
  initialPlayerPos,
  isPlayerWalking,
  nearestInteractable,
  exitConfig,
  npcs,
  showNpcs = true,
  showNpcLabels = true,
  npcLabelDistanceFactor = 18,
  npcTheme = 'amber',
  disableNpcClicks = false,
  children,
}: InteriorShellProps) {
  const themeClasses = NPC_THEME_CLASSES[npcTheme];

  return (
    <>
      {children}

      {/* Salida Sur hacia la Ciudad */}
      {exitConfig.visible && (
        <Html
          position={exitConfig.position}
          center
          distanceFactor={exitConfig.distanceFactor ?? 18}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exitConfig.onExit();
            }}
            className="py-1.5 px-4 rounded-full bg-slate-900/90 text-amber-300 font-serif font-black text-xs border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap pointer-events-auto"
          >
            {exitConfig.icon && <span>{exitConfig.icon}</span>}
            <span>{exitConfig.label}</span>
          </button>
        </Html>
      )}

      {/* NPCs y sus etiquetas interactivas */}
      {showNpcs &&
        npcs.map((npc) => {
          const isNear = nearestInteractable === npc.id;

          return (
            <group
              key={npc.id}
              position={npc.pos}
              onClick={(e) => {
                if (disableNpcClicks) return;
                e.stopPropagation();
                npc.onInteract();
              }}
            >
              <DetailedNPC
                id={npc.id}
                name={npc.name}
                title={npc.title}
                role={npc.role}
                color={npc.color}
                position={[0, 0, 0]}
                isNear={isNear}
                isWalking={false}
                isPaused={!showNpcLabels}
              />

              {showNpcLabels && (
                <Html position={[0, 2.7, 0]} center distanceFactor={npcLabelDistanceFactor}>
                  <button
                    type="button"
                    disabled={disableNpcClicks}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disableNpcClicks) return;
                      npc.onInteract();
                    }}
                    className={`py-1 px-3.5 rounded-full font-serif font-black text-xs border shadow-lg flex items-center gap-1.5 whitespace-nowrap transition ${
                      disableNpcClicks
                        ? 'cursor-default opacity-60 pointer-events-none'
                        : 'cursor-pointer active:scale-95 pointer-events-auto'
                    } ${
                      isNear ? themeClasses.active : themeClasses.inactive
                    }`}
                  >
                    {npc.buttonIcon && <span>{npc.buttonIcon}</span>}
                    <span>{npc.buttonLabel ?? npc.name}</span>
                  </button>
                </Html>
              )}
            </group>
          );
        })}

      {/* Avatar del Jugador */}
      <group ref={playerRef} position={initialPlayerPos}>
        <DetailedPlayerAvatar isWalking={isPlayerWalking} />
      </group>
    </>
  );
}
