import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  getCobblestoneRoadTexture,
  getStoneWallTexture,
  getRoofTileTexture,
  getAstralPlazaTexture,
} from './cityTextures';
import { ProceduralDistrict } from './ProceduralDistrict';
import { DetailedNPC, DetailedPlayerAvatar } from './DetailedCharacters';
import { InstancedMedievalHouses, ResidentialHouseData, getHouseSafeExitPos } from './MedievalHouse';
import { BattleRewardModalData, CityDialogueData } from './types';
import { getGladiatorPortraitUrls } from './gladiatorImageMap';
import { gameAudio } from './utils';
import {
  InstancedMedievalMarketStalls,
  MedievalCentralFountain,
  InstancedMedievalLampPosts,
  MedievalSunsetCitadelBackdrop,
} from './MedievalCityAtmosphere';
import { CityFloor3D } from './CityFloor3D';
import { MedievalChurch } from './MedievalChurch';
import { virtualInput } from './virtualInput';
import { isCityEnvironmentLoadSettled } from './cityEnvironmentPreloader';
import {
  InstancedMedievalBarrels,
  InstancedMedievalCrates,
  InstancedProvisionSacks,
  MedievalPlanter,
  MedievalOakTree,
} from './MedievalProps';
import { InstancedTransformItem } from './InstancedGlbGroup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import {
  ALLEY_OPPONENTS_ROSTER,
  DUNGEON_LORDS_QUALIFIERS_ROSTER,
  RECRUIT_PRACTICE_ROSTER,
  SHADOW_THRONE_PURGE_ROSTER,
} from './campaignData';

export interface CityNPC {
  id: string;
  name: string;
  role: 'CHALLENGER' | 'MERCHANT' | 'CITIZEN';
  title: string;
  position: [number, number, number];
  color: string;
  dialogue: string;
  icon: string;
}

export interface CityBuilding {
  id: string;
  name: string;
  type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN';
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  doorPos: [number, number, number];
  label: string;
  icon: string;
}

interface CityOverworldProps {
  playerName: string;
  activeCampaignIndex?: number;
  isChampionOfCampaign?: boolean;
  completionsCount?: number;
  isGameMenuOpen: boolean;
  isCodexOpen: boolean;
  isTrophyOpen?: boolean;
  isSaveModalOpen?: boolean;
  isInspecting?: boolean;
  pendingRewardModal?: BattleRewardModalData | null;
  isGlobalModalOpen?: boolean;
  cameraYawOffset?: number;
  cameraZoomLevel?: number;
  activeDialogue?: CityDialogueData | null;
  setActiveDialogue?: (dialogue: CityDialogueData | null) => void;
  savedPlayerPos?: [number, number, number];
  onSavePlayerPos?: (pos: [number, number, number]) => void;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  alleyCurrentFight: number;
  defeatedAlleyOpponents: string[];
  onStartAlleyFight: (oppId: string) => void;
  onEnterArena: (challengerId?: string) => void;
  onEnterShop: () => void;
  onEnterWorkshop: () => void;
  onEnterTavern?: () => void;
  onOpenCodex: () => void;
  onOpenSpellbook: () => void;
  onReturnToHub: () => void;
  onEnterHouse?: (house: ResidentialHouseData) => void;
  onSceneReady?: () => void;
}

function AutonomousNPC({
  npc,
  playerPosRef,
  nearestNpcIdRef,
  isBlockedByModal,
  onInteract,
  onUpdatePos,
}: {
  npc: CityNPC;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  nearestNpcIdRef: React.MutableRefObject<string | null>;
  isBlockedByModal?: boolean;
  onInteract: (npc: CityNPC) => void;
  onUpdatePos: (id: string, x: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isWalkingRef = useRef(false);
  const isNearRef = useRef(false);
  const aiAccumRef = useRef(Math.random() * 0.05);
  const isMobile = isMobileOptimizationTarget();

  const setWalkingSynchronized = (walking: boolean) => {
    isWalkingRef.current = walking;
  };

  const stallObstacles = useMemo(() => [
    { x: -14.5, z: 11.5 }, { x: -14.5, z: 4.0 }, { x: -14.5, z: -4.0 }, { x: -14.5, z: -11.5 },
    { x: 14.5, z: 11.5 }, { x: 14.5, z: 4.0 }, { x: 14.5, z: -4.0 }, { x: 14.5, z: -11.5 },
  ], []);

  const stateRef = useRef({
    x: npc.position[0],
    z: npc.position[2],
    originX: npc.position[0],
    originZ: npc.position[2],
    targetX: npc.position[0],
    targetZ: npc.position[2],
    yaw: npc.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
    baseYaw: npc.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2,
    waitTime: 1.0 + (Math.abs(Math.sin(npc.position[0] * 5.1 + npc.position[2] * 2.3)) * 3.0),
    isMoving: false,
    canWander: npc.role === 'CITIZEN',
    idleTurnTimer: Math.random() * 4.0,
  });

  useFrame((state, delta) => {
    isNearRef.current = !isBlockedByModal && nearestNpcIdRef.current === npc.id;
    if (isBlockedByModal || !groupRef.current) return;

    const st = stateRef.current;
    const camDx = state.camera.position.x - st.x;
    const camDz = state.camera.position.z - st.z;
    const camDistSq = camDx * camDx + camDz * camDz;

    // Culling por radio de cámara: no actualizar IA/animación de NPCs fuera de alcance visual
    const maxActiveRadiusSq = isMobile ? 58 * 58 : 80 * 80;
    if (camDistSq > maxActiveRadiusSq) {
      if (st.isMoving) {
        st.isMoving = false;
        setWalkingSynchronized(false);
      }
      return;
    }

    // Limitar tasa de actualización de NPCs lejanos a 15–20 Hz (y 30 Hz cerca en Android)
    const farThrottleDistSq = isMobile ? 22 * 22 : 30 * 30;
    let effectiveDelta = delta;
    if (camDistSq > farThrottleDistSq) {
      aiAccumRef.current += delta;
      const stepInterval = isMobile ? 1 / 16 : 1 / 20;
      if (aiAccumRef.current < stepInterval) return;
      effectiveDelta = aiAccumRef.current;
      aiAccumRef.current = 0;
    } else if (isMobile) {
      aiAccumRef.current += delta;
      if (aiAccumRef.current < 1 / 30) return;
      effectiveDelta = aiAccumRef.current;
      aiAccumRef.current = 0;
    } else {
      aiAccumRef.current = 0;
    }

    const clampedDelta = Math.min(effectiveDelta, 0.1);
    const t = state.clock.getElapsedTime();

    if (st.isMoving) {
      onUpdatePos(npc.id, st.x, st.z);
    }

    const dxPlayer = playerPosRef.current.x - st.x;
    const dzPlayer = playerPosRef.current.z - st.z;
    const distToPlayer = Math.hypot(dxPlayer, dzPlayer);

    if (distToPlayer < 4.8) {
      if (st.isMoving) {
        st.isMoving = false;
        setWalkingSynchronized(false);
      }
      const lookYaw = Math.atan2(dxPlayer, dzPlayer);
      const angleDiff = lookYaw - st.yaw;
      const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      st.yaw += wrappedDiff * Math.min(1, 6 * clampedDelta);
      groupRef.current.position.set(st.x, 0, st.z);
      groupRef.current.rotation.y = st.yaw;
      return;
    }

    if (!st.canWander) {
      st.idleTurnTimer -= clampedDelta;
      if (st.idleTurnTimer <= 0) {
        st.idleTurnTimer = 3.5 + Math.random() * 4.0;
        const subtleAngle = (Math.random() - 0.5) * 0.65;
        st.yaw = st.baseYaw + subtleAngle;
      }
      const angleDiff = st.yaw - groupRef.current.rotation.y;
      const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      groupRef.current.rotation.y += wrappedDiff * Math.min(1, 4 * clampedDelta);
      groupRef.current.position.set(st.x, 0, st.z);
      return;
    }

    if (st.waitTime > 0) {
      st.waitTime -= clampedDelta;
      if (st.isMoving) {
        st.isMoving = false;
        setWalkingSynchronized(false);
      }
      const subtleWanderYaw = st.baseYaw + Math.sin(t * 0.8 + st.originX) * 0.4;
      const angleDiff = subtleWanderYaw - st.yaw;
      const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      st.yaw += wrappedDiff * Math.min(1, 4 * clampedDelta);

      if (st.waitTime <= 0) {
        const wanderRadius = 4.0;
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.2 + Math.random() * wanderRadius;
        let candX = st.originX + Math.cos(angle) * dist;
        let candZ = st.originZ + Math.sin(angle) * dist;

        candX = THREE.MathUtils.clamp(candX, -11, 11);
        candZ = THREE.MathUtils.clamp(candZ, -38, 42);

        if (Math.hypot(candX, candZ) < 5.8) {
          const escAngle = Math.atan2(candZ, candX);
          candX = Math.cos(escAngle) * 6.0;
          candZ = Math.sin(escAngle) * 6.0;
        }

        for (const stall of stallObstacles) {
          if (Math.hypot(candX - stall.x, candZ - stall.z) < 3.2) {
            candX = st.originX;
            candZ = st.originZ;
            break;
          }
        }

        st.targetX = candX;
        st.targetZ = candZ;

        if (Math.hypot(st.targetX - st.x, st.targetZ - st.z) < 0.8) {
          st.waitTime = 2.0 + Math.random() * 3.0;
        } else {
          st.isMoving = true;
          setWalkingSynchronized(true);
        }
      }
    } else {
      const toX = st.targetX - st.x;
      const toZ = st.targetZ - st.z;
      const dist = Math.hypot(toX, toZ);

      if (dist > 0.3) {
        if (!st.isMoving) {
          st.isMoving = true;
          setWalkingSynchronized(true);
        }
        const speed = 1.85;
        let nextNpcX = st.x + (toX / dist) * speed * clampedDelta;
        let nextNpcZ = st.z + (toZ / dist) * speed * clampedDelta;

        if (Math.hypot(nextNpcX, nextNpcZ) < 5.4) {
          st.isMoving = false;
          setWalkingSynchronized(false);
          st.waitTime = 2.0;
          return;
        }

        st.x = nextNpcX;
        st.z = nextNpcZ;

        const targetYaw = Math.atan2(toX, toZ);
        const angleDiff = targetYaw - st.yaw;
        const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        st.yaw += wrappedDiff * Math.min(1, 10 * clampedDelta);
      } else {
        st.isMoving = false;
        setWalkingSynchronized(false);
        st.waitTime = 3.5 + Math.random() * 4.5;
      }
    }

    groupRef.current.position.set(st.x, 0, st.z);
    groupRef.current.rotation.y = st.yaw;
  });

  return (
    <group
      ref={groupRef}
      position={npc.position}
      onPointerDown={(e) => {
        if (isBlockedByModal) return;
        e.stopPropagation();
        onInteract(npc);
      }}
      className="cursor-pointer"
    >
      <DetailedNPC
        id={npc.id}
        name={npc.name}
        title={npc.title}
        role={npc.role}
        color={npc.color}
        position={[0, 0, 0]}
        isNearRef={isNearRef}
        isWalkingRef={isWalkingRef}
        isPaused={Boolean(isBlockedByModal)}
      />
    </group>
  );
}

/**
 * Subcomponente ligero aislado encargado únicamente de mostrar los botones flotantes
 * de interacción ("Entrar a casa" / "Hablar o Retar con NPC") leyendo los refs del jugador
 * sin provocar re-renders en todo CityOverworld.
 */
function CityInteractionPrompts({
  nearestNpcIdRef,
  nearestHouseIdRef,
  liveNpcPositions,
  npcs,
  houses,
  isModalActive,
  onInteractNpc,
  onEnterHouse,
}: {
  nearestNpcIdRef: React.MutableRefObject<string | null>;
  nearestHouseIdRef: React.MutableRefObject<string | null>;
  liveNpcPositions: React.MutableRefObject<Record<string, { x: number; z: number }>>;
  npcs: CityNPC[];
  houses: ResidentialHouseData[];
  isModalActive: boolean;
  onInteractNpc: (npc: CityNPC) => void;
  onEnterHouse: (house: ResidentialHouseData) => void;
}) {
  const [nearestIds, setNearestIds] = useState<{ npcId: string | null; houseId: string | null }>({
    npcId: null,
    houseId: null,
  });
  const prevNpcIdRef = useRef<string | null>(null);
  const prevHouseIdRef = useRef<string | null>(null);
  const npcPromptGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const nextNpcId = isModalActive ? null : nearestNpcIdRef.current;
    const nextHouseId = isModalActive ? null : nearestHouseIdRef.current;

    if (nextNpcId !== prevNpcIdRef.current || nextHouseId !== prevHouseIdRef.current) {
      prevNpcIdRef.current = nextNpcId;
      prevHouseIdRef.current = nextHouseId;
      setNearestIds({ npcId: nextNpcId, houseId: nextHouseId });
    }

    if (nextNpcId && npcPromptGroupRef.current) {
      const livePos = liveNpcPositions.current[nextNpcId];
      if (livePos) {
        npcPromptGroupRef.current.position.set(livePos.x, 0, livePos.z);
      }
    }
  });

  const activeNpc = useMemo(
    () => (nearestIds.npcId && !isModalActive ? npcs.find((n) => n.id === nearestIds.npcId) || null : null),
    [nearestIds.npcId, isModalActive, npcs]
  );

  const activeHouse = useMemo(
    () => (nearestIds.houseId && !isModalActive ? houses.find((h) => h.id === nearestIds.houseId) || null : null),
    [nearestIds.houseId, isModalActive, houses]
  );

  const npcInitialPos: [number, number, number] = activeNpc
    ? (() => {
        const live = liveNpcPositions.current[activeNpc.id];
        return live ? [live.x, 0, live.z] : activeNpc.position;
      })()
    : [0, 0, 0];

  const localDoorZ = 4.6;

  return (
    <>
      {activeNpc && (
        <group ref={npcPromptGroupRef} position={npcInitialPos}>
          <Html position={[0, 3.0, 0]} center distanceFactor={20}>
            <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInteractNpc(activeNpc);
                }}
                className={`py-2 px-5 rounded-full font-serif font-black text-xs shadow-2xl border transition-all transform hover:scale-110 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeNpc.role === 'CHALLENGER'
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.95)] ring-2 ring-red-400/80'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.95)] ring-2 ring-amber-300/80'
                }`}
              >
                <span>{activeNpc.role === 'CHALLENGER' ? '⚔️' : '💬'}</span>
                <span>
                  {activeNpc.role === 'CHALLENGER'
                    ? `Retar a ${activeNpc.name} (E)`
                    : `Hablar con ${activeNpc.name} (E)`}
                </span>
              </button>
            </div>
          </Html>
        </group>
      )}

      {activeHouse && (
        <group position={activeHouse.pos} rotation={[0, activeHouse.rot, 0]}>
          <Html position={[0, 1.85, localDoorZ + 0.4]} center distanceFactor={22}>
            <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEnterHouse(activeHouse);
                }}
                className="py-1.5 px-4 rounded-full font-serif font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.8)] border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-yellow-400 text-black transition-all transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <span>🏠</span>
                <span>Entrar a {activeHouse.houseName} (E)</span>
              </button>
            </div>
          </Html>
        </group>
      )}
    </>
  );
}

