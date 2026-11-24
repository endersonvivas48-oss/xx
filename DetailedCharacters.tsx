import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';

const tempNpcWorldPos = new THREE.Vector3();

interface DetailedNPCProps {
  id: string;
  name: string;
  title: string;
  role: 'MERCHANT' | 'BLACKSMITH' | 'CHALLENGER' | 'CITIZEN' | 'TAVERN_KEEPER';
  color: string;
  position: [number, number, number];
  isNear?: boolean;
  isNearRef?: React.MutableRefObject<boolean>;
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isPaused?: boolean;
  castShadow?: boolean;
  onInteract?: () => void;
}

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA TODOS LOS NPCs
// ========================================================
const sharedNpcGeos = {
  leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.08, 0.42, 6, 12)),
  boot: markGeometryAsShared(new THREE.CapsuleGeometry(0.07, 0.16, 4, 8)),
  torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.24, 0.44, 8, 16)),
  arm: markGeometryAsShared(new THREE.CapsuleGeometry(0.075, 0.38, 6, 12)),
  head: markGeometryAsShared(new THREE.SphereGeometry(0.22, 20, 20)),
  hair: markGeometryAsShared(new THREE.SphereGeometry(0.23, 16, 16)),
  nearRing: markGeometryAsShared(new THREE.RingGeometry(0.7, 0.85, 32)),
};

const sharedNpcFixedMats = {
  pants: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 })),
  boots: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 })),
  skin: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.75 })),
  hair: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#332115', roughness: 0.9 })),
  nearRing: markMaterialAsShared(
    new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  ),
};

const npcTorsoMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const npcArmMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getNpcTorsoMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcTorsoMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.25 })
    );
    npcTorsoMaterialCache.set(color, mat);
  }
  return mat;
}

function getNpcArmMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = npcArmMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    npcArmMaterialCache.set(color, mat);
  }
  return mat;
}

/**
 * NPC Orgánico y estilizado para interiores y calles
 * Optimizado con geometrías compartidas y materiales cacheados por color.
 */