function DynamicAtmosphereParticles({
  weatherType = 'ASTRAL_DUST',
  isPaused = false,
}: {
  weatherType: 'ASTRAL_DUST' | 'GOLDEN_EMBERS' | 'RAIN';
  isPaused?: boolean;
}) {
  const isMobile = isMobileOptimizationTarget();

  const pointsRef = useRef<THREE.Points>(null);
  const particleAccumRef = useRef(0);

  const particleGeo = useMemo(() => {
    const count = isMobile ? 40 : 160;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 160;
      pos[i * 3 + 1] = 0.5 + Math.random() * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 180;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [isMobile]);

  const particleMat = useMemo(() => {
    const color =
      weatherType === 'GOLDEN_EMBERS'
        ? '#f59e0b'
        : weatherType === 'RAIN'
        ? '#38bdf8'
        : '#c084fc';

    return new THREE.PointsMaterial({
      color,
      size: weatherType === 'RAIN' ? 0.35 : 0.22,
      transparent: true,
      opacity: 0.65,
    });
  }, [weatherType]);

  useEffect(() => {
    return () => {
      if (particleGeo && typeof particleGeo.dispose === 'function') {
        try {
          particleGeo.dispose();
        } catch (_) {}
      }
    };
  }, [particleGeo]);

  useEffect(() => {
    return () => {
      if (particleMat && typeof particleMat.dispose === 'function') {
        try {
          particleMat.dispose();
        } catch (_) {}
      }
    };
  }, [particleMat]);

  useFrame((state, delta) => {
    if (isPaused || !pointsRef.current) return;

    let stepDelta = delta;
    if (isMobile) {
      particleAccumRef.current += delta;
      if (particleAccumRef.current < 1 / 20) return;
      stepDelta = Math.min(particleAccumRef.current, 0.12);
      particleAccumRef.current = 0;
    }

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.getElapsedTime();

    for (let i = 0; i < arr.length; i += 3) {
      if (weatherType === 'RAIN') {
        arr[i + 1] -= stepDelta * 18;
        if (arr[i + 1] < 0.2) arr[i + 1] = 22;
      } else {
        arr[i + 1] -= stepDelta * 0.45;
        arr[i] += Math.sin(t * 0.8 + i) * 0.02 * (isMobile ? 2.5 : 1);
        if (arr[i + 1] < 0.2) arr[i + 1] = 22;
      }
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={particleGeo} material={particleMat} />;
}

const MARKET_STALL_INSTANCES: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
}> = [
  { position: [-14.5, 0, 11.5], rotation: [0, Math.PI / 2, 0] },
  { position: [-14.5, 0, 4.0], rotation: [0, Math.PI / 2, 0] },
  { position: [-14.5, 0, -4.0], rotation: [0, Math.PI / 2, 0] },
  { position: [-14.5, 0, -11.5], rotation: [0, Math.PI / 2, 0] },
  { position: [14.5, 0, 11.5], rotation: [0, -Math.PI / 2, 0] },
  { position: [14.5, 0, 4.0], rotation: [0, -Math.PI / 2, 0] },
  { position: [14.5, 0, -4.0], rotation: [0, -Math.PI / 2, 0] },
  { position: [14.5, 0, -11.5], rotation: [0, -Math.PI / 2, 0] },
];

const LANTERN_POSITIONS: [number, number, number][] = [
  [-15.5, 0, -65],
  [15.5, 0, -65],
  [-15.5, 0, -45],
  [15.5, 0, -45],
  [-15.5, 0, -25],
  [15.5, 0, -25],
  [-15.5, 0, -5],
  [15.5, 0, -5],
  [15.5, 0, 15],
  [-15.5, 0, 35],
  [15.5, 0, 35],
  [-15.5, 0, 55],
  [15.5, 0, 55],
  [-45.0, 0, 28],
  [45.0, 0, -28],
  [45.0, 0, 28],
];

function buildCityProvisionsInstances(): {
  barrels: InstancedTransformItem[];
  crates: InstancedTransformItem[];
  sacks: InstancedTransformItem[];
} {
  const barrels: InstancedTransformItem[] = [
    { position: [45.5, 0, 24.0], scale: 1.15 },
    { position: [46.7, 0, 24.3], scale: 1.1 },
    { position: [45.9, 0, 25.2], scale: 1.05 },
    { position: [48.8, 0, 24.2], scale: 1.2 },
    { position: [-48.0, 0, 23.8], scale: 1.1 },
    { position: [-47.3, 0, 22.8], scale: 0.95 },
  ];

  const crates: InstancedTransformItem[] = [
    { position: [47.8, 0, 25.0], rotation: [0, 0.2, 0], scale: 1.1 },
    { position: [47.6, 1.1, 25.0], rotation: [0, -0.1, 0], scale: 0.95 },
    { position: [-45.5, 0, 23.5], rotation: [0, -0.3, 0], scale: 1.15 },
    { position: [-46.7, 0, 24.2], rotation: [0, 0.25, 0], scale: 1.05 },
  ];

  const sacks: InstancedTransformItem[] = [];

  const stacks: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  }> = [
    { position: [-18.5, 0, 7.5], rotation: [0, 0.4, 0], scale: 0.9 },
    { position: [-18.5, 0, -8.0], rotation: [0, -0.3, 0], scale: 0.95 },
    { position: [18.5, 0, 7.5], rotation: [0, -0.5, 0], scale: 0.9 },
    { position: [18.5, 0, -8.0], rotation: [0, 0.2, 0], scale: 0.95 },
  ];

  const parentMat = new THREE.Matrix4();
  const childMat = new THREE.Matrix4();
  const worldMat = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();

  const composeChild = (
    parentM: THREE.Matrix4,
    pos: [number, number, number],
    rot: [number, number, number],
    scl: number
  ): InstancedTransformItem => {
    p.set(...pos);
    e.set(...rot, 'XYZ');
    q.setFromEuler(e);
    s.set(scl, scl, scl);
    childMat.compose(p, q, s);
    worldMat.multiplyMatrices(parentM, childMat);
    worldMat.decompose(p, q, s);
    e.setFromQuaternion(q, 'XYZ');
    return {
      position: [p.x, p.y, p.z],
      rotation: [e.x, e.y, e.z],
      scale: [s.x, s.y, s.z],
    };
  };

  for (const st of stacks) {
    p.set(...st.position);
    e.set(...st.rotation, 'XYZ');
    q.setFromEuler(e);
    s.set(st.scale, st.scale, st.scale);
    parentMat.compose(p, q, s);

    crates.push(
      composeChild(parentMat, [0, 0, 0], [0, 0.1, 0], 1.1),
      composeChild(parentMat, [1.25, 0, 0.1], [0, -0.15, 0], 1.05),
      composeChild(parentMat, [0.55, 1.15, 0.05], [0, 0.25, 0], 0.95)
    );
    barrels.push(
      composeChild(parentMat, [-1.1, 0, 0], [0, 0, 0], 1.0),
      composeChild(parentMat, [-0.8, 0, 0.9], [0, 0.3, 0], 0.9)
    );
    sacks.push(composeChild(parentMat, [0.7, 0.3, 0.7], [0.2, 0.4, 0], 1.0));
  }

  return { barrels, crates, sacks };
}

const CITY_PROVISIONS_INSTANCES = buildCityProvisionsInstances();

const MARKET_STALL_COLLIDERS = [
  { x: -14.5, z: 11.5, rot: Math.PI / 2 },
  { x: -14.5, z: 4.0, rot: Math.PI / 2 },
  { x: -14.5, z: -4.0, rot: Math.PI / 2 },
  { x: -14.5, z: -11.5, rot: Math.PI / 2 },
  { x: 14.5, z: 11.5, rot: -Math.PI / 2 },
  { x: 14.5, z: 4.0, rot: -Math.PI / 2 },
  { x: 14.5, z: -4.0, rot: -Math.PI / 2 },
  { x: 14.5, z: -11.5, rot: -Math.PI / 2 },
];

const LANTERN_COLLIDERS: [number, number][] = [
  [-15.5, -65], [15.5, -65],
  [-15.5, -45], [15.5, -45],
  [-15.5, -25], [15.5, -25],
  [-15.5, -5],  [15.5, -5],
  [15.5, 15],
  [-15.5, 35],  [15.5, 35],
  [-15.5, 55],  [15.5, 55],
  [-45.0, 28],  [45.0, -28], [45.0, 28],
];

export function CityOverworld({
  playerName,
  activeCampaignIndex = 0,
  isChampionOfCampaign = false,
  completionsCount = 0,
  isGameMenuOpen,
  isCodexOpen,
  isTrophyOpen = false,
  isSaveModalOpen = false,
  isInspecting = false,
  cameraYawOffset = 0,
  cameraZoomLevel = 1.0,
  activeDialogue = null,
  setActiveDialogue,
  savedPlayerPos = [0, 0, 36],
  onSavePlayerPos,
  campaignPhase,
  alleyCurrentFight,
  defeatedAlleyOpponents,
  timeOfDay = 0,
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
  pendingRewardModal = null,
  isGlobalModalOpen = false,
}: CityOverworldProps & { timeOfDay?: 0 | 1 | 2; cameraZoomLevel?: number }) {
  const isMobile = isMobileOptimizationTarget();
  const keysDown = useRef<Record<string, boolean>>({});
  const playerRef = useRef<THREE.Group>(null);
  const hasInitializedCameraRef = useRef(false);
  const hasReportedSceneReadyRef = useRef(false);
  const settledTimestampRef = useRef<number | null>(null);
  const framesSinceSettledRef = useRef(0);
  const onSceneReadyRef = useRef(onSceneReady);
  onSceneReadyRef.current = onSceneReady;
  const playerPos = useRef(new THREE.Vector3(savedPlayerPos[0], savedPlayerPos[1], savedPlayerPos[2]));
  const targetClickPos = useRef<THREE.Vector3 | null>(null);
  const playerYaw = useRef(Math.PI);
  const isPlayerWalkingRef = useRef(false);
  const nearestNpcIdRef = useRef<string | null>(null);
  const nearestNpcDistRef = useRef<number>(Infinity);
  const nearestHouseIdRef = useRef<string | null>(null);
  const nearestHouseDistRef = useRef<number>(Infinity);
  const lastExitTimeRef = useRef(Date.now());
  const hasTriggeredDoorRef = useRef(false);

  useEffect(() => {
    lastExitTimeRef.current = Date.now() + 450;
    hasTriggeredDoorRef.current = false;
    playerPos.current.set(savedPlayerPos[0], savedPlayerPos[1], savedPlayerPos[2]);
    keysDown.current = {};
    targetClickPos.current = null;
    virtualInput.reset();
    return () => {
      virtualInput.reset();
    };
  }, [savedPlayerPos]);

  const liveNpcPositions = useRef<Record<string, { x: number; z: number }>>({});
  const handleUpdateNpcPos = (id: string, x: number, z: number) => {
    const existing = liveNpcPositions.current[id];
    if (existing) {
      existing.x = x;
      existing.z = z;
    } else {
      liveNpcPositions.current[id] = { x, z };
    }
  };

  const roadTex = useMemo(() => getCobblestoneRoadTexture(), []);
  const cityWallTex = useMemo(() => getStoneWallTexture(260, 12), []);
  const roofBrownTex = useMemo(() => getRoofTileTexture('#78350f'), []);
  const plazaTex = useMemo(() => getAstralPlazaTexture(), []);

  const houseRotations: Record<string, number> = useMemo(
    () => ({
      house_1: 270,
      house_2: 270,
      house_3: 270,
      house_4: 270,
      house_9: 270,
      house_11: 270,
      house_5: 270,
      house_6: 270,
      house_7: 270,
      house_8: 270,
      house_10: 270,
      house_12: 270,
    }),
    []
  );

  const isDialogueActive = Boolean(activeDialogue);
  const isModalActive = isGameMenuOpen || isCodexOpen || Boolean(isTrophyOpen) || Boolean(isSaveModalOpen) || isInspecting || isDialogueActive || Boolean(pendingRewardModal) || Boolean(isGlobalModalOpen);
  const dialogueClosedUntilRef = useRef<number>(0);

  const cityTheme = useMemo(() => {
    if (timeOfDay === 1) {
      return {
        cityName: 'Atardecer Dorado en la Ciudadela',
        skyColor: '#451a03',
        fogColor: '#78350f',
        hemiSky: '#fbbf24',
        hemiGround: '#451a03',
        dirColor: '#f97316',
        sunIntensity: 4.2,
        ambientIntensity: 1.5,
        roadColor: '#52433d',
        avenueColor: '#3b2f29',
        lanternGlow: '#fef08a',
        guardArmor: '#1c1917',
        guardCloth: '#9a3412',
        weatherType: 'GOLDEN_EMBERS' as const,
      };
    } else if (timeOfDay === 2) {
      return {
        cityName: 'Noche Astral bajo las Estrellas',
        skyColor: '#020617',
        fogColor: '#0b0f19',
        hemiSky: '#38bdf8',
        hemiGround: '#0f172a',
        dirColor: '#60a5fa',
        sunIntensity: 1.8,
        ambientIntensity: 0.8,
        roadColor: '#1e293b',
        avenueColor: '#0f172a',
        lanternGlow: '#fef08a',
        guardArmor: '#020617',
        guardCloth: '#1e293b',
        weatherType: 'ASTRAL_DUST' as const,
      };
    }

    switch (activeCampaignIndex) {
      case 1:
        return {
          cityName: 'Bastión Abisal de Kar-Draz',
          skyColor: '#09050d',
          fogColor: '#12071f',
          hemiSky: '#a855f7',
          hemiGround: '#1f132b',
          dirColor: '#c084fc',
          sunIntensity: 3.5,
          ambientIntensity: 1.3,
          roadColor: '#3b2d4a',
          avenueColor: '#261b33',
          lanternGlow: '#c084fc',
          guardArmor: '#2e1065',
          guardCloth: '#581c87',
          weatherType: 'RAIN' as const,
        };
      case 2:
        return {
          cityName: 'Ciudadela Imperial de Valdor',
          skyColor: '#0f172a',
          fogColor: '#1e293b',
          hemiSky: '#38bdf8',
          hemiGround: '#475569',
          dirColor: '#fef08a',
          sunIntensity: 3.8,
          ambientIntensity: 1.4,
          roadColor: '#475569',
          avenueColor: '#334155',
          lanternGlow: '#fef08a',
          guardArmor: '#0f172a',
          guardCloth: '#b45309',
          weatherType: 'ASTRAL_DUST' as const,
        };
      case 3:
        return {
          cityName: 'Necrópolis Astral de Nocturnia',
          skyColor: '#020617',
          fogColor: '#090d16',
          hemiSky: '#38bdf8',
          hemiGround: '#0f172a',
          dirColor: '#22d3ee',
          sunIntensity: 3.2,
          ambientIntensity: 1.1,
          roadColor: '#1e293b',
          avenueColor: '#0f172a',
          lanternGlow: '#38bdf8',
          guardArmor: '#020617',
          guardCloth: '#164e63',
          weatherType: 'RAIN' as const,
        };
      case 0:
      default:
        return {
          cityName: 'Ciudadela Medieval de la Hora Dorada',
          skyColor: '#451a03',
          fogColor: '#78350f',
          hemiSky: '#fbbf24',
          hemiGround: '#451a03',
          dirColor: '#f97316',
          sunIntensity: 4.4,
          ambientIntensity: 1.6,
          roadColor: '#5c4a3e',
          avenueColor: '#45352c',
          lanternGlow: '#fef08a',
          guardArmor: '#1c1917',
          guardCloth: '#991b1b',
          weatherType: 'GOLDEN_EMBERS' as const,
        };
    }
  }, [activeCampaignIndex, timeOfDay]);

  const triggerDialogue = (d: CityDialogueData | null) => {
    targetClickPos.current = null;
    keysDown.current = {};
    if (d === null) {
      dialogueClosedUntilRef.current = Date.now() + 450;
    }
    if (setActiveDialogue) {
      setActiveDialogue(d);
    }
  };

  useEffect(() => {
    let soundInterval: ReturnType<typeof setInterval> | null = null;
    if (!isModalActive) {
      soundInterval = setInterval(() => {
        if (Math.random() < 0.45) {
          if (timeOfDay === 0) gameAudio.playHoverMicroTone();
          else if (timeOfDay === 1) gameAudio.playPowerupChime();
          else gameAudio.playPotionGulp();
        }
      }, 7000);
    }
    return () => {
      if (soundInterval) clearInterval(soundInterval);
    };
  }, [timeOfDay, isModalActive]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModalActive || isDialogueActive) {
        keysDown.current = {};
        return;
      }
      keysDown.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isModalActive, isDialogueActive]);

  const buildings: CityBuilding[] = useMemo(
    () => [
      {
        id: 'tavern',
        name: 'Taberna del Dragón Astral',
        type: 'TAVERN',
        position: [62, 0, 30],
        size: [34, 15, 26],
        color: '#92400e',
        doorPos: [44.2, 0, 30],
        label: '🍺 TABERNA ASTRAL',
        icon: '🍺',
      },
      {
        id: 'shop',
        name: 'Tienda Arcana de Solomon',
        type: 'SHOP',
        position: [-62, 0, 30],
        size: [36, 16, 32],
        color: '#7e22ce',
        doorPos: [-43.5, 0, 30],
        label: '🛒 TIENDA DE SOLOMON',
        icon: '🛒',
      },
      {
        id: 'forge',
        name: 'Taller & Forja de Dados',
        type: 'FORGE',
        position: [62, 0, -30],
        size: [30, 15, 26],
        color: '#0369a1',
        doorPos: [46.0, 0, -30],
        label: '🛠️ FORJA DE DADOS',
        icon: '🛠️',
      },
      {
        id: 'arena',
        name: 'Gran Arena de Torneos',
        type: 'ARENA',
        position: [0, 0, -88],
        size: [52, 18, 44],
        color: '#b91c1c',
        doorPos: [0, 0, -64.5],
        label: '🏆 VESTÍBULO DEL COLISEO',
        icon: '⚔️',
      },
    ],
    []
  );

  const houses: ResidentialHouseData[] = useMemo(
    () => [
      {
        id: 'house_1',
        houseName: 'Casa del Maestro de Dados',
        pos: [-98, 0, -60],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#991b1b',
        wall: '#475569',
        doorWorldPos: [-92.5, 0, -60],
        resident: {
          id: 'res_1',
          name: 'Maestro Roderic',
          title: 'Erudito de las Combinaciones',
          topic: 'Tiradas y Maestría',
          icon: '🎲',
          color: '#fbbf24',
          tip: '¡Saludos, recluta! Cuando dos dados coinciden fijan el nivel de tu invocación (Lv.4), y el tercer dado libre define su Maestría.',
        },
      },
      {
        id: 'house_2',
        houseName: 'Casona del Astrólogo',
        pos: [-98, 0, -42],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#78350f',
        wall: '#334155',
        doorWorldPos: [-92.5, 0, -42],
        resident: {
          id: 'res_2',
          name: 'Sabio Vaelin',
          title: 'Observador Cósmico',
          topic: 'Titanes Ascendidos',
          icon: '⚡',
          color: '#38bdf8',
          tip: 'Los Titanes Ascendidos despiertan con tiradas triples idénticas (1-1-1 al 6-6-6), desatando escudos divinos y tormentas de rayos.',
        },
      },
      {
        id: 'house_3',
        houseName: 'Refugio del Alquimista',
        pos: [-98, 0, -24],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#0f766e',
        wall: '#475569',
        doorWorldPos: [-92.5, 0, -24],
        resident: {
          id: 'res_3',
          name: 'Alquimista Caelen',
          title: 'Canalizador de Energía',
          topic: 'Transmutación Arcana',
          icon: '🔮',
          color: '#a855f7',
          tip: 'Puedes invocar de emergencia usando 4 de Maná cuando el rival tiene más piezas en el campo mediante la Transmutación.',
        },
      },
      {
        id: 'house_4',
        houseName: 'Taller del Engarzador',
        pos: [-98, 0, -6],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#581c87',
        wall: '#334155',
        doorWorldPos: [-92.5, 0, -6],
        resident: {
          id: 'res_4',
          name: 'Orfebre Darian',
          title: 'Maestro de Gemas',
          topic: 'Orbes Elementales',
          icon: '💎',
          color: '#ec4899',
          tip: 'Los dados Raros, Épicos y Legendarios tienen ranuras para engarzar orbes elementales en el taller y multiplicar el daño.',
        },
      },
      {
        id: 'house_9',
        houseName: 'Templo del Juicio',
        pos: [-98, 0, 48],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#78350f',
        wall: '#334155',
        doorWorldPos: [-92.5, 0, 48],
        resident: {
          id: 'res_9',
          name: 'Inquisidor Malakar',
          title: 'Juez de la Arena',
          topic: 'El Gran Torneo',
          icon: '⚖️',
          color: '#e2e8f0',
          tip: 'Derrota a los 12 duelistas del bulevar lineal para abrir las puertas de la Gran Arena y disputar el Torneo del Legado.',
        },
      },
      {
        id: 'house_11',
        houseName: 'Armería del Recluta',
        pos: [-98, 0, 66],
        rot: Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#15803d',
        wall: '#475569',
        doorWorldPos: [-92.5, 0, 66],
        resident: {
          id: 'res_11',
          name: 'Sargento Torin',
          title: 'Instructor de Infantería',
          topic: 'Curva de Daño y Escudos',
          icon: '⚔️',
          color: '#4ade80',
          tip: 'El Escudo Arcano absorbe hasta 4 puntos de daño de impacto directo antes de afectar los puntos de vida de tu tropa.',
        },
      },
      {
        id: 'house_5',
        houseName: 'Academia del Estratega',
        pos: [98, 0, -60],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#075985',
        wall: '#334155',
        doorWorldPos: [92.5, 0, -60],
        resident: {
          id: 'res_5',
          name: 'Comandante Theron',
          title: 'Veterano de la Falange',
          topic: 'Posicionamiento y Movimiento',
          icon: '🛡️',
          color: '#10b981',
          tip: 'Las tropas de Nivel 4 o superior y aquellas con orbe de rayo pueden mover 2 casillas en el tablero hexagonal.',
        },
      },
      {
        id: 'house_6',
        houseName: 'Baluarte del Soberano',
        pos: [98, 0, -42],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#78350f',
        wall: '#475569',
        doorWorldPos: [92.5, 0, -42],
        resident: {
          id: 'res_6',
          name: 'Senescal Alistair',
          title: 'Guardián del Rey',
          topic: 'Protección del Rey Celeste',
          icon: '👑',
          color: '#fbbf24',
          tip: 'Tu Rey Soberano es la pieza más vital: si sus puntos de salud caen a 0, la partida termina inmediatamente.',
        },
      },
      {
        id: 'house_7',
        houseName: 'Cripta del Grimorio',
        pos: [98, 0, -24],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#b45309',
        wall: '#334155',
        doorWorldPos: [92.5, 0, -24],
        resident: {
          id: 'res_7',
          name: 'Hechicera Morgana',
          title: 'Custodia de Hechizos',
          topic: 'Magia y Grimorio',
          icon: '📜',
          color: '#60a5fa',
          tip: 'Puedes desbloquear hechizos avanzados en la Tienda de Solomon y equipar hasta 4 simultáneamente en tu Grimorio.',
        },
      },
      {
        id: 'house_8',
        houseName: 'Pabellón de la Reserva',
        pos: [98, 0, -6],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#0284c7',
        wall: '#334155',
        doorWorldPos: [92.5, 0, -6],
        resident: {
          id: 'res_8',
          name: 'Intendente Garrick',
          title: 'Custodio de Reservas',
          topic: 'Reserva y Límite de Campo',
          icon: '📥',
          color: '#38bdf8',
          tip: 'Cuando una tirada te otorgue una ficha que prefieras no desplegar de inmediato, guárdala en tu reserva táctica: ganarás +1 Maná adicional y podrás invocarla en cualquier turno posterior.',
          avatarUrl: 'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/garrick_intendente.jpg',
        },
      },
      {
        id: 'house_10',
        houseName: 'Cámara de las Cuatro Coronas',
        pos: [98, 0, 48],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#075985',
        wall: '#475569',
        doorWorldPos: [92.5, 0, 48],
        resident: {
          id: 'res_10',
          name: 'Cronista Aldous',
          title: 'Historiador del Reino',
          topic: 'Selector de Campañas',
          icon: '🏆',
          color: '#f59e0b',
          tip: 'Existen 4 campañas con sus propios entornos y reglamentos. Todo tu arsenal de dados se comparte entre ellas.',
        },
      },
      {
        id: 'house_12',
        houseName: 'Santuario de la Escalera Táctica',
        pos: [98, 0, 66],
        rot: -Math.PI / 2,
        w: 9.5,
        d: 8.5,
        h: 7.2,
        roof: '#78350f',
        wall: '#334155',
        doorWorldPos: [92.5, 0, 66],
        resident: {
          id: 'res_12',
          name: 'Monje Zephyr',
          title: 'Guardián de la Armonía',
          topic: 'Escalera Táctica y Armonía',
          icon: '✨',
          color: '#c084fc',
          tip: 'Cuando tus 3 dados forman una secuencia consecutiva (1-2-3 al 4-5-6), se activa la Escalera Táctica. Puedes elegir libremente entre Fervor Marcial (+1 ATK a tus tropas), Bálsamo Real (+3 HP y Escudo al Soberano) o Sobrecarga (+2 Maná).',
        },
      },
    ],
    []
  );

  const alleyRivalCoords: [number, number, number][] = [
    [-8.5, 0, 50],
    [8.5, 0, 44],
    [-8.5, 0, 34],
    [8.5, 0, 28],
    [-8.5, 0, 16],
    [8.5, 0, 10],
    [-8.5, 0, -2],
    [8.5, 0, -8],
    [-8.5, 0, -20],
    [8.5, 0, -28],
    [-8.5, 0, -38],
    [8.5, 0, -48],
  ];

  const npcs = useMemo(() => {
    const baseList: CityNPC[] = [
      {
        id: 'guide_arena',
        name: 'Heraldo Valerius',
        role: 'CITIZEN',
        title: isChampionOfCampaign ? 'Heraldo del Campeón Supremo' : 'Heraldo de la Arena',
        position: [6.0, 0, -68],
        color: '#ef4444',
        icon: '⚔️',
        dialogue: isChampionOfCampaign
          ? `¡Abran paso al Campeón Supremo del Legado, ${playerName}! Los 12 rivales de la callejuela han vuelto a ocupar sus puestos y desean batallar de nuevo contigo.`
          : campaignPhase === 'TOURNAMENT'
          ? '¡Extraordinario! Has vencido a los 12 rivales de la callejuela. La Gran Arena está abierta: entra para inscribirte al Gran Torneo.'
          : `¡Alto ahí! La inscripción a la Gran Arena está bloqueada. Debes derrotar primero a los 12 duelistas del bulevar lineal (${defeatedAlleyOpponents.length}/12).`,
      },
      {
        id: 'guide_shop',
        name: 'Custodio Eldrin',
        role: 'CITIZEN',
        title: isChampionOfCampaign ? 'Tesorero del Campeón' : 'Guía del Bazar Astral',
        position: [-38.0, 0, 30],
        color: '#a855f7',
        icon: '🛒',
        dialogue: '¡Bienvenido! Entra a la Tienda de Solomon para adquirir nuevos dados raros y orbes elementales.',
      },
      {
        id: 'guide_forge',
        name: 'Aprendiz Borin',
        role: 'CITIZEN',
        title: isChampionOfCampaign ? 'Discípulo del Campeón' : 'Asistente de la Forja',
        position: [38.0, 0, -30],
        color: '#0284c7',
        icon: '🛠️',
        dialogue: 'En la Forja del este puedes engarzar orbes a tus dados épicos y legendarios para potenciar a tus criaturas.',
      },
      {
        id: 'guide_tavern',
        name: 'Tabernero Brom',
        role: 'CITIZEN',
        title: isChampionOfCampaign ? 'Anfitrión del Campeón' : 'Guía de la Taberna',
        position: [38.0, 0, 30],
        color: '#d97706',
        icon: '🍺',
        dialogue: 'En la Taberna puedes descansar, revisar el tablón de contratos de cazador y consultar tu Grimorio.',
      },
    ];

    if (timeOfDay === 0 || timeOfDay === 1) {
      baseList.push({
        id: 'cit_blacksmith',
        name: 'Herrero Darren',
        role: 'CITIZEN',
        title: timeOfDay === 1 ? 'Fundidor de Dados (Turno Vespertino)' : 'Fundidor de Dados',
        position: [6, 0, 20],
        color: '#f97316',
        icon: '🔨',
        dialogue: timeOfDay === 1
          ? 'El fuego de la forja brilla más con el atardecer. Recuerda que un orbe de fuego en un dado épico incrementa el calor bélico.'
          : 'El secreto de un buen dado reside en el temple del núcleo. Si engarzas un Orbe de Magma en una ranura épica, el calor fundirá las defensas.',
      });
    }

    if (timeOfDay === 0 || timeOfDay === 2) {
      baseList.push({
        id: 'cit_scholar',
        name: 'Erudita Selene',
        role: 'CITIZEN',
        title: timeOfDay === 2 ? 'Astrónoma Nocturna' : 'Investigadora de Runas',
        position: [6, 0, -18],
        color: '#38bdf8',
        icon: '📜',
        dialogue: timeOfDay === 2
          ? 'Bajo el manto de la noche, las constelaciones revelan los patrones rúnicos del tablero de combate.'
          : 'Dicen los pergaminos que las celdas hexagonales del tablero canalizan la energía geométrica del cosmos.',
      });
    }

    if (timeOfDay === 1 || timeOfDay === 2) {
      baseList.push({
        id: 'cit_bard',
        name: 'Bardo Alistair',
        role: 'CITIZEN',
        title: timeOfDay === 2 ? 'Trovador Noctámbulo' : isChampionOfCampaign ? 'Cronista del Campeón' : 'Poeta del Bulevar',
        position: [6, 0, -2],
        color: '#f59e0b',
        icon: '🪕',
        dialogue: timeOfDay === 2
          ? '«Cantan las estrellas sobre el coliseo silente, duermen los guerreros y vela el combatiente...» ¡La noche inspira las mejores baladas!'
          : '«Ruedan los dados de hueso y bronce, despiertan titanes cuando el cielo se rompe...» ¡Saludos, comandante!',
      });
    }

    if (timeOfDay === 2) {
      baseList.push({
        id: 'cit_night_guard',
        name: 'Centinela Vaelor',
        role: 'CITIZEN',
        title: 'Vigilante de la Noche',
        position: [-6, 0, -22],
        color: '#60a5fa',
        icon: '🌙',
        dialogue: 'Velo por la seguridad de la gran avenida mientras la ciudad duerme. Cuidado con las criaturas oscuras que merodean.',
      });
    }

    const campaignRoster = activeCampaignIndex === 1
      ? DUNGEON_LORDS_QUALIFIERS_ROSTER
      : activeCampaignIndex === 2
      ? RECRUIT_PRACTICE_ROSTER
      : activeCampaignIndex === 3
      ? SHADOW_THRONE_PURGE_ROSTER
      : ALLEY_OPPONENTS_ROSTER;

    const currentRivalRoster = campaignRoster.map((r) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      color: r.avatarColor || '#f43f5e',
      text: r.description || '¡Acepta el duelo!',
    }));

    currentRivalRoster.forEach((r, idx) => {
      const isDefeated = defeatedAlleyOpponents.includes(r.id);
      const shouldShowRival = isChampionOfCampaign || (campaignPhase === 'ALLEY' && !isDefeated);

      if (shouldShowRival) {
        const dialogueText = isChampionOfCampaign
          ? `¡Saludos, Gran Campeón ${playerName}! Un honor batallar contra ti. ¿Aceptas un duelo amistoso? (Recompensa: 100 de Oro o dado/orbe básico).`
          : r.text;

        baseList.push({
          id: r.id,
          name: r.name,
          role: 'CHALLENGER' as const,
          title: isChampionOfCampaign ? `Retador de Exhibición (${r.title})` : r.title,
          position: alleyRivalCoords[idx] || [0, 0, 0],
          color: r.color,
          icon: '⚔️',
          dialogue: dialogueText,
        });
      }
    });

    return baseList;
  }, [isChampionOfCampaign, campaignPhase, defeatedAlleyOpponents, playerName, timeOfDay, activeCampaignIndex]);

  const lastFootstepTimeRef = useRef(0);

  useFrame((state, delta) => {
    if (!hasReportedSceneReadyRef.current) {
      if (isCityEnvironmentLoadSettled()) {
        if (settledTimestampRef.current === null) {
          settledTimestampRef.current = performance.now();
          framesSinceSettledRef.current = 0;
        } else {
          framesSinceSettledRef.current += 1;
          if (
            framesSinceSettledRef.current >= 4 &&
            performance.now() - settledTimestampRef.current >= 120
          ) {
            hasReportedSceneReadyRef.current = true;
            if (onSceneReadyRef.current) {
              onSceneReadyRef.current();
            }
          }
        }
      }
    }

    if (!playerRef.current) return;
    if (isModalActive || isDialogueActive) {
      targetClickPos.current = null;
      isPlayerWalkingRef.current = false;
      return;
    }

    const clampedDelta = Math.min(Math.max(0, delta || 0), 0.05);

    let moveX = 0;
    let moveZ = 0;

    const keys = keysDown.current || {};
    const vInput = virtualInput.getState();
    const vUp = vInput.up;
    const vDown = vInput.down;
    const vLeft = vInput.left;
    const vRight = vInput.right;

    if (keys['w'] || keys['arrowup'] || vUp) moveZ -= 1;
    if (keys['s'] || keys['arrowdown'] || vDown) moveZ += 1;
    if (keys['a'] || keys['arrowleft'] || vLeft) moveX -= 1;
    if (keys['d'] || keys['arrowright'] || vRight) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      targetClickPos.current = null;
      if (cameraYawOffset !== 0) {
        const cosYaw = Math.cos(cameraYawOffset);
        const sinYaw = Math.sin(cameraYawOffset);
        const rotatedX = moveX * cosYaw + moveZ * sinYaw;
        const rotatedZ = -moveX * sinYaw + moveZ * cosYaw;
        moveX = rotatedX;
        moveZ = rotatedZ;
      }
    } else if (targetClickPos.current) {
      const dx = targetClickPos.current.x - playerPos.current.x;
      const dz = targetClickPos.current.z - playerPos.current.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.5) {
        moveX = dx / dist;
        moveZ = dz / dist;
      } else {
        targetClickPos.current = null;
      }
    }

    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

    isPlayerWalkingRef.current = isMoving;

    if (isMoving) {
      const len = Math.hypot(moveX, moveZ);
      const speed = 12.0;
      const safeLen = len > 0.0001 ? len : 1;
      const vx = (moveX / safeLen) * speed * clampedDelta;
      const vz = (moveZ / safeLen) * speed * clampedDelta;

      let nextX = THREE.MathUtils.clamp(playerPos.current.x + vx, -122, 122);
      let nextZ = THREE.MathUtils.clamp(playerPos.current.z + vz, -122, 122);

      const playerRadius = 0.75;
      for (const b of buildings) {
        const halfW = b.size[0] / 2 + playerRadius;
        const halfD = b.size[2] / 2 + playerRadius;
        const minX = b.position[0] - halfW;
        const maxX = b.position[0] + halfW;
        const minZ = b.position[2] - halfD;
        const maxZ = b.position[2] + halfD;

        if (nextX > minX && nextX < maxX && playerPos.current.z > minZ && playerPos.current.z < maxZ) {
          nextX = playerPos.current.x;
        }
        if (nextX > minX && nextX < maxX && nextZ > minZ && nextZ < maxZ) {
          nextZ = playerPos.current.z;
        }
        if (nextX > minX && nextX < maxX && nextZ > minZ && nextZ < maxZ) {
          const dLeft = Math.abs(nextX - minX);
          const dRight = Math.abs(maxX - nextX);
          const dTop = Math.abs(nextZ - minZ);
          const dBottom = Math.abs(maxZ - nextZ);
          const minDistFace = Math.min(dLeft, dRight, dTop, dBottom);
          if (minDistFace === dLeft) nextX = minX - 0.05;
          else if (minDistFace === dRight) nextX = maxX + 0.05;
          else if (minDistFace === dTop) nextZ = minZ - 0.05;
          else nextZ = maxZ + 0.05;
        }
      }

      for (const h of houses) {
        const isRotated = Math.abs(Math.sin(h.rot)) > 0.5;
        const actualWidth = isRotated ? h.d : h.w;
        const actualDepth = isRotated ? h.w : h.d;
        const halfHW = actualWidth / 2 + playerRadius;
        const halfHD = actualDepth / 2 + playerRadius;
        const minHX = h.pos[0] - halfHW;
        const maxHX = h.pos[0] + halfHW;
        const minHZ = h.pos[2] - halfHD;
        const maxHZ = h.pos[2] + halfHD;

        if (nextX > minHX && nextX < maxHX && playerPos.current.z > minHZ && playerPos.current.z < maxHZ) {
          nextX = playerPos.current.x;
        }
        if (nextX > minHX && nextX < maxHX && nextZ > minHZ && nextZ < maxHZ) {
          nextZ = playerPos.current.z;
        }
        if (nextX > minHX && nextX < maxHX && nextZ > minHZ && nextZ < maxHZ) {
          const dLeft = Math.abs(nextX - minHX);
          const dRight = Math.abs(maxHX - nextX);
          const dTop = Math.abs(nextZ - minHZ);
          const dBottom = Math.abs(maxHZ - nextZ);
          const minDistFace = Math.min(dLeft, dRight, dTop, dBottom);
          if (minDistFace === dLeft) nextX = minHX - 0.05;
          else if (minDistFace === dRight) nextX = maxHX + 0.05;
          else if (minDistFace === dTop) nextZ = minHZ - 0.05;
          else nextZ = maxHZ + 0.05;
        }
      }

      const distToFountain = Math.hypot(nextX, nextZ);
      if (distToFountain < 5.2) {
        const angle = Math.atan2(nextZ, nextX);
        nextX = Math.cos(angle) * 5.2;
        nextZ = Math.sin(angle) * 5.2;
      }

      const churchCenterZ = 78;
      const halfNaveX = 8.5 + playerRadius;
      const minNaveZ = churchCenterZ - 14.5;
      const maxNaveZ = churchCenterZ + 15.5;
      if (nextX > -halfNaveX && nextX < halfNaveX && nextZ > minNaveZ && nextZ < maxNaveZ) {
        if (playerPos.current.x <= -halfNaveX || playerPos.current.x >= halfNaveX) {
          nextX = playerPos.current.x;
        }
        if (playerPos.current.z <= minNaveZ || playerPos.current.z >= maxNaveZ) {
          nextZ = playerPos.current.z;
        }
      }

      const halfTranseptX = 17.5 + playerRadius;
      const minTranseptZ = churchCenterZ - 6.5;
      const maxTranseptZ = churchCenterZ + 7.5;
      if (nextX > -halfTranseptX && nextX < halfTranseptX && nextZ > minTranseptZ && nextZ < maxTranseptZ) {
        if (playerPos.current.x <= -halfTranseptX || playerPos.current.x >= halfTranseptX) {
          nextX = playerPos.current.x;
        }
        if (playerPos.current.z <= minTranseptZ || playerPos.current.z >= maxTranseptZ) {
          nextZ = playerPos.current.z;
        }
      }

      for (const s of MARKET_STALL_COLLIDERS) {
        const isRotated90 = Math.abs(Math.sin(s.rot)) > 0.5;
        const halfX = (isRotated90 ? 1.3 : 1.9) + playerRadius;
        const halfZ = (isRotated90 ? 1.9 : 1.3) + playerRadius;

        const minSX = s.x - halfX;
        const maxSX = s.x + halfX;
        const minSZ = s.z - halfZ;
        const maxSZ = s.z + halfZ;

        if (nextX > minSX && nextX < maxSX && nextZ > minSZ && nextZ < maxSZ) {
          if (playerPos.current.x <= minSX || playerPos.current.x >= maxSX) {
            nextX = playerPos.current.x;
          }
          if (playerPos.current.z <= minSZ || playerPos.current.z >= maxSZ) {
            nextZ = playerPos.current.z;
          }
        }
      }

      for (const [lx, lz] of LANTERN_COLLIDERS) {
        const dL = Math.hypot(nextX - lx, nextZ - lz);
        if (dL < 0.95) {
          const ang = Math.atan2(nextZ - lz, nextX - lx);
          nextX = lx + Math.cos(ang) * 0.95;
          nextZ = lz + Math.sin(ang) * 0.95;
        }
      }

      playerPos.current.x = nextX;
      playerPos.current.z = nextZ;

      const now = performance.now();
      if (now - lastFootstepTimeRef.current > 320) {
        lastFootstepTimeRef.current = now;
        gameAudio.playFootstepStone();
      }

      const targetAngle = Math.atan2(moveX, moveZ);
      const angleDiff = targetAngle - playerYaw.current;
      const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      playerYaw.current += wrappedDiff * Math.min(1, 14 * delta);
    }

    playerRef.current.position.set(playerPos.current.x, 0, playerPos.current.z);
    playerRef.current.rotation.y = playerYaw.current;

    const zoomFactor = Math.max(0.5, cameraZoomLevel || 1.0);
    const camDistHoriz = 16.5 * zoomFactor;
    const camHeight = 17.0 * zoomFactor;

    const targetCamX = playerPos.current.x + Math.sin(cameraYawOffset) * camDistHoriz;
    const targetCamY = camHeight;
    const targetCamZ = playerPos.current.z + Math.cos(cameraYawOffset) * camDistHoriz;

    const lerpFactor = 1 - Math.exp(-9 * clampedDelta);
    if (!Number.isNaN(targetCamX) && !Number.isNaN(targetCamZ)) {
      if (!hasInitializedCameraRef.current) {
        hasInitializedCameraRef.current = true;
        state.camera.position.set(targetCamX, targetCamY, targetCamZ);
      } else {
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, lerpFactor);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, lerpFactor);
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetCamZ, lerpFactor);
      }

      state.camera.lookAt(playerPos.current.x, 1.2, playerPos.current.z);
    }

    const canTriggerDoor = Date.now() > lastExitTimeRef.current;
    if (canTriggerDoor && !isDialogueActive && !isModalActive) {
      let anyDoorInRange = false;

      for (const b of buildings) {
        const distToDoor = Math.hypot(playerPos.current.x - b.doorPos[0], playerPos.current.z - b.doorPos[2]);
        if (distToDoor < 2.0) {
          anyDoorInRange = true;
          if (!hasTriggeredDoorRef.current) {
            hasTriggeredDoorRef.current = true;
            if (b.type === 'ARENA') {
              const spawnPos: [number, number, number] = [0, 0, -58.0];
              if (onSavePlayerPos) onSavePlayerPos(spawnPos);
              playerPos.current.set(...spawnPos);
              onEnterArena();
              return;
            } else if (b.type === 'SHOP') {
              const spawnPos: [number, number, number] = [-41.0, 0, 30];
              if (onSavePlayerPos) onSavePlayerPos(spawnPos);
              playerPos.current.set(...spawnPos);
              onEnterShop();
              return;
            } else if (b.type === 'FORGE') {
              const spawnPos: [number, number, number] = [41.0, 0, -30];
              if (onSavePlayerPos) onSavePlayerPos(spawnPos);
              playerPos.current.set(...spawnPos);
              onEnterWorkshop();
              return;
            } else if (b.type === 'TAVERN') {
              const spawnPos: [number, number, number] = [41.0, 0, 30];
              if (onSavePlayerPos) onSavePlayerPos(spawnPos);
              playerPos.current.set(...spawnPos);
              if (onEnterTavern) {
                onEnterTavern();
              }
              return;
            }
          }
        }
      }

      for (const h of houses) {
        const distToHouseDoor = Math.hypot(playerPos.current.x - h.doorWorldPos[0], playerPos.current.z - h.doorWorldPos[2]);
        if (distToHouseDoor < 2.2) {
          anyDoorInRange = true;
          if (!hasTriggeredDoorRef.current) {
            hasTriggeredDoorRef.current = true;
            handleHouseInteraction(h);
            return;
          }
        }
      }

      if (!anyDoorInRange) {
        hasTriggeredDoorRef.current = false;
      }
    }

    let closestNpc: string | null = null;
    let minD = 4.2;

    for (const npc of npcs) {
      const livePos = liveNpcPositions.current[npc.id] || { x: npc.position[0], z: npc.position[2] };
      const dx = livePos.x - playerPos.current.x;
      const dz = livePos.z - playerPos.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist < minD) {
        minD = dist;
        closestNpc = npc.id;
      }
    }

    nearestNpcDistRef.current = closestNpc ? minD : Infinity;
    nearestNpcIdRef.current = closestNpc;

    let closestHouse: string | null = null;
    let minHouseD = 3.6;

    for (const h of houses) {
      const dxH = h.doorWorldPos[0] - playerPos.current.x;
      const dzH = h.doorWorldPos[2] - playerPos.current.z;
      const distH = Math.hypot(dxH, dzH);

      if (distH < minHouseD) {
        minHouseD = distH;
        closestHouse = h.id;
      }
    }

    nearestHouseDistRef.current = closestHouse ? minHouseD : Infinity;
    nearestHouseIdRef.current = closestHouse;
  });

  const handleHouseInteraction = (house: ResidentialHouseData) => {
    targetClickPos.current = null;
    keysDown.current = {};
    if (setActiveDialogue) {
      setActiveDialogue(null);
    }
    gameAudio.playConfirmSelect();

    const safeExitPos = getHouseSafeExitPos(house);
    playerPos.current.set(...safeExitPos);
    if (onSavePlayerPos) {
      onSavePlayerPos(safeExitPos);
    }

    if (onEnterHouse) {
      onEnterHouse(house);
    }
  };

  const handleNPCInteraction = (npc: CityNPC) => {
    targetClickPos.current = null;
    keysDown.current = {};

    const livePos = liveNpcPositions.current[npc.id] || { x: npc.position[0], z: npc.position[2] };

    if (npc.role === 'CHALLENGER') {
      const npcKey = npc.id.replace('alley_', '');
      const nameKey = npc.name.toLowerCase().replace(/ /g, '_');
      const shortName = npc.name.toLowerCase().split(' ')[0] || '';
      
      const gladiatorPortraits = getGladiatorPortraitUrls(npc.id, npc.name);

      const portraitUrls = [
        ...gladiatorPortraits,
        `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/${nameKey}.jpg`,
        `https://raw.githubusercontent.com/endersonvivas48-oss/main/main/${nameKey}.jpg`,
        `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/${shortName}.jpg`,
        `https://raw.githubusercontent.com/endersonvivas48-oss/main/main/${shortName}.jpg`,
        `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/gladiador_${shortName}.jpg`,
        `https://raw.githubusercontent.com/endersonvivas48-oss/main/main/gladiador_${shortName}.jpg`,
        `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/imagnpc/${nameKey}.jpg`,
        `https://raw.githubusercontent.com/endersonvivas48-oss/main/main/imagnpc/${nameKey}.jpg`,
        `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/gladiador/${shortName}.jpg`,
        `https://raw.githubusercontent.com/endersonvivas48-oss/main/main/gladiador/${shortName}.jpg`,
        `./assets/imagnpc/${nameKey}.jpg`,
        `./assets/imagnpc/${nameKey}.png`,
        `./assets/imagnpc/${shortName}.jpg`,
        `./assets/imagnpc/${shortName}.png`,
        `./assets/imagnpc/gladiador_${shortName}.jpg`,
        `./assets/imagnpc/${npcKey}.jpg`,
      ];

      triggerDialogue({
        speaker: npc.name,
        role: npc.title,
        text: npc.dialogue,
        actionText: isChampionOfCampaign
          ? '⚔️ Retar a Duelo de Exhibición'
          : `⚔️ Retar a Duelo (${Math.min(12, defeatedAlleyOpponents.length + 1)}/12)`,
        avatarImgUrl: portraitUrls[0],
        candidateAvatarUrls: portraitUrls,
        action: () => {
          targetClickPos.current = null;
          const spawnFacingX = livePos.x;
          const spawnFacingZ = livePos.z > 0 ? livePos.z - 2.8 : livePos.z + 2.8;
          const spawnFacing: [number, number, number] = [spawnFacingX, 0, spawnFacingZ];
          if (onSavePlayerPos) onSavePlayerPos(spawnFacing);
          onStartAlleyFight(npc.id);
        },
      });
    } else {
      const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
      const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

      const rolePortraits: Record<string, string[]> = {
        guide_arena: [
          `${MAIN_CDN}/herald_valerius.jpg`,
          `${MAIN_RAW}/herald_valerius.jpg`,
          `${MAIN_CDN}/valerius.jpg`,
          `${MAIN_RAW}/valerius.jpg`,
          `${MAIN_CDN}/gladiador_valerius.jpg`,
          `${MAIN_RAW}/gladiador_valerius.jpg`,
          `${MAIN_CDN}/imagnpc/herald_valerius.jpg`,
          `${MAIN_RAW}/imagnpc/herald_valerius.jpg`,
          `${MAIN_CDN}/imagnpc/valerius.jpg`,
          `${MAIN_RAW}/imagnpc/valerius.jpg`,
          './assets/imagnpc/valerius.jpg',
          './assets/valerius.jpg',
        ],
        guide_shop: [
          `${MAIN_CDN}/custodio_eldrin.jpg`,
          `${MAIN_RAW}/custodio_eldrin.jpg`,
          `${MAIN_CDN}/eldrin.jpg`,
          `${MAIN_RAW}/eldrin.jpg`,
          `${MAIN_CDN}/solomon.jpg`,
          `${MAIN_RAW}/solomon.jpg`,
          `${MAIN_CDN}/imagnpc/custodio_eldrin.jpg`,
          `${MAIN_RAW}/imagnpc/custodio_eldrin.jpg`,
          `${MAIN_CDN}/imagnpc/eldrin.jpg`,
          `${MAIN_RAW}/imagnpc/eldrin.jpg`,
          './assets/imagnpc/eldrin.jpg',
          './assets/eldrin.jpg',
        ],
        guide_forge: [
          `${MAIN_CDN}/aprendiz_borin.jpg`,
          `${MAIN_RAW}/aprendiz_borin.jpg`,
          `${MAIN_CDN}/borin.jpg`,
          `${MAIN_RAW}/borin.jpg`,
          `${MAIN_CDN}/vulkan.jpg`,
          `${MAIN_RAW}/vulkan.jpg`,
          `${MAIN_CDN}/imagnpc/aprendiz_borin.jpg`,
          `${MAIN_RAW}/imagnpc/aprendiz_borin.jpg`,
          `${MAIN_CDN}/imagnpc/borin.jpg`,
          `${MAIN_RAW}/imagnpc/borin.jpg`,
          './assets/imagnpc/borin.jpg',
          './assets/borin.jpg',
        ],
        guide_tavern: [
          `${MAIN_CDN}/brom.jpg`,
          `${MAIN_RAW}/brom.jpg`,
          `${MAIN_CDN}/gladiador_brom.jpg`,
          `${MAIN_RAW}/gladiador_brom.jpg`,
          `${MAIN_CDN}/imagnpc/brom.jpg`,
          `${MAIN_RAW}/imagnpc/brom.jpg`,
          './assets/imagnpc/brom.jpg',
          './assets/brom.jpg',
        ],
        cit_blacksmith: [
          `${MAIN_CDN}/herrero_darren.jpg`,
          `${MAIN_RAW}/herrero_darren.jpg`,
          `${MAIN_CDN}/darren.jpg`,
          `${MAIN_RAW}/darren.jpg`,
          `${MAIN_CDN}/vulkan.jpg`,
          `${MAIN_RAW}/vulkan.jpg`,
          `${MAIN_CDN}/imagnpc/herrero_darren.jpg`,
          `${MAIN_RAW}/imagnpc/herrero_darren.jpg`,
          `${MAIN_CDN}/imagnpc/darren.jpg`,
          `${MAIN_RAW}/imagnpc/darren.jpg`,
          './assets/imagnpc/darren.jpg',
          './assets/darren.jpg',
        ],
        cit_scholar: [
          `${MAIN_CDN}/erudita_selene.jpg`,
          `${MAIN_RAW}/erudita_selene.jpg`,
          `${MAIN_CDN}/selene.jpg`,
          `${MAIN_RAW}/selene.jpg`,
          `${MAIN_CDN}/imagnpc/erudita_selene.jpg`,
          `${MAIN_RAW}/imagnpc/erudita_selene.jpg`,
          `${MAIN_CDN}/imagnpc/selene.jpg`,
          `${MAIN_RAW}/imagnpc/selene.jpg`,
          './assets/imagnpc/selene.jpg',
          './assets/selene.jpg',
        ],
        cit_bard: [
          `${MAIN_CDN}/bardo_alistair.jpg`,
          `${MAIN_RAW}/bardo_alistair.jpg`,
          `${MAIN_CDN}/alistair.jpg`,
          `${MAIN_RAW}/alistair.jpg`,
          `${MAIN_CDN}/imagnpc/bardo_alistair.jpg`,
          `${MAIN_RAW}/imagnpc/bardo_alistair.jpg`,
          `${MAIN_CDN}/imagnpc/alistair.jpg`,
          `${MAIN_RAW}/imagnpc/alistair.jpg`,
          './assets/imagnpc/alistair.jpg',
          './assets/alistair.jpg',
        ],
        cit_night_guard: [
          `${MAIN_CDN}/centinela_vaelor.jpg`,
          `${MAIN_RAW}/centinela_vaelor.jpg`,
          `${MAIN_CDN}/vaelor.jpg`,
          `${MAIN_RAW}/vaelor.jpg`,
          `${MAIN_CDN}/imagnpc/centinela_vaelor.jpg`,
          `${MAIN_RAW}/imagnpc/centinela_vaelor.jpg`,
          './assets/imagnpc/vaelor.jpg',
          './assets/vaelor.jpg',
        ],
      };

      const citizenSlug = npc.name.toLowerCase().replace(/ /g, '_');
      const citizenPortraits = rolePortraits[npc.id] || [
        `${MAIN_CDN}/${citizenSlug}.webp`,
        `${MAIN_RAW}/${citizenSlug}.webp`,
        `${MAIN_CDN}/${citizenSlug}.jpg`,
        `${MAIN_RAW}/${citizenSlug}.jpg`,
        `${MAIN_CDN}/${npc.id}.jpg`,
        `${MAIN_RAW}/${npc.id}.jpg`,
        `${MAIN_CDN}/imagnpc/${citizenSlug}.jpg`,
        `${MAIN_RAW}/imagnpc/${citizenSlug}.jpg`,
        `${MAIN_CDN}/master_avatar.jpg`,
        `${MAIN_RAW}/master_avatar.jpg`,
        `./assets/imagnpc/${citizenSlug}.jpg`,
        `./assets/imagnpc/${citizenSlug}.png`,
        `./assets/imagnpc/${npc.id}.jpg`,
        `./assets/imagnpc/${npc.id}.png`,
      ];

      triggerDialogue({
        speaker: npc.name,
        role: npc.title,
        text: npc.dialogue,
        actionText: 'Entendido, gracias por el consejo',
        avatarImgUrl: citizenPortraits[0],
        candidateAvatarUrls: citizenPortraits,
        action: () => {
          targetClickPos.current = null;
          triggerDialogue(null);
        },
      });
    }
  };

  const npcsRef = useRef<CityNPC[]>([]);
  npcsRef.current = npcs;
  const housesRef = useRef<ResidentialHouseData[]>([]);
  housesRef.current = houses;
  const handleNPCInteractionRef = useRef(handleNPCInteraction);
  handleNPCInteractionRef.current = handleNPCInteraction;
  const handleHouseInteractionRef = useRef(handleHouseInteraction);
  handleHouseInteractionRef.current = handleHouseInteraction;

  useEffect(() => {
    const handleInteractKey = (e: KeyboardEvent) => {
      if (isGameMenuOpen || isModalActive || isDialogueActive) return;
      const key = e.key.toLowerCase();

      if (key === 'e') {
        const currentNpcId = nearestNpcIdRef.current;
        const currentHId = nearestHouseIdRef.current;

        if (currentHId && (!currentNpcId || nearestHouseDistRef.current <= nearestNpcDistRef.current)) {
          const targetH = housesRef.current.find((h) => h.id === currentHId);
          if (targetH) handleHouseInteractionRef.current(targetH);
        } else if (currentNpcId) {
          const target = npcsRef.current.find((n) => n.id === currentNpcId);
          if (target) handleNPCInteractionRef.current(target);
        }
      }
    };
    window.addEventListener('keydown', handleInteractKey);
    return () => window.removeEventListener('keydown', handleInteractKey);
  }, [isGameMenuOpen, isModalActive, isDialogueActive]);

  return (
    <>
      <color attach="background" args={[cityTheme.skyColor]} />
      <fog attach="fog" args={[cityTheme.fogColor, 50, 190]} />
      <hemisphereLight args={[cityTheme.hemiSky, cityTheme.hemiGround, cityTheme.ambientIntensity * 1.8]} />
      <directionalLight position={[45, 65, 40]} intensity={cityTheme.sunIntensity} color={cityTheme.dirColor} castShadow />
      <ambientLight intensity={cityTheme.ambientIntensity} />

      <DynamicAtmosphereParticles weatherType={cityTheme.weatherType} isPaused={isModalActive} />
      <MedievalSunsetCitadelBackdrop />

      <InstancedMedievalMarketStalls stalls={MARKET_STALL_INSTANCES} />

      <group>
        <MedievalOakTree position={[-19.0, 0, 15.0]} scale={1.15} tint="#2e5c1e" />
        <MedievalOakTree position={[19.0, 0, 15.0]} scale={1.1} tint="#366b23" />
        <MedievalOakTree position={[-19.0, 0, -15.0]} scale={1.05} tint="#28521a" />
        <MedievalOakTree position={[19.0, 0, -15.0]} scale={1.2} tint="#2e5c1e" />

        <MedievalOakTree position={[26.0, 0, 20.0]} scale={1.25} tint="#326322" />
        <MedievalOakTree position={[56.0, 0, 44.0]} scale={1.3} tint="#27501a" />
        <MedievalOakTree position={[-26.0, 0, 20.0]} scale={1.2} tint="#386e26" />
        <MedievalOakTree position={[-56.0, 0, 44.0]} scale={1.25} tint="#2e5c1e" />

        <MedievalPlanter position={[-11.5, 0, 15.0]} scale={0.95} flowerColor="#f59e0b" />
        <MedievalPlanter position={[11.5, 0, 15.0]} scale={0.95} flowerColor="#ef4444" />
        <MedievalPlanter position={[-11.5, 0, -15.0]} scale={0.95} flowerColor="#38bdf8" />
        <MedievalPlanter position={[11.5, 0, -15.0]} scale={0.95} flowerColor="#a855f7" />
        <MedievalPlanter position={[-11.5, 0, 0]} scale={0.9} flowerColor="#eab308" />
        <MedievalPlanter position={[11.5, 0, 0]} scale={0.9} flowerColor="#ec4899" />

        <MedievalPlanter position={[37.5, 0, 26.5]} scale={1.05} flowerColor="#fbbf24" />
        <MedievalPlanter position={[37.5, 0, 33.5]} scale={1.05} flowerColor="#f97316" />

        <InstancedMedievalBarrels instances={CITY_PROVISIONS_INSTANCES.barrels} />
        <InstancedMedievalCrates instances={CITY_PROVISIONS_INSTANCES.crates} />
        <InstancedProvisionSacks instances={CITY_PROVISIONS_INSTANCES.sacks} />
      </group>

      <MedievalChurch
        position={[0, 0, 78]}
        rotation={[0, 0, 0]}
        isModalActive={isModalActive}
        onBlessing={() => {
          gameAudio.playVictoryFanfare();
          const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
          const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

          const aldousPortraits = [
            `${MAIN_CDN}/hermano_aldous.jpg`,
            `${MAIN_RAW}/hermano_aldous.jpg`,
            `${MAIN_CDN}/aldous.jpg`,
            `${MAIN_RAW}/aldous.jpg`,
            `${MAIN_CDN}/imagnpc/hermano_aldous.jpg`,
            `${MAIN_RAW}/imagnpc/hermano_aldous.jpg`,
            `${MAIN_CDN}/imagnpc/aldous.jpg`,
            `${MAIN_RAW}/imagnpc/aldous.jpg`,
            `${MAIN_CDN}/gladiador_aldous.jpg`,
            `${MAIN_RAW}/gladiador_aldous.jpg`,
            'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/hermano_aldous.jpg',
            'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/aldous.jpg',
            './assets/imagnpc/hermano_aldous.jpg',
            './assets/imagnpc/aldous.jpg',
            `${MAIN_RAW}/master_avatar.jpg`,
          ];

          triggerDialogue({
            speaker: 'Hermano Aldous',
            role: 'Guardián de la Capilla',
            text: '«¡Que la luz de los Dados Celestiales bendiga tu camino, Campeón! En este sagrado templo, tu salud y espíritu se reconfortan para la batalla.»',
            actionText: 'Recibir Bendición Sagrada',
            avatarImgUrl: aldousPortraits[0],
            candidateAvatarUrls: aldousPortraits,
            action: () => triggerDialogue(null),
          });
        }}
      />

      <CityFloor3D
        extent={270}
        fallbackMap={roadTex}
        fallbackColor={cityTheme.roadColor}
        onPointerDown={(e) => {
          if (isModalActive || isDialogueActive || Date.now() < dialogueClosedUntilRef.current) return;
          const target = (e.nativeEvent?.target || (e as any).target) as HTMLElement | null;
          if (target && (target.tagName === 'BUTTON' || target.closest('button'))) return;
          e.stopPropagation();
          targetClickPos.current = new THREE.Vector3(e.point.x, 0, e.point.z);
        }}
      />

      <MedievalCentralFountain
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1.0, 1.0, 1.0]}
      />

      {buildings.map((b) => {
        const handleBuildingEnter = () => {
          targetClickPos.current = null;
          keysDown.current = {};

          if (b.type === 'ARENA') {
            onEnterArena();
          } else if (b.type === 'SHOP') {
            onEnterShop();
          } else if (b.type === 'FORGE') {
            onEnterWorkshop();
          } else if (b.type === 'TAVERN') {
            if (onEnterTavern) onEnterTavern();
          }
        };

        return (
          <ProceduralDistrict
            key={b.id}
            id={b.id}
            name={b.name}
            label={b.label}
            type={b.type}
            position={b.position}
            isModalActive={isModalActive}
            onEnterBuilding={handleBuildingEnter}
          />
        );
      })}

      <InstancedMedievalHouses
        houses={houses}
        houseRotations={houseRotations}
      />

      <group>
        <mesh position={[0, 5.5, -125]}>
          <boxGeometry args={[250, 11, 4]} />
          <meshStandardMaterial map={cityWallTex} roughness={0.9} />
        </mesh>
        <mesh position={[0, 5.5, 125]}>
          <boxGeometry args={[250, 11, 4]} />
          <meshStandardMaterial map={cityWallTex} roughness={0.9} />
        </mesh>
        <mesh position={[-125, 5.5, 0]}>
          <boxGeometry args={[4, 11, 250]} />
          <meshStandardMaterial map={cityWallTex} roughness={0.9} />
        </mesh>
        <mesh position={[125, 5.5, 0]}>
          <boxGeometry args={[4, 11, 250]} />
          <meshStandardMaterial map={cityWallTex} roughness={0.9} />
        </mesh>

        {[
          [-125, 8.5, -125],
          [125, 8.5, -125],
          [-125, 8.5, 125],
          [125, 8.5, 125],
        ].map((tPos, idx) => (
          <group key={idx} position={tPos as [number, number, number]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[6.0, 6.8, 17, 16]} />
              <meshStandardMaterial map={cityWallTex} roughness={0.8} />
            </mesh>
            <mesh position={[0, 10.5, 0]} castShadow>
              <coneGeometry args={[7.5, 6.5, 16]} />
              <meshStandardMaterial map={roofBrownTex} roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      <InstancedMedievalLampPosts
        positions={LANTERN_POSITIONS}
        litIndices={[6, 7]}
        lightColor={cityTheme.lanternGlow}
      />

      {[
        { pos: [-4.0, 0, -41], rot: 0 },
        { pos: [4.0, 0, -41], rot: 0 },
        { pos: [-4.0, 0, 47], rot: Math.PI },
        { pos: [4.0, 0, 47], rot: Math.PI },
      ].map((guard, gIdx) => (
        <group key={`guard_${gIdx}`} position={guard.pos as [number, number, number]} rotation={[0, guard.rot, 0]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.55, 2.0, 8]} />
            <meshStandardMaterial color={cityTheme.guardCloth} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.2, 0.25]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.15]} />
            <meshStandardMaterial color={cityTheme.guardArmor} roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <sphereGeometry args={[0.36, 10, 10]} />
            <meshStandardMaterial color={cityTheme.guardArmor} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.5, 2.2, 0.2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 4.4, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0.5, 4.5, 0.2]} castShadow>
            <coneGeometry args={[0.12, 0.6, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {npcs.map((npc) => (
        <AutonomousNPC
          key={npc.id}
          npc={npc}
          playerPosRef={playerPos}
          nearestNpcIdRef={nearestNpcIdRef}
          isBlockedByModal={isModalActive}
          onInteract={handleNPCInteraction}
          onUpdatePos={handleUpdateNpcPos}
        />
      ))}

      <CityInteractionPrompts
        nearestNpcIdRef={nearestNpcIdRef}
        nearestHouseIdRef={nearestHouseIdRef}
        liveNpcPositions={liveNpcPositions}
        npcs={npcs}
        houses={houses}
        isModalActive={isModalActive}
        onInteractNpc={handleNPCInteraction}
        onEnterHouse={handleHouseInteraction}
      />

      <group ref={playerRef} position={[playerPos.current.x, 0, playerPos.current.z]}>
        <DetailedPlayerAvatar isWalkingRef={isPlayerWalkingRef} isPaused={isModalActive} />
        {!isMobile && (
          <pointLight
            position={[0, 2.5, 0]}
            intensity={timeOfDay === 2 ? 24 : 0}
            distance={12}
            color="#38bdf8"
          />
        )}
      </group>
    </>
  );
}