export function DetailedNPC({
  color,
  position,
  isNear = false,
  isNearRef,
  isWalking = false,
  isWalkingRef,
  isPaused = false,
  castShadow = false,
}: DetailedNPCProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const nearRingRef = useRef<THREE.Mesh>(null);
  const walkCycle = useRef(0);
  const animAccumRef = useRef(Math.random() * 0.05);
  const isMobile = isMobileOptimizationTarget();

  const torsoMat = getNpcTorsoMaterial(color);
  const armMat = getNpcArmMaterial(color);

  useFrame((state, delta) => {
    const activeIsNear = isNearRef ? isNearRef.current : isNear;
    if (nearRingRef.current) {
      nearRingRef.current.visible = activeIsNear && !isPaused;
    }

    if (isPaused || !rootRef.current) return;

    // Culling por radio de cámara y limitación a 15–20 Hz para NPCs lejanos
    rootRef.current.getWorldPosition(tempNpcWorldPos);
    const camDx = state.camera.position.x - tempNpcWorldPos.x;
    const camDz = state.camera.position.z - tempNpcWorldPos.z;
    const camDistSq = camDx * camDx + camDz * camDz;

    const maxAnimRadiusSq = isMobile ? 55 * 55 : 78 * 78;
    if (camDistSq > maxAnimRadiusSq) {
      return;
    }

    const farAnimDistSq = isMobile ? 22 * 22 : 30 * 30;
    let effectiveDelta = delta;
    if (camDistSq > farAnimDistSq) {
      animAccumRef.current += delta;
      const farStep = isMobile ? 1 / 16 : 1 / 20;
      if (animAccumRef.current < farStep) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else if (isMobile) {
      animAccumRef.current += delta;
      if (animAccumRef.current < 1 / 30) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else {
      animAccumRef.current = 0;
    }

    const t = state.clock.getElapsedTime();
    const clampedDelta = Math.min(effectiveDelta, 0.1);

    const walkSmooth = 1 - Math.exp(-18 * clampedDelta);
    const idleFastSmooth = 1 - Math.exp(-10 * clampedDelta);
    const idleSmooth = 1 - Math.exp(-7.7 * clampedDelta);
    const activeIsWalking = isWalkingRef ? isWalkingRef.current : isWalking;

    if (activeIsWalking) {
      walkCycle.current += clampedDelta * 7.5;
      const cycle = walkCycle.current;
      const legAngle = Math.sin(cycle) * 0.55;
      const armAngle = -Math.sin(cycle) * 0.45;

      if (leftLeg.current) {
        leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, legAngle, walkSmooth);
      }
      if (rightLeg.current) {
        rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -legAngle, walkSmooth);
      }
      if (leftArm.current) {
        leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, armAngle, walkSmooth);
        leftArm.current.rotation.z = 0.08 + Math.sin(cycle) * 0.03;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -armAngle, walkSmooth);
        rightArm.current.rotation.z = -0.08 - Math.sin(cycle) * 0.03;
      }

      if (rootRef.current) {
        rootRef.current.position.y = Math.abs(Math.sin(cycle)) * 0.06;
        rootRef.current.rotation.z = Math.sin(cycle) * 0.025;
        rootRef.current.rotation.x = 0.04;
      }
    } else {
      walkCycle.current = 0;
      // Offset único según posición para que los NPCs no respiren sincronizados
      const seed = Math.sin(position[0] * 12.9898 + position[2] * 78.233) * 43758.5453;
      const offset = Math.abs(seed % 10);
      const timeWithOffset = t + offset;

      // ANIMACIÓN IDLE VIVA: respiración suave, bamboleo y micro-gestos
      const breatheCycle = timeWithOffset * 1.8;
      const swayCycle = timeWithOffset * 0.9;

      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, idleFastSmooth);
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, idleFastSmooth);

      if (leftArm.current) {
        const targetX = Math.sin(breatheCycle) * 0.08;
        leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, targetX, idleSmooth);
        leftArm.current.rotation.z = 0.05 + Math.sin(swayCycle) * 0.03;
      }
      if (rightArm.current) {
        const targetX = -Math.sin(breatheCycle) * 0.08;
        rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, targetX, idleSmooth);
        rightArm.current.rotation.z = -0.05 - Math.sin(swayCycle) * 0.03;
      }

      if (rootRef.current) {
        const targetY = (activeIsNear ? Math.sin(t * 3.5) * 0.03 : 0) + Math.sin(breatheCycle) * 0.02;
        rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, targetY, idleSmooth);
        rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, Math.sin(swayCycle) * 0.015, idleSmooth);
        rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, 0, idleFastSmooth);
      }
    }
  });

  return (
    <group ref={rootRef} position={position} scale={[1.35, 1.35, 1.35]}>
      {/* Piernas orgánicas redondeadas (geometrías y materiales compartidos) */}
      <group ref={leftLeg} position={[-0.2, 0.72, 0]}>
        <mesh geometry={sharedNpcGeos.leg} material={sharedNpcFixedMats.pants} position={[0, -0.32, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.boot} material={sharedNpcFixedMats.boots} position={[0, -0.62, 0.04]} castShadow={castShadow} />
      </group>

      <group ref={rightLeg} position={[0.2, 0.72, 0]}>
        <mesh geometry={sharedNpcGeos.leg} material={sharedNpcFixedMats.pants} position={[0, -0.32, 0]} castShadow={castShadow} />
        <mesh geometry={sharedNpcGeos.boot} material={sharedNpcFixedMats.boots} position={[0, -0.62, 0.04]} castShadow={castShadow} />
      </group>

      {/* Torso con silueta de túnica/armadura curva */}
      <mesh geometry={sharedNpcGeos.torso} material={torsoMat} position={[0, 1.16, 0]} castShadow={castShadow} />

      {/* Brazos curvos */}
      <group ref={leftArm} position={[-0.38, 1.34, 0]}>
        <mesh geometry={sharedNpcGeos.arm} material={armMat} position={[0, -0.3, 0]} castShadow={castShadow} />
      </group>

      <group ref={rightArm} position={[0.38, 1.34, 0]}>
        <mesh geometry={sharedNpcGeos.arm} material={armMat} position={[0, -0.3, 0]} castShadow={castShadow} />
      </group>

      {/* Cabeza suave y rostro */}
      <mesh geometry={sharedNpcGeos.head} material={sharedNpcFixedMats.skin} position={[0, 1.72, 0]} castShadow={castShadow} />
      {/* Cabello/Gorro curvo */}
      <mesh geometry={sharedNpcGeos.hair} material={sharedNpcFixedMats.hair} position={[0, 1.82, -0.04]} castShadow={castShadow} />

      {/* Anillo de interacción sutil bajo los pies controlado por ref */}
      <mesh
        ref={nearRingRef}
        visible={Boolean(isNearRef ? isNearRef.current : isNear)}
        geometry={sharedNpcGeos.nearRing}
        material={sharedNpcFixedMats.nearRing}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      />
    </group>
  );
}

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA EL AVATAR DEL JUGADOR
// ========================================================
const sharedPlayerGeos = {
  thigh: markGeometryAsShared(new THREE.CapsuleGeometry(0.13, 0.32, 8, 16)),
  knee: markGeometryAsShared(new THREE.SphereGeometry(0.11, 14, 14)),
  boot: markGeometryAsShared(new THREE.CapsuleGeometry(0.11, 0.28, 8, 14)),
  bootToe: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.16, 8, 12)),
  belt: markGeometryAsShared(new THREE.TorusGeometry(0.34, 0.07, 12, 28)),
  buckle: markGeometryAsShared(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16)),
  smallSphere: markGeometryAsShared(new THREE.SphereGeometry(0.06, 12, 12)),
  pouch: markGeometryAsShared(new THREE.SphereGeometry(0.12, 14, 14)),
  hipOrb: markGeometryAsShared(new THREE.SphereGeometry(0.09, 16, 16)),
  abdomen: markGeometryAsShared(new THREE.CapsuleGeometry(0.27, 0.28, 10, 20)),
  chest: markGeometryAsShared(new THREE.CapsuleGeometry(0.31, 0.32, 10, 22)),
  pec: markGeometryAsShared(new THREE.SphereGeometry(0.16, 14, 14)),
  chestTrim: markGeometryAsShared(new THREE.CapsuleGeometry(0.035, 0.26, 8, 16)),
  pauldronOuter: markGeometryAsShared(new THREE.SphereGeometry(0.21, 16, 16)),
  pauldronInner: markGeometryAsShared(new THREE.SphereGeometry(0.19, 14, 14)),
  upperArm: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.28, 8, 16)),
  elbow: markGeometryAsShared(new THREE.SphereGeometry(0.085, 12, 12)),
  forearm: markGeometryAsShared(new THREE.CapsuleGeometry(0.095, 0.22, 8, 16)),
  hand: markGeometryAsShared(new THREE.SphereGeometry(0.09, 12, 12)),
  neck: markGeometryAsShared(new THREE.CylinderGeometry(0.11, 0.14, 0.16, 14)),
  head: markGeometryAsShared(new THREE.SphereGeometry(0.26, 22, 22)),
  hairCap: markGeometryAsShared(new THREE.SphereGeometry(0.28, 18, 18)),
  hairStrand: markGeometryAsShared(new THREE.CapsuleGeometry(0.06, 0.2, 6, 12)),
  crownRing: markGeometryAsShared(new THREE.TorusGeometry(0.25, 0.038, 10, 26)),
  crownSpike: markGeometryAsShared(new THREE.ConeGeometry(0.045, 0.12, 10)),
  crownGem: markGeometryAsShared(new THREE.SphereGeometry(0.07, 14, 14)),
  swordGrip: markGeometryAsShared(new THREE.CylinderGeometry(0.03, 0.035, 0.26, 12)),
  swordGuard: markGeometryAsShared(new THREE.CapsuleGeometry(0.045, 0.28, 8, 16)),
  swordScabbard: markGeometryAsShared(new THREE.CapsuleGeometry(0.075, 1.05, 8, 16)),
  swordRune: markGeometryAsShared(new THREE.CapsuleGeometry(0.02, 0.75, 4, 8)),
  capeTopCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.11, 0.5, 8, 16)),
  capeTopSide: markGeometryAsShared(new THREE.CapsuleGeometry(0.08, 0.46, 6, 12)),
  capeMidCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.13, 0.52, 8, 16)),
  capeMidSide: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.48, 6, 12)),
  capeTailCenter: markGeometryAsShared(new THREE.CapsuleGeometry(0.14, 0.42, 8, 16)),
  capeTailTrim: markGeometryAsShared(new THREE.CapsuleGeometry(0.04, 0.68, 6, 12)),
};

const sharedPlayerMats = {
  thigh: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.6 })),
  goldTrim92: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.92, roughness: 0.2 })),
  goldTrim95: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.18 })),
  goldTrim95r2: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.2 })),
  goldCrown: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.96, roughness: 0.16 })),
  goldCapeTrim: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.85, roughness: 0.25 })),
  bootLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.65, metalness: 0.3 })),
  steelToe: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.85, roughness: 0.25 })),
  beltLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#2d1606', roughness: 0.7 })),
  sapphireGem: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 1.2, roughness: 0.1 })
  ),
  pouchLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.85 })),
  hipOrb: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.5, roughness: 0.1 })
  ),
  abdomenBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.35, metalness: 0.6 })),
  chestBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.25, metalness: 0.75 })),
  pecBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.3, metalness: 0.7 })),
  pauldronSilver: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.18 })),
  upperArmBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 })),
  forearmSteel: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 })),
  handDark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.4 })),
  skinNeck: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.8 })),
  skinHead: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.7 })),
  hairBrown: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3b1e08', roughness: 0.85 })),
  swordGripLeather: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.8 })),
  scabbardBlue: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0c4a6e', roughness: 0.5 })),
  swordRuneGlow: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.6 })
  ),
  capeTop: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.8 })),
  capeMid: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.82 })),
  capeDeep: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#075985', roughness: 0.85 })),
  capeTail: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#075985', roughness: 0.86 })),
};

const CROWN_SPIKE_ANGLES = [0, 0.8, -0.8, 1.6, -1.6];

/**
 * AVATAR ESCULPIDO ORGÁNICO DEL HÉROE PRINCIPAL (Rey Celeste / Invocador Gladiador)
 * Optimizado con geometrías y materiales compartidos a nivel de módulo.
 */
export function DetailedPlayerAvatar({
  isWalking = false,
  isWalkingRef,
  isPaused = false,
  castShadow = false,
}: {
  isWalking?: boolean;
  isWalkingRef?: React.MutableRefObject<boolean>;
  isPaused?: boolean;
  castShadow?: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const capeTopRef = useRef<THREE.Group>(null);
  const capeMidRef = useRef<THREE.Group>(null);
  const capeTailRef = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Group>(null);
  const walkCycle = useRef(0);
  const animAccumRef = useRef(0);
  const isMobile = isMobileOptimizationTarget();

  useFrame((state, delta) => {
    if (isPaused) return;
    const activeIsWalking = isWalkingRef ? isWalkingRef.current : isWalking;

    let effectiveDelta = delta;
    if (isMobile) {
      animAccumRef.current += delta;
      if (animAccumRef.current < 1 / 30) return;
      effectiveDelta = animAccumRef.current;
      animAccumRef.current = 0;
    } else {
      animAccumRef.current = 0;
    }

    const t = state.clock.getElapsedTime();
    const clampedDelta = Math.min(effectiveDelta, 0.1);

    if (activeIsWalking) {
      walkCycle.current += clampedDelta * 11.5;
      const cycle = walkCycle.current;
      const legAngle = Math.sin(cycle) * 0.62;
      const armAngle = -Math.sin(cycle) * 0.54;

      if (leftLegRef.current) leftLegRef.current.rotation.x = legAngle;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legAngle;

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = armAngle;
        leftArmRef.current.rotation.z = 0.12 + Math.sin(cycle) * 0.04;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -armAngle;
        rightArmRef.current.rotation.z = -0.12 - Math.sin(cycle) * 0.04;
      }

      if (rootRef.current) {
        rootRef.current.position.y = Math.abs(Math.sin(cycle)) * 0.08;
        rootRef.current.rotation.z = Math.sin(cycle) * 0.035;
        rootRef.current.rotation.x = 0.06;
      }

      const capeWave = Math.sin(cycle * 1.4);
      if (capeTopRef.current) capeTopRef.current.rotation.x = 0.35 + capeWave * 0.18;
      if (capeMidRef.current) capeMidRef.current.rotation.x = 0.45 + Math.sin(cycle * 1.4 - 0.4) * 0.22;
      if (capeTailRef.current) capeTailRef.current.rotation.x = 0.55 + Math.sin(cycle * 1.4 - 0.8) * 0.26;

      if (swordRef.current) swordRef.current.rotation.z = 0.45 + Math.sin(cycle) * 0.02;
    } else {
      walkCycle.current = 0;
      const idle = t;
      const legSmooth = 1 - Math.exp(-7.7 * clampedDelta);
      const idleSmooth = 1 - Math.exp(-6.3 * clampedDelta);

      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, legSmooth);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, legSmooth);

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(idle * 1.6) * 0.05, idleSmooth);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.1, idleSmooth);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -Math.sin(idle * 1.6) * 0.05, idleSmooth);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.1, idleSmooth);
      }

      if (rootRef.current) {
        rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, Math.sin(idle * 2.2) * 0.015, idleSmooth);
        rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, 0, idleSmooth);
        rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, 0, idleSmooth);
      }

      if (capeTopRef.current) capeTopRef.current.rotation.x = THREE.MathUtils.lerp(capeTopRef.current.rotation.x, 0.12 + Math.sin(idle * 2.2) * 0.03, idleSmooth);
      if (capeMidRef.current) capeMidRef.current.rotation.x = THREE.MathUtils.lerp(capeMidRef.current.rotation.x, 0.14 + Math.sin(idle * 2.2 - 0.3) * 0.04, idleSmooth);
      if (capeTailRef.current) capeTailRef.current.rotation.x = THREE.MathUtils.lerp(capeTailRef.current.rotation.x, 0.16 + Math.sin(idle * 2.2 - 0.6) * 0.05, idleSmooth);

      if (swordRef.current) swordRef.current.rotation.z = THREE.MathUtils.lerp(swordRef.current.rotation.z, 0.45, idleSmooth);
    }
  });

  return (
    <group ref={rootRef} scale={[1.35, 1.35, 1.35]}>
      {/* 1. PIERNAS ANATÓMICAS ESCULPIDAS */}
      <group ref={leftLegRef} position={[-0.24, 0.88, 0]}>
        <mesh geometry={sharedPlayerGeos.thigh} material={sharedPlayerMats.thigh} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.knee} material={sharedPlayerMats.goldTrim92} position={[0, -0.42, 0.11]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.boot} material={sharedPlayerMats.bootLeather} position={[0, -0.62, 0.02]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.bootToe}
          material={sharedPlayerMats.steelToe}
          position={[0, -0.78, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
      </group>

      <group ref={rightLegRef} position={[0.24, 0.88, 0]}>
        <mesh geometry={sharedPlayerGeos.thigh} material={sharedPlayerMats.thigh} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.knee} material={sharedPlayerMats.goldTrim92} position={[0, -0.42, 0.11]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.boot} material={sharedPlayerMats.bootLeather} position={[0, -0.62, 0.02]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.bootToe}
          material={sharedPlayerMats.steelToe}
          position={[0, -0.78, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
      </group>

      {/* 2. CINTURÓN CURVO DE CUERO Y ACCESORIOS MÍSTICOS */}
      <mesh
        geometry={sharedPlayerGeos.belt}
        material={sharedPlayerMats.beltLeather}
        position={[0, 0.94, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow={castShadow}
      />
      <mesh geometry={sharedPlayerGeos.buckle} material={sharedPlayerMats.goldTrim95} position={[0, 0.94, 0.36]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.smallSphere} material={sharedPlayerMats.sapphireGem} position={[0, 0.94, 0.4]} castShadow={castShadow} />

      <mesh
        geometry={sharedPlayerGeos.pouch}
        material={sharedPlayerMats.pouchLeather}
        position={[0.36, 0.88, 0.14]}
        rotation={[0.2, 0, -0.3]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.hipOrb}
        material={sharedPlayerMats.hipOrb}
        position={[-0.36, 0.88, 0.12]}
        castShadow={castShadow}
      />

      {/* 3. CORAZA REAL CURVA */}
      <mesh geometry={sharedPlayerGeos.abdomen} material={sharedPlayerMats.abdomenBlue} position={[0, 1.18, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.chest} material={sharedPlayerMats.chestBlue} position={[0, 1.46, 0.04]} castShadow={castShadow} />
      <mesh
        geometry={sharedPlayerGeos.pec}
        material={sharedPlayerMats.pecBlue}
        position={[-0.11, 1.5, 0.24]}
        rotation={[0.2, -0.1, 0]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.pec}
        material={sharedPlayerMats.pecBlue}
        position={[0.11, 1.5, 0.24]}
        rotation={[0.2, 0.1, 0]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.chestTrim}
        material={sharedPlayerMats.goldTrim95}
        position={[0, 1.44, 0.28]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow={castShadow}
      />

      {/* 4. HOMBRERAS DE PLACAS CURVAS */}
      <group position={[-0.46, 1.68, 0]}>
        <mesh geometry={sharedPlayerGeos.pauldronOuter} material={sharedPlayerMats.pauldronSilver} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.pauldronInner}
          material={sharedPlayerMats.goldTrim95r2}
          position={[-0.03, -0.06, 0]}
          castShadow={castShadow}
        />
      </group>
      <group position={[0.46, 1.68, 0]}>
        <mesh geometry={sharedPlayerGeos.pauldronOuter} material={sharedPlayerMats.pauldronSilver} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.pauldronInner}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0.03, -0.06, 0]}
          castShadow={castShadow}
        />
      </group>

      {/* 5. BRAZOS ANATÓMICOS Y GUANTELETES CURVOS */}
      <group ref={leftArmRef} position={[-0.46, 1.6, 0]}>
        <mesh geometry={sharedPlayerGeos.upperArm} material={sharedPlayerMats.upperArmBlue} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.elbow} material={sharedPlayerMats.forearmSteel} position={[0, -0.38, 0.05]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.forearm} material={sharedPlayerMats.forearmSteel} position={[0, -0.52, 0.02]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.hand} material={sharedPlayerMats.handDark} position={[0, -0.7, 0.06]} castShadow={castShadow} />
      </group>

      <group ref={rightArmRef} position={[0.46, 1.6, 0]}>
        <mesh geometry={sharedPlayerGeos.upperArm} material={sharedPlayerMats.upperArmBlue} position={[0, -0.22, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.elbow} material={sharedPlayerMats.forearmSteel} position={[0, -0.38, 0.05]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.forearm} material={sharedPlayerMats.forearmSteel} position={[0, -0.52, 0.02]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.hand} material={sharedPlayerMats.handDark} position={[0, -0.7, 0.06]} castShadow={castShadow} />
      </group>

      {/* 6. CABEZA ESCULPIDA, ROSTRO, CORONA Y ZAFIRO RADIANTE */}
      <mesh geometry={sharedPlayerGeos.neck} material={sharedPlayerMats.skinNeck} position={[0, 1.76, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.head} material={sharedPlayerMats.skinHead} position={[0, 2.02, 0]} castShadow={castShadow} />
      <mesh geometry={sharedPlayerGeos.hairCap} material={sharedPlayerMats.hairBrown} position={[0, 2.12, -0.06]} castShadow={castShadow} />
      <mesh
        geometry={sharedPlayerGeos.hairStrand}
        material={sharedPlayerMats.hairBrown}
        position={[-0.2, 2.04, 0.08]}
        rotation={[0.3, 0, -0.2]}
        castShadow={castShadow}
      />
      <mesh
        geometry={sharedPlayerGeos.hairStrand}
        material={sharedPlayerMats.hairBrown}
        position={[0.2, 2.04, 0.08]}
        rotation={[0.3, 0, 0.2]}
        castShadow={castShadow}
      />

      {/* Corona Imperial Dorada Esculpida */}
      <group position={[0, 2.18, 0]}>
        <mesh
          geometry={sharedPlayerGeos.crownRing}
          material={sharedPlayerMats.goldCrown}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow={castShadow}
        />
        {CROWN_SPIKE_ANGLES.map((ang, i) => (
          <mesh
            key={i}
            geometry={sharedPlayerGeos.crownSpike}
            material={sharedPlayerMats.goldCrown}
            position={[Math.sin(ang) * 0.25, 0.06, Math.cos(ang) * 0.25]}
            rotation={[0, ang, 0]}
            castShadow={castShadow}
          />
        ))}
        <mesh
          geometry={sharedPlayerGeos.crownGem}
          material={sharedPlayerMats.sapphireGem}
          position={[0, 0.01, 0.26]}
          castShadow={castShadow}
        />
      </group>

      {/* 7. MANDOBLE RÚNICO CELESTIAL CURVADO A LA ESPALDA */}
      <group ref={swordRef} position={[0.12, 1.48, -0.28]} rotation={[0.08, 0.06, 0.45]}>
        <mesh geometry={sharedPlayerGeos.smallSphere} material={sharedPlayerMats.goldTrim95r2} position={[0, 0.74, 0]} castShadow={castShadow} />
        <mesh geometry={sharedPlayerGeos.swordGrip} material={sharedPlayerMats.swordGripLeather} position={[0, 0.58, 0]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.swordGuard}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0, 0.44, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.swordScabbard}
          material={sharedPlayerMats.scabbardBlue}
          position={[0, -0.16, 0]}
          castShadow={castShadow}
        />
        <mesh geometry={sharedPlayerGeos.swordRune} material={sharedPlayerMats.swordRuneGlow} position={[0, -0.16, 0.07]} />
      </group>

      {/* 8. CAPA DE TELA DINÁMICA ORGÁNICA */}
      <group ref={capeTopRef} position={[0, 1.68, -0.22]}>
        <mesh
          geometry={sharedPlayerGeos.smallSphere}
          material={sharedPlayerMats.goldTrim95r2}
          position={[-0.28, 0, 0.05]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.smallSphere}
          material={sharedPlayerMats.goldTrim95r2}
          position={[0.28, 0, 0.05]}
          castShadow={castShadow}
        />
        <mesh geometry={sharedPlayerGeos.capeTopCenter} material={sharedPlayerMats.capeTop} position={[0, -0.26, 0]} castShadow={castShadow} />
        <mesh
          geometry={sharedPlayerGeos.capeTopSide}
          material={sharedPlayerMats.capeMid}
          position={[-0.24, -0.26, -0.01]}
          rotation={[0, 0.15, -0.05]}
          castShadow={castShadow}
        />
        <mesh
          geometry={sharedPlayerGeos.capeTopSide}
          material={sharedPlayerMats.capeMid}
          position={[0.24, -0.26, -0.01]}
          rotation={[0, -0.15, 0.05]}
          castShadow={castShadow}
        />

        <group ref={capeMidRef} position={[0, -0.48, 0]}>
          <mesh geometry={sharedPlayerGeos.capeMidCenter} material={sharedPlayerMats.capeMid} position={[0, -0.26, 0]} castShadow={castShadow} />
          <mesh
            geometry={sharedPlayerGeos.capeMidSide}
            material={sharedPlayerMats.capeDeep}
            position={[-0.28, -0.26, 0]}
            rotation={[0, 0.2, -0.08]}
            castShadow={castShadow}
          />
          <mesh
            geometry={sharedPlayerGeos.capeMidSide}
            material={sharedPlayerMats.capeDeep}
            position={[0.28, -0.26, 0]}
            rotation={[0, -0.2, 0.08]}
            castShadow={castShadow}
          />

          <group ref={capeTailRef} position={[0, -0.5, 0]}>
            <mesh geometry={sharedPlayerGeos.capeTailCenter} material={sharedPlayerMats.capeTail} position={[0, -0.2, 0]} castShadow={castShadow} />
            <mesh
              geometry={sharedPlayerGeos.capeTailTrim}
              material={sharedPlayerMats.goldCapeTrim}
              position={[0, -0.4, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow={castShadow}
            />
          </group>
        </group>
      </group>
    </group>
  );
}
